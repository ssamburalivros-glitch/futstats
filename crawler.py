import os
import time
import random
from requests_html import HTMLSession
from bs4 import BeautifulSoup
from supabase import create_client
from fake_useragent import UserAgent

# --- CONFIGURAÇÃO DE AMBIENTE ---
# O GitHub Actions injeta estas variáveis via Secrets (mapeadas no main.yml)
SUPABASE_URL = os.environ.get("https://vqocdowjdutfzmnvxqvz.supabase.co")
SUPABASE_KEY = os.environ.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb2Nkb3dqZHV0ZnptbnZ4cXZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIzNjQzNCwiZXhwIjoyMDgxODEyNDM0fQ.GlJ_-kh2u7qsLMRgB5jVpvduhIG0yyY9AZ9rU_mEqcE")

# Log de Diagnóstico (Aparece no console do GitHub Actions)
print("--- INICIALIZANDO CRAWLER FUTSTATS ---")
if SUPABASE_URL and SUPABASE_KEY:
    print(f"✅ Conexão configurada. URL: {SUPABASE_URL[:15]}...")
else:
    print("❌ ERRO FATAL: Chaves do Supabase não encontradas!")
    exit(1)

# Inicializa o banco de dados
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
ua = UserAgent()

# Definição das Ligas e URLs (Fbref Temporada Atual)
LIGAS = {
    "BR": "https://fbref.com/en/comps/24/Serie-A-Stats",
    "PL": "https://fbref.com/en/comps/9/Premier-League-Stats",
    "ES": "https://fbref.com/en/comps/12/La-Liga-Stats",
    "DE": "https://fbref.com/en/comps/20/Bundesliga-Stats",
    "IT": "https://fbref.com/en/comps/11/Serie-A-Stats",
    "PT": "https://fbref.com/en/comps/37/Primeira-Liga-Stats"
}

def capturar_dados(liga_id, url):
    session = HTMLSession()
    headers = {'User-Agent': ua.random}
    
    try:
        print(f"📡 Raspando: {liga_id}...")
        r = session.get(url, headers=headers, timeout=20)
        
        # O modo headless é essencial para rodar no servidor do GitHub
        r.html.render(sleep=5, timeout=30) 
        
        soup = BeautifulSoup(r.html.html, 'html.parser')
        # Localiza a tabela de classificação (stats_table)
        tabela = soup.find('table', class_='stats_table')
        
        if not tabela:
            print(f"⚠️ Tabela não encontrada para {liga_id}")
            return []

        lista_times = []
        corpo = tabela.find('tbody')
        for row in corpo.find_all('tr'):
            # Ignora linhas que não são de dados (cabeçalhos extras ou spacers)
            if 'spacer' in row.get('class', []) or 'thead' in row.get('class', []):
                continue
                
            cols = row.find_all(['th', 'td'])
            
            # Mapeamento de colunas (Padrão Fbref 2025)
            # 0: Rank, 1: Squad, 2: MP, 3: W... 9: Pts, 10: GD
            if len(cols) >= 10:
                try:
                    lista_times.append({
                        "liga": liga_id,
                        "posicao": int(cols[0].text.strip().replace('.', '')),
