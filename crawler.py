import os
import time
import random
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "https://fbref.com/en/comps/24/Serie-A-Stats",
    "PL": "https://fbref.com/en/comps/9/Premier-League-Stats",
    "ES": "https://fbref.com/en/comps/12/La-Liga-Stats",
    "DE": "https://fbref.com/en/comps/20/Bundesliga-Stats",
    "IT": "https://fbref.com/en/comps/11/Serie-A-Stats",
    "PT": "https://fbref.com/en/comps/37/Primeira-Liga-Stats"
}

def capturar_dados(liga_id, url):
    # Lista de User-Agents para rotacionar e evitar o 403
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]

    session = requests.Session()
    headers = {
        'User-Agent': random.choice(user_agents),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
    }
    
    try:
        print(f"📡 Acessando {liga_id}...")
        # Adicionamos um pequeno delay antes da requisição para parecer humano
        time.sleep(random.uniform(2, 4))
        
        response = session.get(url, headers=headers, timeout=30)
        
        if response.status_code == 429:
            print(f"⚠️ Rate limit atingido (429). Esperando mais tempo...")
            return []
        
        if response.status_code != 200:
            print(f"❌ Erro {response.status_code} em {liga_id}")
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        tabela = soup.select_one('table[id*="overall"]') or soup.find('table', class_='stats_table')

        if not tabela:
            print(f"⚠️ Tabela não encontrada em {liga_id}")
            return []

        times = []
        for row in tabela.find('tbody').find_all('tr', class_=lambda x: x != 'spacer'):
            if 'thead' in (row.get('class') or []): continue
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
        print(f"❌ Erro: {e}")
        return []

def main():
    todas_ligas = []
    for liga_id, url in LIGAS.items():
        res = capturar_dados(liga_id, url)
        if res:
            todas_ligas.extend(res)
            print(f"✅ {liga_id} OK.")
        # O FBRef é extremamente sensível. 20 segundos de pausa entre ligas para evitar o 403.
        print("⏳ Aguardando para evitar bloqueio...")
        time.sleep(20)

    if todas_ligas:
        print(f"📤 Enviando {len(todas_ligas)} times...")
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(todas_ligas).execute()
        print("🚀 SUCESSO!")

if __name__ == "__main__":
    main()
