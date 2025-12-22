import os
import time
import random
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Chaves não encontradas!")
    exit(1)

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
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    }
    try:
        print(f"📡 Lendo {liga_id}...")
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Procura a tabela de classificação (padrão do FBRef)
        tabela = soup.find('table', {'class': 'stats_table'})
        if not tabela: return []

        times = []
        for row in tabela.find('tbody').find_all('tr'):
            if 'spacer' in row.get('class', []) or 'thead' in row.get('class', []): continue
            
            cols = row.find_all(['th', 'td'])
            if len(cols) >= 10:
                # Extração segura dos dados
                try:
                    nome_time = cols[1].text.strip()
                    img_tag = cols[1].find('img')
                    escudo = img_tag['src'] if img_tag else ""

                    times.append({
                        "liga": liga_id,
                        "posicao": int(cols[0].text.strip().replace('.', '')),
                        "time": nome_time,
                        "escudo": escudo,
                        "jogos": int(cols[2].text.strip()),
                        "pontos": int(cols[9].text.strip()),
                        "sg": int(cols[10].text.strip().replace('+', ''))
                    })
                except: continue
        return times
    except Exception as e:
        print(f"❌ Erro {liga_id}: {e}")
        return []

def main():
    todas_ligas = []
    for liga_id, url in LIGAS.items():
        res = capturar_dados(liga_id, url)
        if res:
            todas_ligas.extend(res)
            print(f"✅ {liga_id} capturado.")
        time.sleep(3) # Delay curto e seguro

    if todas_ligas:
        print(f"📤 Enviando {len(todas_ligas)} times para o Supabase...")
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(todas_ligas).execute()
        print("🚀 SUCESSO!")

if __name__ == "__main__":
    main()
