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
        tabelas_nomes = soup.select('.Table--fixed-left') 
        tabelas_dados = soup.select('.Table__Scroller')

        if not tabelas_nomes:
            print("⚠️ Erro: Estrutura de tabela não encontrada.")
            return

        letras = ['A', 'B', 'C', 'D']
        payload = []

        # Itera sobre os grupos
        for idx in range(min(len(tabelas_nomes), 4)):
            rows_nomes = tabelas_nomes[idx].find_all("tr")[1:] # Pula cabeçalho
            rows_dados = tabelas_dados[idx].find_all("tr")[1:]

            for i in range(len(rows_nomes)):
                try:
                    # 1. Captura o nome do time
                    nome_container = rows_nomes[i].find("span", class_="hide-mobile")
                    nome = nome_container.text.strip() if nome_container else rows_nomes[i].text.strip()
                    
                    # 2. Captura o LOGO com correção para imagens dinâmicas
                    img_tag = rows_nomes[i].find("img")
                    logo = ""
                    if img_tag:
                        # Tenta pegar o src normal
                        logo = img_tag.get("src", "")
                        
                        # CORREÇÃO CRÍTICA: Se for base64 ou placeholder, busca no data-src
                        if "data:image" in logo or "transparent" in logo or not logo:
                            logo = img_tag.get("data-src") or img_tag.get("data-lazy-src") or logo

                    # 3. Captura os dados numéricos (J, PTS)
                    cols = rows_dados[i].find_all("td")
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
            
            # Limpa e insere usando o filtro gt(id, 0) para garantir a limpeza
            try:
                # Se sua tabela não tiver 'id', use neq('time_nome', 'null')
                supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
                supabase.table("paulistao_classificacao").insert(payload).execute()
                print("✅ Atualização de classificação concluída!")
            except Exception as sb_err:
                print(f"❌ Erro ao salvar no Supabase: {sb_err}")
        else:
            print("❌ Nenhum dado foi processado.")

    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    crawler_classificacao()
