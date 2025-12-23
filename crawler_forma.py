import os
import requests
import re
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1"
}

def capturar_forma_ligas():
    dados_totais = []

    for liga_id, espn_slug in LIGAS.items():
        print(f"📡 Processando {liga_id}...")
        
        # 1. Pegar a tabela (Standings)
        url_tab = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_slug}/standings"
        # 2. Pegar os jogos recentes (Scoreboard) - Buscamos os últimos 30 dias para garantir 5 jogos
        url_jogos = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_slug}/scoreboard?limit=100"

        try:
            res_tab = requests.get(url_tab, headers=HEADERS).json()
            res_jogos = requests.get(url_jogos, headers=HEADERS).json()
            
            entries = res_tab.get('children', [{}])[0].get('standings', {}).get('entries', [])
            eventos = res_jogos.get('events', [])

            # Criar um dicionário para armazenar a forma de cada time
            formas_map = {}

            for entry in entries:
                team_id = str(entry['team']['id'])
                historico = []
                
                # Procurar nos eventos os jogos finalizados deste time
                # Varremos do mais novo para o mais antigo
                for ev in eventos:
                    if len(historico) >= 5: break
                    
                    status = ev.get('status', {}).get('type', {}).get('description', '')
                    if status == "Final":
                        comp = ev.get('competitions', [{}])[0]
                        teams = comp.get('competitors', [])
                        
                        meu_time = next((t for t in teams if str(t['id']) == team_id), None)
                        if meu_time:
                            if meu_time.get('winner') is True:
                                historico.append('V')
                            elif meu_time.get('winner') is False:
                                outro = next((t for t in teams if str(t['id']) != team_id), None)
                                if outro and outro.get('winner') is True:
                                    historico.append('D')
                                else:
                                    historico.append('E')
                
                # Inverter para ficar cronológico e preencher se faltar
                resultado_final = "".join(reversed(historico))
                if not resultado_final: resultado_final = "EEEEE"
                formas_map[team_id] = resultado_final

            # Montar lista final para o Supabase
            for entry in entries:
                team = entry['team']
                stats = entry['stats']
                team_id = str(team['id'])

                def get_stat(name):
                    try: return int(float(next(s['value'] for s in stats if s['name'] == name)))
                    except: return 0

                dados_totais.append({
                    "liga": liga_id,
                    "posicao": get_stat('rank'),
                    "time": team['displayName'],
                    "escudo": team.get('logos', [{}])[0].get('href', ""),
                    "jogos": get_stat('gamesPlayed'),
                    "pontos": get_stat('points'),
                    "sg": get_stat('pointDifferential'),
                    "forma": formas_map.get(team_id, "EEEEE")
                })
                print(f"   ⚽ {team['displayName']}: {formas_map.get(team_id)}")

        except Exception as e:
            print(f"❌ Erro na liga {liga_id}: {e}")

    if dados_totais:
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_totais).execute()
        print(f"🚀 {len(dados_totais)} times sincronizados!")

if __name__ == "__main__":
    capturar_forma_ligas()
