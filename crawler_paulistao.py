import os
import json
import re
import requests
from supabase import create_client

# Configurações do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

URL_GE = "https://ge.globo.com/sp/futebol/campeonato-paulista/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
}

def crawler_classificacao():
    print("🚀 Iniciando busca profunda por dados no GE...")
    try:
        response = requests.get(URL_GE, headers=HEADERS, timeout=30)
        response.raise_for_status()
        html = response.text

        # 1. Tentar encontrar o JSON de classificação usando Expressão Regular
        # O GE armazena os dados em uma variável chamada "classificacao" dentro de um JSON maior
        match = re.search(r'\"classificacao\":\s*(\[.*?\]),\"configuracoes\"', html)
        
        if not match:
            # Segunda tentativa de Regex caso a estrutura mude levemente
            match = re.search(r'\"classificacao\":(\[{\"equipe\":.*?}\])', html)

        if match:
            dados_json = json.loads(match.group(1))
            payload = []

            for item in dados_json:
                equipe = item.get('equipe', {})
                nome = equipe.get('nome_popular') or equipe.get('nome')
                stats = item.get('stats', item) # Em algumas versões o campo é 'stats', em outras é direto na raiz

                if nome:
                    payload.append({
                        "time_nome": nome,
                        "pontos": int(stats.get('pontos', 0)),
                        "jogos": int(stats.get('jogos', 0)),
                        "vitorias": int(stats.get('vitorias', 0)),
                        "empates": int(stats.get('empates', 0)),
                        "derrotas": int(stats.get('derrotas', 0)),
                        "gols_pro": int(stats.get('gols_pro', 0)),
                        "gols_contra": int(stats.get('gols_contra', 0)),
                        "saldo_gols": int(stats.get('saldo_gols', 0))
                    })

            if payload:
                print(f"📤 Enviando {len(payload)} times ao Supabase...")
                supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
                supabase.table("paulistao_classificacao").insert(payload).execute()
                print("✅ Classificação detalhada atualizada!")
                return

        print("❌ Não foi possível encontrar o padrão de dados na página.")

    except Exception as e:
        print(f"❌ Erro crítico: {e}")

if __name__ == "__main__":
    crawler_classificacao()
