import os
import time
import requests
from bs4 import BeautifulSoup
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

def capturar_dados(liga_id, url_alvo):
    print(f"📡 Solicitando {liga_id} via ScrapingBee...")
    
    # Adicionamos 'wait_for' para garantir que a tabela carregue
    api_url = f"https://app.scrapingbee.com/api/v1/?api_key={SCRAPING_KEY}&url={quote(url_alvo)}&render_js=false"
    
    try:
        response = requests.get(api_url, timeout=60)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Tenta encontrar a tabela de várias formas possíveis
            tabela = (soup.select_one('table[id*="overall"]') or 
                      soup.find('table', class_='stats_table') or
                      soup.find('table'))

            if not tabela:
                print(f"⚠️ HTML recebido, mas tabela não encontrada para {liga_id}")
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
            
            if times:
                print(f"✅ {liga_id}: {len(times)} times encontrados.")
            return times
        else:
            print(f"❌ Erro na API ScrapingBee: {response.status_code}")
            return []
    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
        return []

def main():
    if not SCRAPING_KEY:
        print("❌ Chaves de API não configuradas!")
        return

    todas_ligas = []
    for liga_id, url in LIGAS.items():
        res = capturar_dados(liga_id, url)
        if res:
            todas_ligas.extend(res)
        
        # ESSENCIAL: Esperar um pouco entre as ligas para a API não engasgar
        time.sleep(5)

    if todas_ligas:
        print(f"📤 Enviando {len(todas_ligas)} registros para o Supabase...")
        try:
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            supabase.table("tabelas_ligas").insert(todas_ligas).execute()
            print("🚀 SUCESSO ABSOLUTO!")
        except Exception as e:
            print(f"❌ Erro ao salvar no Supabase: {e}")
    else:
        print("💀 Falha total na coleta. Verifique os logs acima.")

if __name__ == "__main__":
    main()
