import os
import requests
import json
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def gerar_comentario_ia():
    print("📡 Lendo dados do Supabase...")
    try:
        res = supabase.table("tabelas_ligas").select("time, liga, pontos, posicao").order("posicao").limit(30).execute()
        dados = res.data
        if not dados: return
        
        resumo = "\n".join([f"{t['time']} ({t['liga']}): {t['pontos']} pts" for t in dados if t['posicao'] <= 3])

        # 1. Tenta descobrir quais modelos você pode usar
        print("🔍 Verificando modelos disponíveis na sua chave...")
        list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_API_KEY}"
        list_res = requests.get(list_url).json()
        
        # Filtra modelos que suportam geração de conteúdo
        modelos_validos = [m['name'] for m in list_res.get('models', []) if 'generateContent' in m.get('supportedGenerationMethods', [])]
        
        if not modelos_validos:
            print("❌ Nenhum modelo encontrado para esta chave. Verifique o Google AI Studio.")
            return

        # Prioriza Flash, depois Pro, depois o primeiro da lista
        modelo_escolhido = next((m for m in modelos_validos if "gemini-1.5-flash" in m), 
                               next((m for m in modelos_validos if "gemini-pro" in m), modelos_validos[0]))
        
        print(f"🤖 Usando modelo: {modelo_escolhido}")

        # 2. Chama a API com o modelo correto
        gen_url = f"https://generativelanguage.googleapis.com/v1beta/{modelo_escolhido}:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [{"parts": [{"text": f"Resuma os líderes em 1 frase curta com emojis:\n{resumo}"}]}]
        }
        
        response = requests.post(gen_url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload))
        resultado = response.json()

        if response.status_code == 200:
            texto = resultado['candidates'][0]['content']['parts'][0]['text'].strip()
            supabase.table("site_info").update({"comentario_ia": texto}).eq("id", 1).execute()
            print(f"✅ Sucesso: {texto}")
        else:
            print(f"❌ Erro final: {resultado}")

    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    gerar_comentario_ia()
