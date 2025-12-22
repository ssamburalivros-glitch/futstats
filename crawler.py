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
    # Headers mais completos para evitar o bloqueio (fingindo ser um navegador real)
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
    }
    
    try:
        print(f"📡 Lendo {liga_id}...")
        response = requests.get(url, headers=headers, timeout=20)
        
        if response.status_code != 200:
            print(f"❌ Erro de acesso ({response.status_code}) para {liga_id}")
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        
        # O FBRef coloca a tabela de classificação dentro de uma div com id "all_results..."
        # Vamos buscar qualquer tabela que tenha a classe 'stats_table'
        tabela = soup.find('table', {'class': 'stats_table'})
        
        if not tabela:
            # Tentativa secundária: buscar pelo ID comum do FBRef
            tabela = soup.find('table', id=lambda x: x and 'overall' in x)

        if not tabela:
            print(f"⚠️ Tabela não localizada em {liga_id}")
            return []

        times = []
        # No FBRef, os dados reais estão no tbody
        linhas = tabela.find('tbody').find_all('tr')

        for row in linhas:
            # Ignora linhas que não são de times (como cabeçalhos no meio da tabela)
            if row.get('class') and ('spacer' in row.get('class') or 'thead' in row.get('class')):
                continue
            
            cols = row.find_all(['th', 'td'])
            
            # Estrutura FBRef: 0=Pos, 1=Squad, 2=MP, 9=Pts, 10=GD
            if len(cols) >= 10:
                try:
                    nome_time = cols[1].text.strip()
                    # Limpa o nome do time (remove espaços extras)
                    nome_time = " ".join(nome_time.split())
                    
                    # Tenta pegar o escudo (src da imagem)
                    img = cols[1].find('img')
                    escudo_url = img['src'] if img else ""

                    times.append({
                        "liga": liga_id,
                        "posicao": int(cols[0].text.strip().replace('.', '')),
                        "time": nome_time,
                        "escudo": escudo_url,
                        "jogos": int(cols[2].text.strip()),
                        "pontos": int(cols[9].text.strip()),
                        "sg": int(cols[10].text.strip().replace('+', ''))
                    })
                except Exception as e:
                    continue
                    
        return times
    except Exception as e:
        print(f"❌ Erro crítico em {liga_id}: {e}")
        return []

def main():
    dados_acumulados = []
    
    for liga_id, url in LIGAS.items():
        times_liga = capturar_dados(liga_id, url)
        if times_liga:
            dados_acumulados.extend(times_liga)
            print(f"✅ {liga_id}: {len(times_liga)} times capturados.")
        
        # O FBRef bloqueia se fizermos muitas requisições rápidas
        time.sleep(random.uniform(5, 8))

    if dados_acumulados:
        print(f"📤 Enviando {len(dados_acumulados)} times para o Supabase...")
        try:
            # Limpa e insere
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            supabase.table("tabelas_ligas").insert(dados_acumulados).execute()
            print("🚀 SUCESSO TOTAL!")
        except Exception as e:
            print(f"❌ Erro ao salvar no banco: {e}")
    else:
        print("⚠️ Falha geral: Nenhum dado extraído das URLs.")

if __name__ == "__main__":
    main()
