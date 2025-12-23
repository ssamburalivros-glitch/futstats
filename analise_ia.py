import os
import requests
import json
from supabase import create_client

url_supa = os.environ.get("SUPABASE_URL")
key_supa = os.environ.get("SUPABASE_KEY")
gemini_key = os.environ.get("GEMINI_API_KEY")

def rodar():
    print("--- INICIANDO PROCESSO IA (MÉTODO COMPATIBILIDADE TOTAL) ---")
    
    try:
        supabase = create_client(url_supa, key_supa)
        
        print("📡 Buscando dados...")
        res = supabase.table("tabelas_ligas").select("time, pontos").limit(5).execute()
        texto_dados = ", ".join([f"{t['time']} ({t['pontos']}pts)" for t in res.data])
        
        # MUDANÇA: Usando GEMINI-PRO na versão V1 (Mais compatível com chaves antigas e novas)
        print("🤖 Chamando Gemini Pro...")
        url_ia = f"https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key={gemini_key}"
        
        payload = {
            "contents": [{
                "parts": [{"text": f"Resuma em uma frase curta com emojis a situação desses times: {texto_dados}"}]
            }]
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
            # Se o Pro falhar, tentamos uma última URL alternativa automática
            print(f"❌ Erro 404 no Pro, tentando rota alternativa...")
            url_alt = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={gemini_key}"
            response = requests.post(url_alt, json=payload, timeout=30)
            
            if response.status_code == 200:
                comentario = response.json()['candidates'][0]['content']['parts'][0]['text'].strip()
                supabase.table("site_info").update({"comentario_ia": comentario}).eq("id", 1).execute()
                print("💾 Salvo via rota alternativa!")
            else:
                print(f"❌ Falha total: {response.text}")

    except Exception as e:
        print(f"💥 ERRO: {str(e)}")

if __name__ == "__main__":
    rodar()
