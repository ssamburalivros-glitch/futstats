import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# Configurações do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# URL do Sr. Goool - Classificação Geral (Contém todos os dados detalhados)
URL_CLASS = "https://www.srgoool.com.br/classificacao/Paulistao/Serie-A1/2026#classificacao-geral"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def crawler_classificacao():
    print("🚀 Iniciando raspagem detalhada via Sr. Goool...")
    try:
        response = requests.get(URL_CLASS, headers=HEADERS, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # Tenta encontrar a tabela pela classe específica
        tabela = soup.find("table", class_="table-classificacao")
        
        # Se não encontrar pela classe, tenta buscar a tabela que contém "PTS" no cabeçalho
        if not tabela:
            for t in soup.find_all("table"):
                if "PTS" in t.text:
                    tabela = t
                    break

        if not tabela:
            print("⚠️ Erro: Estrutura de tabela não encontrada no Sr. Goool.")
            # Opcional: imprimir o soup.text para depurar se o site bloqueou o crawler
            return

        # No Sr. Goool, as linhas de dados costumam ter a classe 'linha-par' ou 'linha-impar'
        # ou simplesmente estão no tbody
        rows = tabela.select("tbody tr")
        payload = []

        for i, row in enumerate(rows):
            cols = row.find_all("td")
            
            # Filtro para ignorar linhas de propaganda ou cabeçalhos repetidos
            # A tabela real tem pelo menos 10 colunas
            if len(cols) >= 10:
                try:
                    # O nome do time geralmente está no 3º td (índice 2)
                    nome = cols[2].text.strip()
                    if not nome: continue 

                    # Dados numéricos conforme a ordem do Sr. Goool
                    # P J V E D GP GC SG
                    pontos      = cols[3].text.strip()
                    jogos       = cols[4].text.strip()
                    vitorias    = cols[5].text.strip()
                    empates     = cols[6].text.strip()
                    derrotas    = cols[7].text.strip()
                    gols_pro    = cols[8].text.strip()
                    gols_contra = cols[9].text.strip()
                    # O saldo às vezes está em cols[10] ou cols[11]
                    saldo_gols  = cols[10].text.strip()

                    payload.append({
                        "time_nome": nome,
                        "pontos": int(pontos) if pontos.isdigit() else 0,
                        "jogos": int(jogos) if jogos.isdigit() else 0,
                        "vitorias": int(vitorias) if vitorias.isdigit() else 0,
                        "empates": int(empates) if empates.isdigit() else 0,
                        "derrotas": int(derrotas) if derrotas.isdigit() else 0,
                        "gols_pro": int(gols_pro) if gols_pro.isdigit() else 0,
                        "gols_contra": int(gols_contra) if gols_contra.isdigit() else 0,
                        "saldo_gols": int(saldo_gols.replace('+', '')) if saldo_gols.replace('-', '').replace('+', '').isdigit() else 0
                    })
                except Exception as e:
                    continue # Pula linhas de propaganda ou erros de conversão

        if payload:
            print(f"📤 Atualizando {len(payload)} times no Supabase...")
            supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
            supabase.table("paulistao_classificacao").insert(payload).execute()
            print("✅ Sucesso!")
        else:
            print("❌ Tabela encontrada, mas nenhum dado foi extraído. Verifique os índices.")

    except Exception as e:
        print(f"❌ Erro na requisição: {e}")
if __name__ == "__main__":
    crawler_classificacao()
