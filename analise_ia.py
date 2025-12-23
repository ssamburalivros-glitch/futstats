import os
from google import genai
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# FORÇAR VERSÃO V1 PARA EVITAR O ERRO 404 DA V1BETA
client = genai.Client(api_key=GEMINI_API_KEY, http_options={'api_version': 'v1'})

def gerar_comentario_ia():
    print("📡 Lendo dados para análise...")
    
    try:
        # Busca os líderes de cada liga
        res = supabase.table("tabelas_ligas").select("time, liga, pontos, posicao, sg").order("posicao").limit(40).execute()
        dados = res.data
        
        if not dados:
            print("❌ Sem dados na tabela para analisar.")
            return

        resumo_texto = ""
        for t in dados:
            if t['posicao'] <= 3:
                resumo_texto += f"- {t['time']} ({t['liga']}): {t['pontos']} pts, SG {t['sg']}\n"

        print("🤖 Gerando insight com Gemini 1.5 Flash (v1)...")
        
        prompt = f"""
        Você é um analista de futebol. Escreva um resumo muito curto (máximo 200 caracteres) 
        sobre os líderes atuais destas ligas. Use emojis.
        
        Dados:
        {resumo_texto}
        """

        # Chamada simplificada
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt
        )
        
        comentario = response.text.strip()

        # Atualiza o Supabase
        supabase.table("site_info").update({"comentario_ia": comentario}).eq("id", 1).execute()
        print(f"✅ Análise enviada: {comentario}")

    except Exception as e:
        print(f"❌ Erro Detalhado: {e}")

if __name__ == "__main__":
    gerar_comentario_ia()
