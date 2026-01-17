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

        # No Sr. Goool, a tabela principal tem a classe 'table-classificacao'
        tabela = soup.find("table", class_="table-classificacao")
        if not tabela:
            print("⚠️ Erro: Tabela de classificação não encontrada.")
            return

        rows = tabela.find("tbody").find_all("tr")
        payload = []

        for i, row in enumerate(rows):
            cols = row.find_all("td")
            
            # O Sr. Goool tem colunas extras de propaganda, filtramos por tamanho
            if len(cols) >= 11:
                try:
                    # Mapeamento das Colunas Sr. Goool:
                    # 0: Pos, 1: Escudo, 2: Nome, 3: PTS, 4: J, 5: V, 6: E, 7: D, 8: GP, 9: GC, 10: SG
                    nome = cols[2].text.strip()
                    
                    # Captura do Logo
                    img_tag = cols[1].find("img")
                    logo = img_tag.get("src", "") if img_tag else ""

                    # Dados Numéricos
                    pontos     = cols[3].text.strip()
                    jogos      = cols[4].text.strip()
                    vitorias   = cols[5].text.strip()
                    empates    = cols[6].text.strip()
                    derrotas   = cols[7].text.strip()
                    gols_pro   = cols[8].text.strip()
                    gols_contra = cols[9].text.strip()
                    saldo_gols = cols[10].text.strip()

                    payload.append({
                        "time_nome": nome,
                        "time_logo": logo,
                        "pontos": int(pontos) if pontos.replace('-','').isdigit() else 0,
                        "jogos": int(jogos) if jogos.isdigit() else 0,
                        "vitorias": int(vitorias) if vitorias.isdigit() else 0,
                        "empates": int(empates) if empates.isdigit() else 0,
                        "derrotas": int(derrotas) if derrotas.isdigit() else 0,
                        "gols_pro": int(gols_pro) if gols_pro.isdigit() else 0,
                        "gols_contra": int(gols_contra) if gols_contra.isdigit() else 0,
                        "saldo_gols": int(saldo_gols) if saldo_gols.replace('-','').isdigit() else 0
                    })
                except Exception as e:
                    print(f"⚠️ Erro ao processar linha {i}: {e}")

        if payload:
            print(f"📤 Atualizando {len(payload)} times no Supabase...")
            try:
                # Limpa a tabela antes de inserir os novos dados detalhados
                supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
                supabase.table("paulistao_classificacao").insert(payload).execute()
                print("✅ Classificação detalhada atualizada com sucesso!")
            except Exception as sb_err:
                print(f"❌ Erro ao salvar no Supabase: {sb_err}")
        else:
            print("❌ Nenhum dado extraído.")

    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    crawler_classificacao()
