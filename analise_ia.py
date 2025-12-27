import os
from groq import Groq
from supabase import create_client, Client

# --- CONFIGURAÇÕES ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = Groq(api_key=GROQ_API_KEY)

def gerar_analise_ia():
    print("--- INICIANDO ANALISE NEURAL (GROQ 2025) ---")
    
    try:
        # 1. Buscar dados dos jogos ao vivo
        response = supabase.table("jogos_ao_vivo").select("*").execute()
        jogos = response.data
        
        contexto = "Sem jogos em tempo real."
        if jogos:
            lista_jogos = [f"{j['time_casa']} {j['placar']} {j['time_fora']} ({j['status']})" for j in jogos]
            contexto = "Rodada atual: " + ", ".join(lista_jogos)

        # 2. Prompt Otimizado
        prompt_system = "Você é o núcleo neural do FutStats. Analise os dados e dê um insight curto (180 chars) e cyberpunk."

        # 3. Chamada com Modelo Novo (CORRIGIDO)
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": f"Dados: {contexto}"}
            ],
            model="llama-3.3-70b-versatile", # Este modelo está ativo em 2025
            temperature=0.7,
            max_tokens=100
        )

        comentario = chat_completion.choices[0].message.content.strip()
        print(f"IA gerou: {comentario}")

        # 4. Salvar no Supabase
        supabase.table("site_info").update({"comentario_ia": comentario}).eq("id", 1).execute()
        print("✅ Dados enviados com sucesso.")

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    gerar_analise_ia()
