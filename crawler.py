import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL") or "https://sihunefyfkecumbiyxva.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or "SUA_KEY_AQUI"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1",
    "FR": "fra.1", "SA": "sau.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"📡 Verificando Liga: {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=20).json()
        entries = []
        
        # Tenta localizar a lista de times nos dois formatos da API
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"⚠️ {liga_id}: Sem dados na API no momento.")
            return

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Cria um dicionário com nomes em MINÚSCULO para busca fácil
            s = {item.get('name').lower(): item.get('value') for item in stats_list}
            
            # --- SCANNER DE GOLS PRO (GP) ---
            gp = (s.get('pointsfor') or 
                  s.get('goalsfor') or 
                  s.get('scorefor') or 
                  s.get('for') or 0)
            
            # --- SCANNER DE GOLS CONTRA (GC) ---
            gc = (s.get('pointsagainst') or 
                  s.get('goalsagainst') or 
                  s.get('scoreagainst') or 
                  s.get('against') or 0)
            
            # --- SCANNER DE SALDO (SG) ---
            sg = (s.get('pointdifferential') or 
                  s.get('goaldifference') or 
                  s.get('difference') or (int(gp) - int(gc)))

            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": int(s.get('rank') or 0),
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": int(s.get('gamesplayed') or 0),
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

        print(f"✅ {liga_id} sincronizada. Exemplo GP: {gp}")

    except Exception as e:
        print(f"❌ Erro em {liga_id}: {e}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1)
