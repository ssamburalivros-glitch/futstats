import os
import pandas as pd
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Mapeamento de Ligas (URLs do FBref para a temporada atual)
LIGAS_URLS = {
    "BR": "https://fbref.com/pt/comps/24/Serie-A-Estatisticas",
    "PL": "https://fbref.com/pt/comps/9/Premier-League-Estatisticas",
    "ES": "https://fbref.com/pt/comps/12/La-Liga-Estatisticas",
    "DE": "https://fbref.com/pt/comps/20/Bundesliga-Estatisticas",
    "IT": "https://fbref.com/pt/comps/11/Serie-A-Estatisticas",
    "PT": "https://fbref.com/pt/comps/32/Primeira-Liga-Estatisticas"
}

def capturar_dados_reais():
    dados_finais = []

    for liga_id, url in LIGAS_URLS.items():
        print(f"📡 Capturando {liga_id} via FBref...")
        try:
            # O Pandas consegue ler tabelas HTML diretamente
            # Usamos um Header para não sermos bloqueados
            header = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(url, headers=header)
            
            # A primeira tabela (index 0) costuma ser a de classificação
            tabelas = pd.read_html(response.text)
            df = tabelas[0]

            # Renomear colunas para facilitar (o FBref varia os nomes às vezes)
            # Coluna 'Últimos 5' é onde mora o ouro!
            for index, row in df.iterrows():
                # Limpeza da Forma: O FBref usa "V V E D V"
                forma_raw = str(row.get('Últimos 5', ''))
                forma_limpa = forma_raw.replace(' ', '').replace('w', 'V').replace('d', 'E').replace('l', 'D').upper()
                forma_limpa = forma_limpa.replace('W', 'V').replace('L', 'D').replace('T', 'E') # Garante PT-BR
                
                # Pegar o escudo do time (o FBref não dá o link direto fácil, usamos o fallback ou API da ESPN apenas para o logo)
                time_nome = row['Equipe']
                
                dados_finais.append({
                    "liga": liga_id,
                    "posicao": int(row['Class.']),
                    "time": time_nome,
                    "escudo": f"https://duckduckgo.com/i/cf98338e.png", # Placeholder ou manter o que já tem
                    "jogos": int(row['PJ']),
                    "pontos": int(row['Pts']),
                    "sg": int(row['SG']),
                    "forma": forma_limpa[:5]
                })
                print(f"   ✅ {time_nome}: {forma_limpa[:5]}")

        except Exception as e:
            print(f"❌ Erro na liga {liga_id}: {e}")

    if dados_finais:
        # Atualizar Supabase
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_finais).execute()
        print(f"🚀 {len(dados_finais)} times atualizados com forma REAL!")

if __name__ == "__main__":
    capturar_dados_reais()
