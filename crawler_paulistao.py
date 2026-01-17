import os
import json
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# Configurações do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

URL_GE = "https://ge.globo.com/sp/futebol/campeonato-paulista/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def crawler_classificacao():
    print("🚀 Iniciando raspagem via ScriptTag no GE...")
    try:
        response = requests.get(URL_GE, headers=HEADERS, timeout=20)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # O GE guarda os dados da tabela dentro de uma tag <script id="scriptTag">
        script_tag = soup.find("script", {"id": "scriptTag"})
        if not script_tag:
            print("❌ Erro: Tag de dados não encontrada.")
            return

        # Transformamos o texto do script em um dicionário Python (JSON)
        dados_full = json.loads(script_tag.string)
        
        # Navegamos no JSON para chegar na classificação
        # A estrutura costuma ser: lista_classificacao
        classificacao = dados_full.get('classificacao', [])

        payload = []

        for item in classificacao:
            # Extração segura dos dados
            nome = item.get('nome_popular')
            # No JSON do script, os stats ficam direto no objeto ou em 'ordem'
            stats = item.get('estatisticas', {})

            payload.append({
                "time_nome": nome,
                "pontos": int(item.get('pontos', 0)),
                "jogos": int(item.get('jogos', 0)),
                "vitorias": int(item.get('vitorias', 0)),
                "empates": int(item.get('empates', 0)),
                "derrotas": int(item.get('derrotas', 0)),
                "gols_pro": int(item.get('gols_pro', 0)),
                "gols_contra": int(item.get('gols_contra', 0)),
                "saldo_gols": int(item.get('saldo_gols', 0))
            })

        if payload:
            print(f"📤 Atualizando {len(payload)} times no Supabase...")
            # Limpa e insere
            supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
            supabase.table("paulistao_classificacao").insert(payload).execute()
            print("✅ Classificação detalhada atualizada com sucesso!")
        else:
            print("❌ Dados não encontrados dentro da ScriptTag.")

    except Exception as e:
        print(f"❌ Erro crítico: {e}")

if __name__ == "__main__":
    crawler_classificacao()
