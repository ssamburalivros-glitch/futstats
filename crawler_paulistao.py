import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# Configurações do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

URL_CLASS = "https://www.espn.com.br/futebol/classificacao/_/liga/bra.camp.paulista"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def crawler_classificacao():
    print("🚀 Iniciando raspagem COMPLETA da ESPN (Paulistão 2026)...")
    try:
        response = requests.get(URL_CLASS, headers=HEADERS, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # A ESPN divide em: Table--fixed-left (Nomes) e Table__Scroller (Dados)
        tabelas_nomes = soup.select('.Table--fixed-left') 
        tabelas_dados = soup.select('.Table__Scroller')

        if not tabelas_nomes or not tabelas_dados:
            print("⚠️ Erro: Estrutura da ESPN não encontrada.")
            return

        letras = ['A', 'B', 'C', 'D']
        payload = []

        # Itera pelos 4 grupos (A, B, C, D)
        for idx in range(min(len(tabelas_nomes), 4)):
            rows_nomes = tabelas_nomes[idx].find_all("tr")[1:] # Pula cabeçalho
            rows_dados = tabelas_dados[idx].find_all("tr")[1:]

            for i in range(len(rows_nomes)):
                try:
                    # 1. Nome do Time
                    nome_container = rows_nomes[i].find("span", class_="hide-mobile")
                    nome = nome_container.text.strip() if nome_container else rows_nomes[i].text.strip()
                    
                    # 2. Logo
                    img_tag = rows_nomes[i].find("img")
                    logo = img_tag.get("src", "") if img_tag else ""

                    # 3. Dados Numéricos (Colunas da ESPN)
                    cols = rows_dados[i].find_all("td")
                    # Mapeamento ESPN: 0:J, 1:V, 2:E, 3:D, 4:GP, 5:GC, 6:SG, 7:PTS
                    
                    payload.append({
                        "grupo": f"Grupo {letras[idx]}",
                        "time_nome": nome,
                        "time_logo": logo,
                        "jogos": int(cols[0].text.strip()),
                        "vitorias": int(cols[1].text.strip()),
                        "empates": int(cols[2].text.strip()),
                        "derrotas": int(cols[3].text.strip()),
                        "gols_pro": int(cols[4].text.strip()),
                        "gols_contra": int(cols[5].text.strip()),
                        "saldo_gols": int(cols[6].text.strip().replace('+', '')),
                        "pontos": int(cols[7].text.strip())
                    })
                except Exception as e:
                    print(f"⚠️ Erro no Grupo {letras[idx]}, linha {i}: {e}")

        if payload:
            print(f"📤 Enviando {len(payload)} times detalhados para o Supabase...")
            # Limpa e insere
            supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
            supabase.table("paulistao_classificacao").insert(payload).execute()
            print("✅ Sucesso! Classificação completa atualizada.")
        else:
            print("❌ Nenhum dado processado.")

    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    crawler_classificacao()
