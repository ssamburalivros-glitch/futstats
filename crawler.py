import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
# Substitua pelas suas strings reais se não estiver usando variáveis de ambiente
SUPABASE_URL = os.environ.get("SUPABASE_URL") or "https://sihunefyfkecumbiyxva.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or "SUA_CHAVE_AQUI"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# LIGAS COM IDS CORRIGIDOS PARA A API V2
LIGAS = {
    "BR": "bra.1", 
    "PL": "eng.1", 
    "ES": "esp.1",
    "DE": "ger.1", 
    "IT": "ita.1", 
    "PT": "por.1",
    "FR": "fra.1", 
    "SA": "sau.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"📡 Sincronizando: {liga_id}...")
    # URL da API de Classificação
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=20).json()
        
        # A estrutura da API pode variar, verificamos os dois caminhos comuns
        entries = []
        if 'children' in res:
            # Caso de ligas que possuem sub-grupos ou fases
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"⚠️ Sem dados para {liga_id} (Verifique se a temporada começou)")
            return

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Criamos um dicionário para mapear os nomes das estatísticas aos valores
            # Convertemos para minúsculas para evitar erros de nomes como 'Points' vs 'points'
            s = {item.get('name').lower(): item.get('value') for item in stats_list}
            
            # --- LOGICA ROBUSTA PARA GOLS ---
            # Tentamos 'pointsfor' (comum na API), depois 'goalsfor', depois 0
            gp = s.get('pointsfor') if s.get('pointsfor') is not None else s.get('goalsfor', 0)
            gc = s.get('pointsagainst') if s.get('pointsagainst') is not None else s.get('goalsagainst', 0)
            sg = s.get('pointdifferential') if s.get('pointdifferential') is not None else s.get('goaldifference', 0)
            
            # Pontos e Jogos
            pts = s.get('points', 0)
            jogos = s.get('gamesplayed', 0)
            rank = s.get('rank', 0)

            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": int(rank),
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": int(jogos),
                "vitorias": int(s.get('wins', 0)),
                "empates": int(s.get('ties', 0)),
                "derrotas": int(s.get('losses', 0)),
                "gols_pro": int(gp),
                "gols_contra": int(gc),
                "sg": int(sg),
                "pontos": int(pts)
            }

            # Envio para o Supabase usando UPSERT
            # Certifique-se que no Supabase existe um índice UNIQUE nas colunas (liga, time)
            try:
                supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()
            except Exception as e_db:
                print(f"❌ Erro ao salvar {team.get('displayName')}: {e_db}")

        print(f"✅ {liga_id} atualizada com sucesso.")

    except Exception as e:
        print(f"❌ Erro fatal na liga {liga_id}: {e}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1) # Delay para evitar bloqueio da API
