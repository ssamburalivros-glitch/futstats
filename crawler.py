import cloudscraper
from bs4 import BeautifulSoup
from supabase import create_client
from fake_useragent import UserAgent
import time
import random

# Configurações do Supabase
SUPABASE_URL = "https://vqocdowjdutfzmnvxqvz.supabase.co"
# ATENÇÃO: Use a 'service_role' key para poder deletar/inserir dados
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb2Nkb3dqZHV0ZnptbnZ4cXZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIzNjQzNCwiZXhwIjoyMDgxODEyNDM0fQ.GlJ_-kh2u7qsLMRgB5jVpvduhIG0yyY9AZ9rU_mEqcE" 
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_tabela_brasileirao():
    ua = UserAgent()
    # Cria o scraper que simula comportamento humano
    scraper = cloudscraper.create_scraper(
        browser={
            'browser': 'chrome',
            'platform': 'windows',
            'desktop': True
        }
    )

    # Fonte confiável (exemplo: WorldFootball ou similar que tenha estrutura estável)
    url = "https://www.worldfootball.net/schedule/bra_serie_a_2025_spieltag/1/"

    headers = {'User-Agent': ua.random}
    
    try:
        print("🔍 Iniciando captura da tabela...")
        response = scraper.get(url, headers=headers)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Localiza a tabela padrão do site
        tabela = soup.find('table', class_='standard_tabelle')
        linhas = tabela.find_all('tr')[1:] # Pula o cabeçalho

        dados_para_inserir = []

        for linha in linhas:
            cols = linha.find_all('td')
            if len(cols) >= 10:
                dados_para_inserir.append({
                    "posicao": int(cols[0].text.strip().replace('.', '')),
                    "time": cols[2].text.strip(),
                    "jogos": int(cols[3].text.strip()),
                    "vitorias": int(cols[4].text.strip()),
                    "sg": int(cols[8].text.strip()),
                    "pontos": int(cols[9].text.strip())
                })

        if dados_para_inserir:
            # 1. Limpa os dados antigos (evita duplicados)
            supabase.table("tabela_brasileirao").delete().neq("posicao", 0).execute()
            
            # 2. Insere a nova tabela atualizada
            supabase.table("tabela_brasileirao").insert(dados_para_inserir).execute()
            print(f"✅ Sucesso! {len(dados_para_inserir)} times atualizados no Supabase.")
        
    except Exception as e:
        print(f"❌ Erro durante o scraping: {e}")

# Executa o script
if __name__ == "__main__":
    get_tabela_brasileirao()
