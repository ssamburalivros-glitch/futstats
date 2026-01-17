import os
import time
import requests
from supabase import create_client

# --- 1. CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = None

try:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ ERRO: Variáveis de ambiente não configuradas!")
    else:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("🚀 Conexão com Supabase estabelecida.")
except Exception as e:
    print(f"❌ Falha ao conectar: {e}")

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1",
    "FR": "fra.1", "NL": "ned.1", "SA": "sau.1"
}

# --- 2. FUNÇÃO DE CAPTURA ---
def capturar_liga(liga_id, espn_id):
    global supabase
    if supabase is None: return

    print(f"📡 Atualizando {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=15).json()
        
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            # Mapeia os nomes das estatísticas da ESPN para valores
            s = {item.get('name'): item.get('value') for item in stats_list}
            
            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": int(s.get('rank') or 0),
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": int(s.get('gamesPlayed') or 0),
                "vitorias": int(s.get('wins') or 0),
                "empates": int(s.get('ties') or 0),
                "derrotas": int(s.get('losses') or 0),
                "gols_pro": int(s.get('pointsFor') or 0),       # GP
                "gols_contra": int(s.get('pointsAgainst') or 0), # GC
                "sg": int(s.get('pointDifferential') or 0),
                "pontos": int(s.get('points') or 0)
            }

            if dados["escudo"] and dados["escudo"].startswith("http:"):
                dados["escudo"] = dados["escudo"].replace("http:", "https:")

            # UPSERT para evitar duplicados
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ {liga_id} sincronizada.")
        
    except Exception as e:
        print(f"❌ Erro em {liga_id}: {e}")

if __name__ == "__main__":
    if supabase:
        for liga, code in LIGAS.items():
            capturar_liga(liga, code)
            time.sleep(2)
