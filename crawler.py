import requests
from bs4 import BeautifulSoup
from supabase import create_client
import time

# --- CONFIGURAÇÃO SUPABASE ---
SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- LIGAS PARA MONITORAR ---
LIGAS = {
    "BR": "https://www.espn.com.br/futebol/classificacao/_/liga/bra.1",
    "ING": "https://www.espn.com.br/futebol/classificacao/_/liga/eng.1",
    "ESP": "https://www.espn.com.br/futebol/classificacao/_/liga/esp.1",
    "ITA": "https://www.espn.com.br/futebol/classificacao/_/liga/ita.1"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def capturar_dados():
    for sigla, url in LIGAS.items():
        print(f"--- Sincronizando Liga: {sigla} ---")
        try:
            response = requests.get(url, headers=HEADERS)
            soup = BeautifulSoup(response.text, 'html.parser')

            # Tabelas da ESPN são divididas em duas: Nomes e Estatísticas
            tabelas = soup.find_all('table')
            if len(tabelas) < 2:
                print(f"Erro ao encontrar tabelas da liga {sigla}")
                continue

            # 1. Nomes e Escudos
            linhas_nomes = tabelas[0].find_all('tr')[1:]
            # 2. Estatísticas (Jogos, GP, GC, SG, Pts)
            linhas_stats = tabelas[1].find_all('tr')[1:]

            for i in range(len(linhas_nomes)):
                # Extração do Nome e Escudo
                col_nome = linhas_nomes[i].find('span', class_='hide-mobile')
                nome_time = col_nome.text.strip() if col_nome else "Time Desconhecido"
                
                img_tag = linhas_nomes[i].find('img')
                escudo = img_tag['src'] if img_tag else ""

                # Extração das Estatísticas
                cols = linhas_stats[i].find_all('td')
                
                # A ESPN segue a ordem: J | V | E | D | GP | GC | SG | PTS
                jogos = int(cols[0].text)
                gp    = int(cols[4].text) # Gols Pró
                gc    = int(cols[5].text) # Gols Contra
                sg    = int(cols[6].text) # Saldo de Gols
                pts   = int(cols[7].text) # Pontos
                pos   = i + 1

                # Montagem do Objeto para o Supabase
                dados = {
                    "posicao": pos,
                    "time": nome_time,
                    "escudo": escudo,
                    "jogos": jogos,
                    "gols_pro": gp,
                    "gols_contra": gc,
                    "sg": sg,
                    "pontos": pts,
                    "liga": sigla
                }

                # Upsert (Atualiza se existir, insere se não existir)
                # O identificador único deve ser a combinação de Time e Liga
                try:
                    supabase.table("tabelas_ligas").upsert(dados, on_conflict="time,liga").execute()
                    print(f"[OK] {nome_time} atualizado.")
                except Exception as ex:
                    print(f"[ERRO SUPABASE] {nome_time}: {ex}")

        except Exception as e:
            print(f"Erro fatal na liga {sigla}: {e}")

if __name__ == "__main__":
    while True:
        capturar_dados()
        print("Aguardando 10 minutos para a próxima atualização...")
        time.sleep(600)
