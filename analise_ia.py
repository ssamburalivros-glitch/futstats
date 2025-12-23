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
        # 1. Busca os líderes das ligas
        res = supabase.table("tabelas_ligas").select("time, liga, pontos, posicao, sg").order("posicao").limit(40).execute()
        dados = res.data
        
        if not dados:
            print("❌ Sem dados na tabela.")
            return

        resumo_texto = ""
        for t in dados:
            if t['posicao'] <= 3:
                resumo_texto += f"- {t['time']} ({t['liga']}): {t['pontos']} pts, SG {t['sg']}\n"

        print("🤖 Chamando Gemini via REST API...")

        # 2. Configura a chamada direta ao Google
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": f"Você é um analista de futebol. Resuma os líderes das ligas (máximo 200 caracteres) com emojis. Dados:\n{resumo_texto}"
                }]
            }]
        }
        headers = {'Content-Type': 'application/json'}

        # 3. Faz a requisição
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        resultado = response.json()

        if response.status_code == 200:
            texto_ia = resultado['candidates'][0]['content']['parts'][0]['text'].strip()
            
            # 4. Atualiza o Supabase
            supabase.table("site_info").update({"comentario_ia": texto_ia}).eq("id", 1).execute()
            print(f"✅ Sucesso: {texto_ia}")
        else:
            print(f"❌ Erro na API do Google: {resultado}")

    except Exception as e:
        print(f"❌ Erro Geral: {e}")

if __name__ == "__main__":
    gerar_comentario_ia()
