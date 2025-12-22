import os
import time
import requests
import re
from bs4 import BeautifulSoup, Comment
from supabase import create_client
from urllib.parse import quote

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SCRAPING_KEY = os.environ.get("SCRAPING_KEY") 

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "https://fbref.com/en/comps/24/Serie-A-Stats",
    "PL": "https://fbref.com/en/comps/9/Premier-League-Stats",
    "ES": "https://fbref.com/en/comps/12/La-Liga-Stats",
    "DE": "https://fbref.com/en/comps/20/Bundesliga-Stats",
    "IT": "https://fbref.com/en/comps/11/Serie-A-Stats",
    "PT": "https://fbref.com/en/comps/37/Primeira-Liga-Stats"
}

def extrair_tabela(soup):
    """Procura a tabela no HTML ou dentro de comentários"""
    # 1. Tenta encontrar a tabela visível
    tabela = soup.select_one('table[id*="overall"]') or soup.find('table', class_='stats_table')
    
    if not tabela:
        # 2. Se não achou, procura dentro de comentários (Truque do FBRef)
        comentarios = soup.find_all(string=lambda text: isinstance(text, Comment))
        for com in comentarios:
            if 'table' in com and 'id="results' in com:
                sub_soup = BeautifulSoup(com, 'html.parser')
                tabela = sub_soup.find('table')
                if tabela: break
    return tabela

def capturar_dados(liga_id, url_alvo):
    print(f"📡 Solicitando {liga_id} via ScrapingBee (Premium Mode)...")
    
    # Adicionamos premium_proxy=true para garantir que não caia em captchas
    api_url = f"https://app.scrapingbee.com/api/v1/?api_key={SCRAPING_KEY}&url={quote(url_alvo)}&premium_proxy=true&country_code=br"
    
    try:
        response = requests.get(api_url, timeout=60)
        if response.status_code != 200:
            print(f"❌ Erro ScrapingBee: {response.status_code}")
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        tabela = extrair_tabela(soup)

        if not tabela:
            print(f"⚠️ HTML recebido, mas tabela ainda oculta para {liga_id}")
            return []

        times = []
        corpo = tabela.find('tbody')
        if not corpo: return []

        for row in corpo.find_all('tr'):
            if 'spacer' in row.get('class', []) or 'thead' in row.get('class', []):
                continue
            
            cols = row.find_all(['th', 'td'])
            if len(cols) >= 10:
                try:
                    # Alguns campos podem vir com links, pegamos apenas o texto
                    pos = cols[0].text.strip().replace('.', '')
                    nome_time = cols[1].text.strip()
                    img = cols[1].find('img')
                    escudo = img['src'] if img else ""
                    
                    times.append({
                        "liga": liga_id,
                        "posicao": int(pos) if pos.isdigit() else 0,
                        "time": nome_time,
                        "escudo": escudo,
                        "jogos": int(cols[2].text.strip() or 0),
                        "pontos": int(cols[9].text.strip() or 0),
                        "sg": int(cols[10].text.strip().replace('+', '') or 0)
                    })
                except: continue
        
        if times:
            print(f"✅ {liga_id}: {len(times)} times encontrados.")
        return times
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return []

def main():
    if not SCRAPING_KEY:
        print("❌ Chave SCRAPING_KEY não configurada!")
        return

    dados_totais = []
    for liga_id, url in LIGAS.items():
        res = capturar_dados(liga_id, url)
        if res:
            dados_totais.extend(res)
        time.sleep(2) # Pequeno delay entre chamadas de API

    if dados_totais:
        print(f"📤 Enviando {len(dados_totais)} registros para o Supabase...")
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_totais).execute()
        print("🚀 SUCESSO ABSOLUTO!")
    else:
        print("💀 O site está bloqueando até a API. Tentando plano B em seguida...")

if __name__ == "__main__":
    main()
