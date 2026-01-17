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

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Criamos o dicionário mapeando os nomes das colunas da ESPN
            s = {item.get('name'): item.get('value') for item in stats_list}
            
            # ATENÇÃO: Verifique se esses nomes (pointsFor, etc) existem na resposta
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

            # DEBUG: Mostra no log o que está sendo enviado (pode apagar depois)
            if dados["time"] == "Real Madrid" or dados["time"] == "Flamengo":
                print(f"DEBUG {dados['time']}: GP={dados['gols_pro']}, GC={dados['gols_contra']}")

            # Envio para o Supabase
            try:
                supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()
            except Exception as db_err:
                print(f"❌ Erro ao inserir no banco: {db_err}")

        print(f"✅ {liga_id} sincronizada com sucesso.")
        
    except Exception as e:
        print(f"❌ Erro crítico na liga {liga_id}: {e}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1) # Delay para evitar bloqueio da API
