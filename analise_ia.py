import os
import google.generativeai as genai
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

def gerar_comentario_ia():
    print("📡 Lendo dados para análise...")
    
    # Busca os 3 primeiros de cada liga para dar contexto à IA
    res = supabase.table("tabelas_ligas").select("time, liga, pontos, posicao, sg").order("posicao").limit(40).execute()
    dados = res.data
    
    if not dados:
        print("❌ Sem dados na tabela para analisar.")
        return

    # Organiza os dados para o Prompt
    resumo_texto = ""
    for t in dados:
        if t['posicao'] <= 3: # Foca nos líderes
            resumo_texto += f"- {t['time']} ({t['liga']}): {t['pontos']} pts, SG {t['sg']}\n"

    # --- PROMPT PARA A IA ---
    prompt = f"""
    És um analista de futebol profissional e direto. 
    Com base nestes dados de classificação atuais, escreve um parágrafo curto (máximo 250 caracteres) 
    fazendo um resumo rápido de quem está melhor nas principais ligas (BR, PL, ES, IT, DE, PT).
    Seja dinâmico e use emojis de futebol.
    
    Dados atuais:
    {resumo_texto}
    """

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        comentario = response.text.strip()

        # --- ATUALIZA O SUPABASE ---
        # Usamos o ID 1 que criamos manualmente na tabela site_info
        supabase.table("site_info").update({"comentario_ia": comentario}).eq("id", 1).execute()
        print(f"✅ Análise gerada: {comentario}")

    except Exception as e:
        print(f"❌ Erro ao gerar análise: {e}")

if __name__ == "__main__":
    gerar_comentario_ia()
