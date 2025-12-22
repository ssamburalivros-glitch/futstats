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
    print("❌ Chaves não encontradas nos Secrets do GitHub!")
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    try:
        print(f"📡 Lendo {liga_id}...")
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code != 200:
            print(f"❌ Erro HTTP {response.status_code} em {liga_id}")
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # O FBRef usa IDs que contém 'overall' para a tabela principal
        tabela = soup.select_one('table[id*="overall"]')
        
        if not tabela:
            tabela = soup.find('table', class_='stats_table')

        if not tabela:
            print(f"⚠️ Tabela não encontrada para {liga_id}")
            return []

        times = []
        corpo = tabela.find('tbody')
        if not corpo: return []

        for row in corpo.find_all('tr', class_=lambda x: x != 'spacer'):
            if 'thead' in (row.get('class') or []): continue
            
            cols = row.find_all(['th', 'td'])
            if len(cols) >= 10:
                try:
                    # Limpeza de texto para evitar erros de banco
                    nome_time = cols[1].text.strip()
                    img = cols[1].find('img')
                    escudo = img['src'] if img else ""

                    times.append({
                        "liga": liga_id,
                        "posicao": int(cols[0].text.strip().replace('.', '')),
                        "time": nome_time,
                        "escudo": escudo,
                        "jogos": int(cols[2].text.strip()),
                        "pontos": int(cols[9].text.strip()),
                        "sg": int(cols[10].text.strip().replace('+', ''))
                    })
                except Exception:
                    continue
                    
        return times
    except Exception as e:
        print(f"❌ Erro crítico em {liga_id}: {e}")
        return []

def main():
    dados_totais = []
    for liga_id, url in LIGAS.items():
        resultado = capturar_dados(liga_id, url)
        if resultado:
            dados_totais.extend(resultado)
            print(f"✅ {liga_id}: {len(resultado)} times.")
        
        # Pausa maior para evitar ser banido pelo FBRef
        time.sleep(random.uniform(6, 10))

    if dados_totais:
        print(f"📤 Enviando {len(dados_totais)} registros para o Supabase...")
        try:
            # Limpa e insere novos dados
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            supabase.table("tabelas_ligas").insert(dados_totais).execute()
            print("🚀 SUCESSO! Banco atualizado.")
        except Exception as e:
            print(f"❌ Erro no banco: {e}")
    else:
        print("⚠️ Nada foi coletado.")

if __name__ == "__main__":
    main()
