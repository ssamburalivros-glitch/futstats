import os
import time
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from urllib.parse import quote

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SCRAPINGBEE_KEY = os.environ.get("SCRAPING_KEY") # Chave que adicionou ao GitHub

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "https://fbref.com/en/comps/24/Serie-A-Stats",
    "PL": "https://fbref.com/en/comps/9/Premier-League-Stats",
    "ES": "https://fbref.com/en/comps/12/La-Liga-Stats",
    "DE": "https://fbref.com/en/comps/20/Bundesliga-Stats",
    "IT": "https://fbref.com/en/comps/11/Serie-A-Stats",
    "PT": "https://fbref.com/en/comps/37/Primeira-Liga-Stats"
}

def capturar_dados_com_proxy(liga_id, url_alvo):
    print(f"📡 Solicitando {liga_id} via ScrapingBee...")
    
    # Monta a URL do ScrapingBee para contornar o 403
    api_url = f"https://app.scrapingbee.com/api/v1/?api_key={SCRAPINGBEE_KEY}&url={quote(url_alvo)}&render_js=false"
    
    try:
        response = requests.get(api_url, timeout=40)
        
        if response.status_code != 200:
            print(f"❌ Erro na API ({response.status_code}) para {liga_id}")
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        tabela = soup.select_one('table[id*="overall"]') or soup.find('table', class_='stats_table')

        if not tabela:
            print(f"⚠️ Tabela não encontrada no HTML retornado para {liga_id}")
            return []

        times = []
        for row in tabela.find('tbody').find_all('tr', class_=lambda x: x != 'spacer'):
            cols = row.find_all(['th', 'td'])
            if len(cols) >= 10:
                try:
                    times.append({
                        "liga": liga_id,
                        "posicao": int(cols[0].text.strip().replace('.', '')),
                        "time": cols[1].text.strip(),
                        "escudo": cols[1].find('img')['src'] if cols[1].find('img') else "",
                        "jogos": int(cols[2].text.strip()),
                        "pontos": int(cols[9].text.strip()),
                        "sg": int(cols[10].text.strip().replace('+', ''))
                    })
                except: continue
        return times
    except Exception as e:
        print(f"❌ Falha na conexão: {e}")
        return []

def main():
    todas_ligas = []
    for liga_id, url in LIGAS.items():
        res = capturar_dados_com_proxy(liga_id, url)
        if res:
            todas_ligas.extend(res)
            print(f"✅ {liga_id} capturada com sucesso!")
        
        # Como o ScrapingBee já rotaciona o IP, podemos diminuir o intervalo
        time.sleep(2)

    if todas_ligas:
        print(f"📤 Enviando {len(todas_ligas)} times para o Supabase...")
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(todas_ligas).execute()
        print("🚀 SUCESSO ABSOLUTO!")
    else:
        print("💀 Nem a API conseguiu aceder aos dados.")

if __name__ == "__main__":
    main()
