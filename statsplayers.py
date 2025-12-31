import os
import time
import random
import pandas as pd
import requests
from supabase import create_client

# Configurações do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Mapeamento das Ligas
LIGAS = {
    "Inglaterra": {"id": "9", "slug": "Premier-League"},
    "Espanha": {"id": "12", "slug": "La-Liga"},
    "Franca": {"id": "13", "slug": "Ligue-1"},
    "Alemanha": {"id": "20", "slug": "Bundesliga"},
    "Brasil": {"id": "24", "slug": "Serie-A"},
    "Portugal": {"id": "32", "slug": "Primeira-Liga"}
}

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def fetch_table(url):
    """Faz a requisição e retorna o DataFrame limpo."""
    time.sleep(random.uniform(20, 30)) # Delay crítico para não ser banido
    response = requests.get(url, headers=HEADERS, timeout=30)
    if response.status_code == 200:
        df = pd.read_html(response.text)[0]
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = df.columns.droplevel(0)
        return df[df['Player'] != 'Player'].copy()
    return None

def process_league(nome, info):
    print(f"--- Processando: {nome} ---")
    base_url = f"https://fbref.com/en/comps/{info['id']}"
    
    # 1. Pegar Stats Padrão (Golos, Assistências, Cartões)
    df_std = fetch_table(f"{base_url}/stats/{info['slug']}-Stats")
    
    # 2. Pegar Passes
    df_pass = fetch_table(f"{base_url}/passing/{info['slug']}-Stats")
    
    # 3. Pegar Defesa (Desarmes e Faltas)
    df_def = fetch_table(f"{base_url}/defense/{info['slug']}-Stats")

    if df_std is None or df_pass is None or df_def is None:
        print(f"Erro ao obter tabelas para {nome}")
        return

    # Unificar os dados (Merge)
    # Selecionamos apenas as colunas extras que queremos das tabelas de passes e defesa
    df_final = pd.merge(df_std, df_pass[['Player', 'Squad', 'Cmp']], on=['Player', 'Squad'], how='left')
    df_final = pd.merge(df_final, df_def[['Player', 'Squad', 'TklW', 'Fls']], on=['Player', 'Squad'], how='left')

    # Enviar para o Supabase
    for _, row in df_final.iterrows():
        try:
            id_slug = f"{row['Player']}-{row['Squad']}".replace(" ", "-").lower()
            
            data = {
                "id_slug": id_slug,
                "nome": row['Player'],
                "time": row['Squad'],
                "liga": nome,
                "jogos": int(row.get('MP', 0)),
                "gols": int(row.get('Gls', 0)),
                "assistencias": int(row.get('Ast', 0)),
                "cartoes_amarelos": int(row.get('CrdY', 0)),
                "cartoes_vermelhos": int(row.get('CrdR', 0)),
                "passes_completos": int(row.get('Cmp', 0)),
                "desarmes_ganhos": int(row.get('TklW', 0)),
                "faltas_cometidas": int(row.get('Fls', 0)),
                "ultima_atualizacao": "now()"
            }
            supabase.table("jogadores").upsert(data, on_conflict="id_slug").execute()
        except:
            continue
    print(f"Sincronização de {nome} concluída.")

if __name__ == "__main__":
    for nome, info in LIGAS.items():
        process_league(nome, info)
