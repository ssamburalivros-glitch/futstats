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

def atualizar_tabela_brasileirao():
    ua = UserAgent()
    scraper = cloudscraper.create_scraper()
    
    # Vamos usar uma URL alternativa caso a anterior tenha bloqueado
    url = "https://www.worldfootball.net/schedule/bra_serie_a_2024_spieltag/38/" 
    
    try:
        print("🔍 Tentando capturar tabela de:", url)
        response = scraper.get(url, headers={'User-Agent': ua.random}, timeout=20)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Procura a tabela de forma mais genérica
        tabela = soup.find('table', class_='standard_tabelle')
        
        if tabela is None:
            # Se não achou pela classe, tenta pegar a primeira tabela de dados da página
            tabelas = soup.find_all('table')
            if len(tabelas) > 0:
                tabela = tabelas[0]
            else:
                print("❌ Nenhuma tabela encontrada na página.")
                return

        linhas = tabela.find_all('tr')
        dados_novos = []

        for linha in linhas:
            cols = linha.find_all('td')
            # Verifica se é uma linha de time (geralmente tem mais de 9 colunas)
            if len(cols) >= 9:
                try:
                    pos = cols[0].text.strip().replace('.', '')
                    # Pula linhas que não começam com número (cabeçalhos extras)
                    if not pos.isdigit(): continue
                    
                    dados_novos.append({
                        "posicao": int(pos),
                        "time": cols[2].text.strip(),
                        "jogos": int(cols[3].text.strip()),
                        "vitorias": int(cols[4].text.strip()),
                        "sg": int(cols[8].text.strip()),
                        "pontos": int(cols[9].text.strip())
                    })
                except ValueError:
                    continue

        if dados_novos:
            # Limpa e insere no Supabase
            supabase.table("tabela_brasileirao").delete().neq("posicao", 0).execute()
            supabase.table("tabela_brasileirao").insert(dados_novos).execute()
            print(f"✅ Tabela atualizada: {len(dados_novos)} times.")
            
    except Exception as e:
        print(f"❌ Erro detalhado: {e}")
