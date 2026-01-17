import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# Configurações do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# URL estável do GE (Classificação Paulistão)
URL_CLASS = "https://ge.globo.com/sp/futebol/campeonato-paulista/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def crawler_classificacao():
    print("🚀 Iniciando raspagem detalhada via Globo Esporte...")
    try:
        response = requests.get(URL_CLASS, headers=HEADERS, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # No GE, os nomes ficam em uma tabela e os dados em outra (lado a lado)
        nomes_times = soup.select('.classificacao__equipe--nome')
        linhas_dados = soup.select('.classificacao__tabela--linha')

        payload = []

        if not nomes_times:
            print("⚠️ Erro: Não foi possível encontrar os times na página.")
            return

        for i, nome_tag in enumerate(nomes_times):
            nome = nome_tag.text.strip()
            
            # O GE separa os dados em colunas dentro da linha
            # Ordem padrão: PTS | J | V | E | D | GP | GC | SG | % | Recentes
            cols = linhas_dados[i].find_all("td")
            
            if len(cols) >= 8:
                pontos      = cols[0].text.strip()
                jogos       = cols[1].text.strip()
                vitorias    = cols[2].text.strip()
                empates     = cols[3].text.strip()
                derrotas    = cols[4].text.strip()
                gols_pro    = cols[5].text.strip()
                gols_contra = cols[6].text.strip()
                saldo_gols  = cols[7].text.strip()

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

        if payload:
            print(f"📤 Atualizando {len(payload)} times no Supabase...")
            # Limpa e Insere
            supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
            supabase.table("paulistao_classificacao").insert(payload).execute()
            print("✅ Classificação detalhada atualizada com sucesso via GE!")
        else:
            print("❌ Dados não processados.")

    except Exception as e:
        print(f"❌ Erro na requisição: {e}")

if __name__ == "__main__":
    crawler_classificacao()
