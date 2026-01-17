import os
import requests
from supabase import create_client

# Configurações do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# URL da API do Globo Esporte (Fase única Paulista 2026)
# Este ID é o identificador da competição no sistema da Globo
URL_API = "https://api.globoesporte.globo.com/tabela/d1a3b471-f923-4469-9f6a-68695d3e090a/fase/fase-unica-paulista-2026/classificacao/"

def crawler_classificacao():
    print("🚀 Acessando API do Globo Esporte...")
    try:
        # O GE exige um User-Agent para não bloquear a requisição
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        
        response = requests.get(URL_API, headers=headers, timeout=20)
        response.raise_for_status()
        dados_ge = response.json()

        payload = []

        # Percorre a lista de times retornada pela API
        for item in dados_ge:
            nome = item['equipe']['nome_popular']
            stats = item['stats']

            payload.append({
                "time_nome": nome,
                "pontos": int(stats['pontos']),
                "jogos": int(stats['jogos']),
                "vitorias": int(stats['vitorias']),
                "empates": int(stats['empates']),
                "derrotas": int(stats['derrotas']),
                "gols_pro": int(stats['gols_pro']),
                "gols_contra": int(stats['gols_contra']),
                "saldo_gols": int(stats['saldo_gols'])
            })

        if payload:
            print(f"📤 Atualizando {len(payload)} times no Supabase...")
            # Limpa a tabela e insere os novos dados
            supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
            supabase.table("paulistao_classificacao").insert(payload).execute()
            print("✅ Classificação detalhada atualizada com sucesso via API GE!")
        else:
            print("❌ API retornou lista vazia.")

    except Exception as e:
        print(f"❌ Erro ao processar API: {e}")

if __name__ == "__main__":
    crawler_classificacao()
