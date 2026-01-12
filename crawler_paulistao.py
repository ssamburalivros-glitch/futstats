import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# Configurações do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# URL específica de classificação solicitada
URL_CLASS = "https://www.espn.com.br/futebol/classificacao/_/liga/bra.camp.paulista"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def crawler_classificacao():
    print("🚀 Iniciando raspagem da classificação Paulistão 2026...")
    try:
        response = requests.get(URL_CLASS, headers=HEADERS)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # Na ESPN, a classificação é dividida em blocos de tabelas
        # Cada grupo (A, B, C, D) costuma ser uma div ou seção separada
        grupos_html = soup.find_all("div", class_="responsive-table-container")
        letras = ['A', 'B', 'C', 'D']
        payload = []

        for idx, bloco in enumerate(grupos_html[:4]):
            # Pega os nomes dos times (coluna da esquerda)
            nomes_col = bloco.find("table", class_="Table--fixed-left")
            times_nomes = nomes_col.find_all("tr")[1:] # Pula o topo

            # Pega os dados (coluna da direita: pontos, jogos, etc)
            dados_col = bloco.find("div", class_="Table__Scroller").find("table")
            times_dados = dados_col.find_all("tr")[1:]

            for i in range(len(times_nomes)):
                nome = times_nomes[i].find("span", class_="hide-mobile").text.strip()
                logo = times_nomes[i].find("img")["src"] if times_nomes[i].find("img") else ""
                
                # Na tabela de classificação da ESPN:
                # td[0] = Jogos (J), td[1] = Vitórias, ..., td[7] = Pontos (PTS)
                cols = times_dados[i].find_all("td")
                jogos = cols[0].text.strip()
                pontos = cols[7].text.strip()

                payload.append({
                    "grupo": f"Grupo {letras[idx]}",
                    "time_nome": nome,
                    "time_logo": logo,
                    "pontos": int(pontos) if pontos.isdigit() else 0,
                    "jogos": int(jogos) if jogos.isdigit() else 0
                })

        if payload:
            # Limpa e insere os novos dados de classificação
            supabase.table("paulistao_classificacao").delete().neq("grupo", "vazio").execute()
            supabase.table("paulistao_classificacao").insert(payload).execute()
            print(f"✅ Sucesso! {len(payload)} times atualizados no Supabase.")
        else:
            print("⚠️ Nenhum dado encontrado. Verifique os seletores.")

    except Exception as e:
        print(f"❌ Erro crítico: {e}")

if __name__ == "__main__":
    crawler_classificacao()
