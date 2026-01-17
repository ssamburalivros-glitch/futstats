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
    "FR": "fra.1", "NL": "ned.1", "SA": "sau.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"📡 Buscando dados para: {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=15).json()
        
        # Tenta encontrar a lista de times na estrutura da ESPN
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"❌ Nenhuma entrada encontrada para {liga_id}")
            return

  # Dentro da função capturar_dados_liga, substitua o loop for por este:
for entry in entries:
    team_data = entry.get('team', {})
    stats_list = entry.get('stats', [])
    
    # Cria um dicionário mapeando o NOME da estatística para o VALOR
    # Isso evita pegar a coluna errada
    stats_map = {s.get('name'): s.get('value') for s in stats_list}
    
    # Captura com nomes alternativos (Fallbacks)
    gp = stats_map.get('pointsFor') or stats_map.get('goalsFor') or 0
    gc = stats_map.get('pointsAgainst') or stats_map.get('goalsAgainst') or 0
    sg = stats_map.get('pointDifferential') or stats_map.get('goalDifference') or 0
    v  = stats_map.get('wins') or 0
    e  = stats_map.get('ties') or stats_map.get('draws') or 0
    d  = stats_map.get('losses') or 0
    pts = stats_map.get('points') or 0
    jogos = stats_map.get('gamesPlayed') or 0
    pos = stats_map.get('rank') or 0

    dados_time = {
        "liga": liga_sigla,
        "time": team_data.get('displayName'),
        "posicao": int(pos),
        "escudo": team_data.get('logos', [{}])[0].get('href') if team_data.get('logos') else "",
        "jogos": int(jogos),
        "vitorias": int(v),
        "empates": int(e),
        "derrotas": int(d),
        "gols_pro": int(gp),
        "gols_contra": int(gc),
        "sg": int(sg),
        "pontos": int(pts)
    }

    # UPSERT para atualizar os "zeros" existentes
    supabase.table("tabelas_ligas").upsert(dados_time, on_conflict="liga, time").execute()
            except Exception as db_err:
                print(f"❌ Erro ao inserir no banco: {db_err}")

        print(f"✅ {liga_id} sincronizada com sucesso.")
        
    except Exception as e:
        print(f"❌ Erro crítico na liga {liga_id}: {e}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1) # Delay para evitar bloqueio da API
