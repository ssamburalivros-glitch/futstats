import os
import time
from groq import Groq
from supabase import create_client, Client

# --- CONFIGURAÇÕES ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
client = Groq(api_key=GROQ_API_KEY)

def gerar_analise_ia():
    print("--- INICIANDO ANALISE NEURAL (GROQ) ---")
    
    # 1. Buscar dados dos jogos ao vivo para dar contexto à IA
    response = supabase.table("jogos_ao_vivo").select("*").execute()
    jogos = response.data
    
    contexto = "Nenhum jogo ao vivo no momento."
    if jogos:
        lista_jogos = [f"{j['time_casa']} {j['placar']} {j['time_fora']} ({j['status']})" for j in jogos]
        contexto = "Jogos rolando agora: " + ", ".join(lista_jogos)

    # 2. Prompt para o Llama 3 (Personalidade Cyberpunk)
    prompt_system = """
    Você é uma IA analista de futebol futurista chamada 'FutStats Neural'.
    Seu tom é técnico, breve e 'cyberpunk'.
    Analise o contexto dos jogos atuais. Se não houver jogos, fale sobre a expectativa da rodada.
    MÁXIMO DE 2 FRASES. Use emojis futuristas.
    Não use introduções como 'Aqui está a análise'. Vá direto ao ponto.
    """

    try:
        # 3. Chamada à API da Groq (Llama 3)
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": f"Contexto atual: {contexto}"}
            ],
            model="llama-3.3-70b-versatile", # Modelo muito rápido e eficiente
            temperature=0.7,
        )

        comentario = chat_completion.choices[0].message.content
        print(f"IA Gerou: {comentario}")

        # 4. Salvar no Supabase
        # Certifique-se de ter uma tabela 'site_info' com id=1 e coluna 'comentario_ia'
        data = {"comentario_ia": comentario}
        supabase.table("site_info").update(data).eq("id", 1).execute()
        print("Sucesso: Análise enviada ao Database.")

    except Exception as e:
        print(f"Erro na Groq: {e}")

if __name__ == "__main__":
    gerar_analise_ia()
