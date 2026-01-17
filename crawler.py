import os
import time
import requests
from supabase import create_client

# Configurações de Ambiente
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1",
    "FR": "fra.1", "SA": "sau.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"📡 Buscando dados: {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=20).json()
        
        # Ajuste para a estrutura da França e outras ligas
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Criamos um mapa com nomes em minúsculo para não errar
            s = {str(item.get('name')).lower(): item.get('value') for item in stats_list}
            
            # CAPTURA DE DADOS (Gols e Vitórias)
            # A ESPN usa 'goalsfor' em umas e 'pointsfor' em outras (França)
            gp = int(s.get('goalsfor') or s.get('pointsfor') or s.get('allgoalsfor') or 0)
            gc = int(s.get('goalsagainst') or s.get('pointsagainst') or s.get('allgoalsagainst') or 0)
            
            vitorias = int(s.get('wins') or s.get('victories') or 0)
            empates = int(s.get('ties') or s.get('draws') or 0)
            derrotas = int(s.get('losses') or 0)
            
            jogos = int(s.get('gamesplayed') or 0)
            pts = int(s.get('points') or 0)
            pos = int(s.get('rank') or 0)
            # Se o saldo (sg) não vier, o Python calcula
            sg = int(s.get('pointdifferential') or s.get('goaldifference') or (gp - gc))

            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": pos,
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": jogos,
                "vitorias": vitorias,
                "empates": empates,
                "derrotas": derrotas,
                "gols_pro": gp,
                "gols_contra": gc,
                "sg": sg,
                "pontos": pts
            }

            # Envia para o Supabase
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ {liga_id} sincronizada com Gols!")

    except Exception as e:
        print(f"❌ Erro na liga {liga_id}: {e}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1)
