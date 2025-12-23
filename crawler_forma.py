import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
from fake_useragent import UserAgent

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

ua = UserAgent()

LIGAS_URLS = {
    "BR": "https://fbref.com/pt/comps/24/Serie-A-Estatisticas",
    "PL": "https://fbref.com/pt/comps/9/Premier-League-Estatisticas",
    "ES": "https://fbref.com/pt/comps/12/La-Liga-Estatisticas",
    "DE": "https://fbref.com/pt/comps/20/Bundesliga-Estatisticas",
    "IT": "https://fbref.com/pt/comps/11/Serie-A-Estatisticas",
    "PT": "https://fbref.com/pt/comps/32/Primeira-Liga-Estatisticas"
}

def capturar_forma_real():
    dados_totais = []

    for liga_id, url in LIGAS_URLS.items():
        print(f"📡 Raspando {liga_id} via FBref...")
        try:
            headers = {'User-Agent': ua.random}
            response = requests.get(url, headers=headers, timeout=20)
            soup = BeautifulSoup(response.content, 'html.parser')

            # Localiza a tabela de classificação
            tabela = soup.find('table', {'class': 'stats_table'})
            if not tabela:
                print(f"⚠️ Tabela não encontrada para {liga_id}")
                continue

            linhas = tabela.find('tbody').find_all('tr')

            for linha in linhas:
                # Pula linhas de separação (comum em ligas europeias)
                if 'spacer' in linha.get('class', []): continue

                # Extração de dados
                pos = linha.find('th', {'data-stat': 'rank'}).text
                time_nome = linha.find('td', {'data-stat': 'team'}).text.strip()
                jogos = linha.find('td', {'data-stat': 'games'}).text
                sg = linha.find('td', {'data-stat': 'goal_diff'}).text
                pts = linha.find('td', {'data-stat': 'points'}).text
                
                # O PULO DO GATO: Pegar a sequência de vitórias (Forma)
                forma_td = linha.find('td', {'data-stat': 'last_5'})
                forma_texto = ""
                if forma_td:
                    # O FBref coloca cada jogo dentro de um <div> com a letra V, E ou D
                    bolinhas = forma_td.find_all('div')
                    # Traduzindo: W -> V, D -> E, L -> D
                    for b in bolinhas:
                        letra = b.text.strip().upper()
                        if letra == 'W': forma_texto += 'V'
                        elif letra == 'D': forma_texto += 'E'
                        elif letra == 'L': forma_texto += 'D'
                
                # Se a forma vier vazia, coloca padrão
                if not forma_texto: forma_texto = "EEEEE"

                # Escudo: O FBref usa imagens pequenas, pegamos a URL do src
                img_tag = linha.find('td', {'data-stat': 'team'}).find('img')
                escudo_url = img_tag['src'] if img_tag else ""

                dados_totais.append({
                    "liga": liga_id,
                    "posicao": int(pos),
                    "time": time_nome,
                    "escudo": escudo_url,
                    "jogos": int(jogos),
                    "pontos": int(pts),
                    "sg": int(sg),
                    "forma": forma_texto[:5]
                })
                print(f"   ⚽ {time_nome}: {forma_texto[:5]}")

        except Exception as e:
            print(f"❌ Erro na liga {liga_id}: {e}")

    if dados_totais:
        # Limpa e insere no Supabase
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_totais).execute()
        print(f"🚀 {len(dados_totais)} times sincronizados com FORMA REAL!")

if __name__ == "__main__":
    capturar_forma_real()
