import os
import requests
import time
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

def pegar_forma_pelo_historico(espn_id, team_id):
    """Busca a forma real varrendo os eventos da temporada"""
    try:
        # Endpoint de competições da temporada para o time específico
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        res = requests.get(url, headers=HEADERS, timeout=10).json()
        
        eventos = res.get('events', [])
        resultados = []
        
        # Filtrar apenas jogos que já terminaram
        for ev in reversed(eventos):
            if len(resultados) >= 5: break
            
            status = ev.get('status', {}).get('type', {}).get('description', '')
            if status == "Final":
                comp = ev.get('competitions', [{}])[0]
                competitors = comp.get('competitors', [])
                
                meu_time = next((t for t in competitors if str(t['id']) == str(team_id)), None)
                if not meu_time: continue
                
                # Checar vencedor
                if meu_time.get('winner') is True:
                    resultados.append('V')
                elif meu_time.get('winner') is False:
                    # Se eu não venci, checo se o outro venceu. Se ninguém venceu, é Empate.
                    outro_time = next((t for t in competitors if str(t['id']) != str(team_id)), None)
                    if outro_time and outro_time.get('winner') is True:
                        resultados.append('D')
                    else:
                        resultados.append('E')
        
        return "".join(reversed(resultados))
    except:
        return ""

def sincronizar_tudo():
    dados_totais = []

    for liga_nome, espn_slug in LIGAS.items():
        print(f"📡 Processando {liga_nome}...")
        url_tabela = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_slug}/standings"
        
        try:
            res_tab = requests.get(url_tabela, headers=HEADERS, timeout=20).json()
            entries = res_tab.get('children', [{}])[0].get('standings', {}).get('entries', [])
            
            for entry in entries:
                team = entry.get('team', {})
                stats = entry.get('stats', [])
                team_name = team.get('displayName')
                team_id = team.get('id')

                # Tenta pegar a forma
                forma = pegar_forma_pelo_historico(espn_slug, team_id)
                
                # Se falhar, tenta o campo de sumário da tabela como última opção
                if not forma:
                    for s in stats:
                        if s.get('name') in ['summary', 'form']:
                            val = s.get('displayValue', '')
                            forma = re.sub(r'[^WLTwedv]', '', val).upper().replace('W','V').replace('L','D').replace('T','E')

                # Se ainda assim não tiver nada, coloca o padrão
                if not forma: forma = "EEEEE"

                def get_stat(name):
                    try: return int(float(next(s['value'] for s in stats if s['name'] == name)))
                    except: return 0

                print(f"   ⚽ {team_name}: {forma}")

                dados_totais.append({
                    "liga": liga_nome,
                    "posicao": get_stat('rank'),
                    "time": team_name,
                    "escudo": team.get('logos', [{}])[0].get('href', ""),
                    "jogos": get_stat('gamesPlayed'),
                    "pontos": get_stat('points'),
                    "sg": get_stat('pointDifferential'),
                    "forma": forma
                })
                time.sleep(0.3) # Evita bloqueio por excesso de requisições

        except Exception as e:
            print(f"❌ Erro na liga {liga_nome}: {e}")

    if dados_totais:
        # Atualiza Supabase
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_totais).execute()
        print(f"🚀 {len(dados_totais)} times sincronizados!")

if __name__ == "__main__":
    sincronizar_tudo()
