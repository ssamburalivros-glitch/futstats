import os
import requests
import json
from supabase import create_client

# Pega as variáveis do GitHub
url_supa = os.environ.get("SUPABASE_URL")
key_supa = os.environ.get("SUPABASE_KEY")
gemini_key = os.environ.get("GEMINI_API_KEY")

def rodar():
    print("--- INICIANDO PROCESSO IA ---")
    
    try:
        # 1. Conecta ao Supabase
        supabase = create_client(url_supa, key_supa)
        
        # 2. Busca dados da tabela (Ajuste o nome se sua tabela for diferente)
        print("📡 Buscando dados...")
        res = supabase.table("tabelas_ligas").select("time, pontos").limit(5).execute()
        
        texto_dados = "Times: " + ", ".join([f"{t['time']} ({t['pontos']}pts)" for t in res.data])
        print(f"✅ Dados encontrados: {texto_dados}")

        # 3. Chama o Gemini via URL Direta (Mais estável)
        print("🤖 Chamando Gemini...")
        url_ia = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        
        payload = {
            "contents": [{
                "parts": [{"text": f"Escreva uma frase curta sobre estes times: {texto_dados}"}]
            }]
        }

        response = requests.post(url_ia, json=payload, timeout=30)
        
        if response.status_code == 200:
            comentario = response.json()['candidates'][0]['content']['parts'][0]['text'].strip()
            print(f"✍️ IA diz: {comentario}")
            
            # 4. Salva no Supabase (ID 1 deve existir!)
            supabase.table("site_info").update({"comentario_ia": comentario}).eq("id", 1).execute()
            print("💾 Salvo no Banco de Dados!")
        else:
            print(f"❌ Erro na IA: {response.text}")

    except Exception as e:
        print(f"💥 ERRO CRÍTICO: {str(e)}")

if __name__ == "__main__":
    rodar()
