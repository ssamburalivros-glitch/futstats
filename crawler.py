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
    # Usamos o Google Search/Cache como "ponte" para evitar o 403 direto
    # ou tentamos uma URL de "versão móvel" que costuma ser menos protegida
    headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36'
    }
    
    try:
        print(f"📡 Solicitando {liga_id} via Mobile Gateway...")
        # Adicionamos parâmetros de busca para parecer um tráfego de busca real
        proxy_url = f"{url}?utm_source=google&utm_medium=search"
        
        response = requests.get(proxy_url, headers=headers, timeout=30)
        
        if response.status_code == 403:
            print(f"❌ FBRef ainda bloqueia o GitHub para {liga_id} (403).")
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        tabela = soup.select_one('table[id*="overall"]') or soup.find('table', class_='stats_table')

        if not tabela:
            return []

        times = []
        for row in tabela.find('tbody').find_all('tr', class_=lambda x: x != 'spacer'):
            cols = row.find_all(['th', 'td'])
            if len(cols) >= 10:
                try:
                    # Limpeza de dados para o Supabase
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
            print(f"✅ {liga_id} capturada!")
        
        # Intervalo longo e aleatório é vital aqui
        espera = random.randint(30, 60)
        print(f"⏳ Aguardando {espera}s para a próxima liga...")
        time.sleep(espera)

    if todas_ligas:
        print(f"📤 Enviando {len(todas_ligas)} times...")
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(todas_ligas).execute()
        print("🚀 SUCESSO!")
    else:
        print("💀 O bloqueio persiste. O FBRef proibiu o GitHub Actions.")

if __name__ == "__main__":
    main()
