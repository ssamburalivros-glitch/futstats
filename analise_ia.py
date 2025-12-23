import os
import requests
import json
from supabase import create_client

url_supa = os.environ.get("SUPABASE_URL")
key_supa = os.environ.get("SUPABASE_KEY")
gemini_key = os.environ.get("GEMINI_API_KEY")

def rodar():
    print("--- INICIANDO PROCESSO IA (VERSÃO ESTÁVEL V1) ---")
    
    try:
        supabase = create_client(url_supa, key_supa)
        
        print("📡 Buscando dados...")
        res = supabase.table("tabelas_ligas").select("time, pontos").limit(5).execute()
        texto_dados = ", ".join([f"{t['time']} ({t['pontos']}pts)" for t in res.data])
        
        # MUDANÇA AQUI: v1 em vez de v1beta
        print("🤖 Chamando Gemini 1.5 Flash (v1)...")
        url_ia = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={gemini_key}"
        
        payload = {
            "contents": [{
                "parts": [{"text": f"Escreva uma frase de 15 palavras com emojis sobre o topo do Brasileirão: {texto_dados}"}]
            }],
            "generationConfig": {
                "maxOutputTokens": 100
            }
        }

        response = requests.post(url_ia, json=payload, timeout=30)
        resultado = response.json()
        
        if response.status_code == 200:
            comentario = resultado['candidates'][0]['content']['parts'][0]['text'].strip()
            print(f"✍️ IA diz: {comentario}")
            
            # Salva no banco
            supabase.table("site_info").update({"comentario_ia": comentario}).eq("id", 1).execute()
            print("💾 Salvo no Banco de Dados com sucesso!")
        else:
            print(f"❌ Erro na API: {response.status_code}")
            print(f"Mensagem: {json.dumps(resultado, indent=2)}")

    except Exception as e:
        print(f"💥 ERRO: {str(e)}")

if __name__ == "__main__":
    rodar()
