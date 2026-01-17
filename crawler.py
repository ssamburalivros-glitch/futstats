import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
# No GitHub: Settings -> Secrets and variables -> Actions
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Mapeamento de Ligas (ESPN IDs)
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

def capturar_dados_liga(liga_sigla, espn_id):
    print(f"📡 Buscando dados de: {liga_sigla}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        response = requests.get(url, timeout=15)
        data = response.json()
        
        # Localiza onde estão os times no JSON da ESPN
        if 'children' in data:
            entries = data['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = data.get('standings', {}).get('entries', [])

        for entry in entries:
            team_data = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Transforma a lista de stats em um dicionário para busca rápida
            s = {item.get('name'): item.get('value') for item in stats_list}
            
            # --- CAPTURA DE GOLS (O SEGREDO DO GP/GC) ---
            # A ESPN alterna nomes. Tentamos todos os possíveis:
            gp = s.get('pointsFor') or s.get('goalsFor') or s.get('goals') or 0
            gc = s.get('pointsAgainst') or s.get('goalsAgainst') or s.get('goalsConceded') or 0
            sg = s.get('pointDifferential') or s.get('goalDifference') or 0
            
            # Monta o objeto para o Banco de Dados
            dados_time = {
                "liga": liga_sigla,
                "time": team_data.get('displayName'),
                "posicao": int(s.get('rank') or 0),
                "escudo": team_data.get('logos', [{}])[0].get('href') if team_data.get('logos') else "",
                "jogos": int(s.get('gamesPlayed') or 0),
                "vitorias": int(s.get('wins') or 0),
                "empates": int(s.get('ties') or 0),
                "derrotas": int(s.get('losses') or 0),
                "gols_pro": int(gp),
                "gols_contra": int(gc),
                "sg": int(sg),
                "pontos": int(s.get('points') or 0)
            }

            # Envia para o Supabase (Atualiza se o time já existir na liga)
            try:
                supabase.table("tabelas_ligas").upsert(
                    dados_time, 
                    on_conflict="liga, time"
                ).execute()
            except Exception as e_db:
                print(f"❌ Erro no banco para {dados_time['time']}: {e_db}")

        print(f"✅ Liga {liga_sigla} sincronizada!")

    except Exception as e:
        print(f"💥 Erro crítico na liga {liga_sigla}: {e}")

if __name__ == "__main__":
    for sigla, espn_code in LIGAS.items():
        capturar_dados_liga(sigla, espn_code)
        time.sleep(1) # Evita bloqueio por excesso de requisições
