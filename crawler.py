import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1",
    "FR": "fra.1", "SA": "sau.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"📡 Sincronizando: {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=20).json()
        
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"⚠️ Sem dados para {liga_id}")
            return

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Mapeia estatísticas para busca fácil
            s = {item.get('name'): item.get('value') for item in stats_list}
            
            # Captura de Gols (GP e GC)
            gp = s.get('pointsFor') or s.get('goalsFor') or 0
            gc = s.get('pointsAgainst') or s.get('goalsAgainst') or 0
            sg = s.get('pointDifferential') or s.get('goalDifference') or 0
            
            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": int(s.get('rank') or 0),
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": int(s.get('gamesPlayed') or 0),
                "vitorias": int(s.get('wins') or 0),
                "empates": int(s.get('ties') or 0),
                "derrotas": int(s.get('losses') or 0),
                "gols_pro": int(gp),
                "gols_contra": int(gc),
                "sg": int(sg),
                "pontos": int(s.get('points') or 0)
            }

            # Envio para o Supabase
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ {liga_id} atualizada.")

    except Exception as e:
        print(f"❌ Erro na liga {liga_id}: {e}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1)
