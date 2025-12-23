import os
import google.generativeai as genai
from supabase import create_client

# Configurações
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_KEY"])
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

def gerar_resumo():
    # 1. Pega os dados da tabela (apenas os top 5 de cada liga para economizar)
    res = supabase.table("tabelas_ligas").select("*").order("posicao").limit(30).execute()
    dados = res.data

    # 2. Prepara o texto para a IA
    resumo_tabela = ""
    for t in dados:
        resumo_tabela += f"{t['time']} ({t['liga']}): {t['pontos']} pts, SG: {t['sg']}\n"

    prompt = f"""
    Você é um comentarista de futebol sarcástico e inteligente. 
    Analise estes dados da tabela e escreva um parágrafo curto (máximo 3 linhas) 
    sobre quem está dominando e quem está passando vergonha. 
    Dados:\n{resumo_tabela}
    """

    # 3. Chama a IA
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content(prompt)
    texto_ia = response.text

    # 4. Salva no Supabase (em uma tabela chamada 'configuracoes' ou 'analise')
    supabase.table("site_info").upsert({"id": 1, "comentario_ia": texto_ia}).execute()
    print("🤖 IA: Análise gerada com sucesso!")

if __name__ == "__main__":
    gerar_resumo()
