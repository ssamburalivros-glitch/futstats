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
            
            # --- NOVA LÓGICA DE CAPTURA POR ABREVIAÇÃO ---
            # A ESPN as vezes muda o 'name', mas a 'abbreviation' é mais estável
            s = {}
            for item in stats_list:
                abbr = item.get('abbreviation')
                val = item.get('value')
                if abbr:
                    s[abbr.upper()] = val

            # Mapeamento via Abreviação (Padrão ESPN)
            v = int(s.get('W', 0))   # Wins
            e = int(s.get('D', 0))   # Draws
            d = int(s.get('L', 0))   # Losses
            gp = int(s.get('F', 0))  # Goals For (F de 'Forward' ou 'For')
            gc = int(s.get('A', 0))  # Goals Against (A de 'Against')
            sg = int(s.get('GD', 0)) # Goal Difference
            pts = int(s.get('P', 0)) # Points
            jogos = int(s.get('GP', 0)) # Games Played
            pos = int(s.get('R', 0)) # Rank

            # Se a abreviação falhar, tentamos o cálculo manual do saldo
            if sg == 0 and gp != 0:
                sg = gp - gc

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

            # Upsert
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ {liga_id} processada.")

    except Exception as err:
        print(f"❌ Erro em {liga_id}: {err}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1)
