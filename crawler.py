import os
import time
import requests
from supabase import create_client

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

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Criamos um dicionário com nomes em minúsculo para facilitar a busca
            s = {str(item.get('name')).lower(): item.get('value') for item in stats_list}
            
            # MAPEAMENTO CORRIGIDO (A ESPN usa nomes variados)
            v = int(s.get('wins') or s.get('victories') or 0)
            e = int(s.get('ties') or s.get('draws') or 0)
            d = int(s.get('losses') or 0)
            
            # Gols Pro: tenta 'goalsfor' ou 'pointsfor'
            gp = int(s.get('goalsfor') or s.get('pointsfor') or 0)
            # Gols Contra: tenta 'goalsagainst' ou 'pointsagainst'
            gc = int(s.get('goalsagainst') or s.get('pointsagainst') or 0)
            
            pts = int(s.get('points') or 0)
            jogos = int(s.get('gamesplayed') or 0)
            pos = int(s.get('rank') or 0)
            sg = int(s.get('pointdifferential') or s.get('goaldifference') or (gp - gc))

            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": pos,
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": jogos,
                "vitorias": v,
                "empates": e,
                "derrotas": d,
                "gols_pro": gp,
                "gols_contra": gc,
                "sg": sg,
                "pontos": pts
            }

            # Upsert no Supabase
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ {liga_id} atualizada com sucesso.")

    except Exception as err:
        print(f"❌ Erro na liga {liga_id}: {err}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1)
