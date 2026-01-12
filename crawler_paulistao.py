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
    print("🚀 Iniciando raspagem da classificação Paulistão 2026...")
    try:
        response = requests.get(URL_CLASS, headers=HEADERS, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # Localiza todas as tabelas de grupos
        # A ESPN agrupa em 'stack' de tabelas para mobile/desktop
        tabelas_nomes = soup.select('.Table--fixed-left') 
        tabelas_dados = soup.select('.Table__Scroller')

        if not tabelas_nomes:
            print("⚠️ Erro: Estrutura de tabela não encontrada. Verifique se a URL mudou.")
            return

        letras = ['A', 'B', 'C', 'D']
        payload = []

        # Itera sobre os 4 grupos do Paulistão
        for idx in range(min(len(tabelas_nomes), 4)):
            rows_nomes = tabelas_nomes[idx].find_all("tr")[1:] # Pula o cabeçalho
            rows_dados = tabelas_dados[idx].find_all("tr")[1:]

            for i in range(len(rows_nomes)):
                try:
                    # Captura o nome e logo
                    nome_container = rows_nomes[i].find("span", class_="hide-mobile")
                    nome = nome_container.text.strip() if nome_container else rows_nomes[i].text.strip()
                    
                    img_tag = rows_nomes[i].find("img")
                    logo = img_tag["src"] if img_tag else ""

                    # Captura os dados numéricos
                    cols = rows_dados[i].find_all("td")
                    # Na ESPN: 0=J, 1=V, 2=E, 3=D, 4=GP, 5=GC, 6=SG, 7=PTS
                    jogos = cols[0].text.strip()
                    pontos = cols[7].text.strip()

                    payload.append({
                        "grupo": f"Grupo {letras[idx]}",
                        "time_nome": nome,
                        "time_logo": logo,
                        "pontos": int(pontos) if pontos.isdigit() else 0,
                        "jogos": int(jogos) if jogos.isdigit() else 0
                    })
                except Exception as e:
                    print(f"⚠️ Erro na linha {i} do Grupo {letras[idx]}: {e}")

        if payload:
            print(f"📤 Enviando {len(payload)} times para o Supabase...")
            # Limpeza rápida e inserção
            supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
            supabase.table("paulistao_classificacao").insert(payload).execute()
            print("✅ Atualização concluída com sucesso!")
        else:
            print("❌ Falha crítica: Nenhum dado foi processado.")

    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    crawler_classificacao()
