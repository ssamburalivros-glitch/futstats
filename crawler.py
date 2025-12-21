import os
import time
import random
import asyncio
from requests_html import HTMLSession
from bs4 import BeautifulSoup
from supabase import create_client
from fake_useragent import UserAgent

# --- CONFIGURAÇÕES DE AMBIENTE ---
SUPABASE_URL = os.environ.get("https://vqocdowjdutfzmnvxqvz.supabase.co")
SUPABASE_KEY = os.environ.get("sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: SUPABASE_URL ou SUPABASE_KEY não configurados nos Secrets.")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
UA = UserAgent()

# URLs FBREF - Temporada 2024-2025
FBREF_URLS = {
    "BR": "https://fbref.com/en/comps/24/Serie-A-Stats",
    "PL": "https://fbref.com/en/comps/9/Premier-League-Stats",
    "ES": "https://fbref.com/en/comps/12/La-Liga-Stats",
    "DE": "https://fbref.com/en/comps/20/Bundesliga-Stats",
    "IT": "https://fbref.com/en/comps/11/Serie-A-Stats",
    "PT": "https://fbref.com/en/comps/37/Primeira-Liga-Stats"
}

def get_tabela(liga_key, url):
    # Criamos a sessão e forçamos o download do Chromium se necessário
    session = HTMLSession()
    headers = {
        'User-Agent': UA.random,
        'Accept-Language': 'en-US,en;q=0.9'
    }
    
    try:
        print(f"📡 Acessando {liga_key}...")
        r = session.get(url, headers=headers, timeout=20)
        
        # O modo headless é essencial para rodar no GitHub Actions
        # sleep=5 garante que o JavaScript do Fbref carregue a tabela
        r.html.render(sleep=5, timeout=30) 
        
        soup = BeautifulSoup(r.html.html, 'html.parser')
        
        # No Fbref, a tabela principal de classificação geralmente tem a classe 'stats_table'
        tabela = soup.find('table', class_='stats_table')
        
        if not tabela:
            print(f"⚠️ Tabela não encontrada para {liga_key}. Verificando seletores...")
            return []

        dados_liga = []
        corpo_tabela = tabela.find('tbody')
        linhas = corpo_tabela.find_all('tr')

        for row in linhas:
            # Pula linhas de separação ou cabeçalhos intermediários
            if 'spacer' in row.get('class', []) or 'thead' in row.get('class', []):
                continue
                
            cols = row.find_all(['th', 'td'])
            
            # Estrutura padrão Fbref: 0:Rank, 1:Squad, 2:MP, 3:W... 9:Pts, 10:GD
            if len(cols) >= 10:
                try:
                    pos = cols[0].text.strip()
                    nome_time = cols[1].text.strip()
                    jogos = cols[2].text.strip()
                    sg = cols[11].text.strip() if len(cols) > 11 else cols[10].text.strip()
                    pts = cols[10].text.strip() if len(cols) > 11 else cols[9].text.strip()

                    dados_liga.append({
                        "liga": liga_key,
                        "posicao": int(pos) if pos.isdigit() else 0,
                        "time": nome_time,
                        "pontos": int(pts) if pts.isdigit() else 0,
                        "jogos": int(jogos) if jogos.isdigit() else 0,
                        "sg": int(sg.replace('+', '')) if sg.replace('+', '', 1).replace('-', '', 1).isdigit() else 0,
                    })
                except Exception as e:
                    continue

        return dados_liga

    except Exception as e:
        print(f"❌ Erro crítico ao processar {liga_key}: {e}")
        return []
    finally:
        session.close()

def main():
    print("🏟️ Iniciando Scraper FutStats PRO 2025")
    todas_as_tabelas = []
    
    for key, url in FBREF_URLS.items():
        dados = get_tabela(key, url)
        if dados:
            todas_as_tabelas.extend(dados)
            print(f"✅ {key}: {len(dados)} times capturados.")
        
        # Delay entre ligas para evitar detecção de IP pelo Fbref
        wait = random.uniform(15, 25)
        print(f"⏳ Aguardando {wait:.1f}s para a próxima liga...")
        time.sleep(wait)

    if todas_as_tabelas:
        try:
            # 1. Limpa a tabela atual no Supabase
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            
            # 2. Insere os novos dados
            supabase.table("tabelas_ligas").insert(todas_as_tabelas).execute()
            print(f"🚀 SUCESSO! {len(todas_as_tabelas)} registros enviados ao Supabase.")
        except Exception as e:
            print(f"❌ Erro ao salvar no Supabase: {e}")
    else:
        print("⚠️ Nenhum dado foi coletado. O banco de dados não foi alterado.")

if __name__ == "__main__":
    main()
