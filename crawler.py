from requests_html import HTMLSession
from bs4 import BeautifulSoup
from supabase import create_client
from fake_useragent import UserAgent
import time
import random

# --- Configurações Supabase ---
SUPABASE_URL = "https://vqocdowjdutfzmnvxqvz.supabase.co"
# Use a service_role key para ter permissão de escrita e exclusão
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb2Nkb3dqZHV0ZnptbnZ4cXZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIzNjQzNCwiZXhwIjoyMDgxODEyNDM0fQ.GlJ_-kh2u7qsLMRgB5jVpvduhIG0yyY9AZ9rU_mEqcE" 
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- Configurações Scraper ---
UA = UserAgent()
# URLs das tabelas no Fbref (ajuste o ano da temporada)
# Você pode precisar mudar o "2023-2024" para "2024-2025" quando a temporada começar lá
FBREF_URLS = {
    "BR": "https://fbref.com/en/comps/24/Mineiro-Stats", # Exemplo para o Campeonato Mineiro 2024, ajuste para Brasileirão 2025
    "PL": "https://fbref.com/en/comps/9/Premier-League-Stats",
    "ES": "https://fbref.com/en/comps/12/La-Liga-Stats",
    "DE": "https://fbref.com/en/comps/20/Bundesliga-Stats",
    "IT": "https://fbref.com/en/comps/11/Serie-A-Stats",
    "PT": "https://fbref.com/en/comps/37/Primeira-Liga-Stats"
}

def get_tabela_fbref(liga_key, url_liga):
    session = HTMLSession()
    headers = {
        'User-Agent': UA.random, # Rotaciona User-Agent
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }

    try:
        print(f"🔍 Iniciando scraping para {liga_key} em {url_liga}...")
        
        # Faz a requisição e renderiza o JavaScript da página
        r = session.get(url_liga, headers=headers, timeout=10)
        r.html.render(sleep=random.uniform(3, 5), scrolldown=1) # Espera e rola um pouco

        soup = BeautifulSoup(r.html.html, 'html.parser')
        
        # O Fbref usa IDs de tabelas específicas. Geralmente é "results", "league_table", etc.
        # Você PRECISA inspecionar o HTML da página do Fbref para encontrar o ID correto.
        # Exemplo para a tabela principal:
        tabela = soup.find('table', id='results2023-202424_overall') # <-- Mude este ID para o da temporada 2025 quando disponível
        if not tabela:
            # Tenta um ID comum para a tabela de classificação geral
            tabela = soup.find('table', class_='stats_table') 
            
        if not tabela:
            print(f"❌ Tabela não encontrada para {liga_key}. Verifique o ID no Fbref.")
            return []

        dados_tabela = []
        # Percorre as linhas da tabela, ignorando o cabeçalho
        for row in tabela.find_all('tr')[1:]: 
            cols = row.find_all(['th', 'td'])
            if len(cols) > 1: # Garante que é uma linha de dados
                posicao = cols[0].text.strip().replace('.', '')
                time_nome = cols[1].text.strip()
                # O Fbref tem muitas colunas. Pegue as que você precisa.
                # Exemplo: P = Pontos, J = Jogos, V = Vitórias, E = Empates, D = Derrotas, SG = Saldo de Gols
                try:
                    pontos = int(cols[2].text.strip())
                    jogos = int(cols[3].text.strip())
                    vitorias = int(cols[4].text.strip())
                    empates = int(cols[5].text.strip())
                    derrotas = int(cols[6].text.strip())
                    sg = int(cols[10].text.strip()) # O índice pode variar
                except (ValueError, IndexError):
                    print(f"⚠️ Erro ao converter dados para {time_nome}. Pulando linha.")
                    continue

                dados_tabela.append({
                    "liga": liga_key, # Identifica a liga no BD
                    "posicao": int(posicao),
                    "time": time_nome,
                    "pontos": pontos,
                    "jogos": jogos,
                    "vitorias": vitorias,
                    "empates": empates,
                    "derrotas": derrotas,
                    "sg": sg,
                    "last_updated": time.time() # Timestamp de atualização
                })
        
        return dados_tabela

    except Exception as e:
        print(f"❌ Erro crítico no scraping para {liga_key}: {e}")
        return []

def atualizar_supabse_tabelas():
    # Limpa a tabela antiga no Supabase
    supabase.table("tabelas_ligas").delete().neq("liga", "N/A").execute()
    print("🗑️ Tabela 'tabelas_ligas' limpa no Supabase.")

    todos_dados = []
    for key, url in FBREF_URLS.items():
        dados_liga = get_tabela_fbref(key, url)
        if dados_liga:
            todos_dados.extend(dados_liga)
        time.sleep(random.uniform(10, 20)) # Delay entre as ligas para evitar bloqueio

    if todos_dados:
        supabase.table("tabelas_ligas").insert(todos_dados).execute()
        print(f"✅ Todas as tabelas ({len(todos_dados)} registros) atualizadas no Supabase.")
    else:
        print("⚠️ Nenhum dado capturado para atualizar no Supabase.")

# --- Execução ---
if __name__ == "__main__":
    atualizar_supabse_tabelas()
