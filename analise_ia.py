import os
import requests
import json
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def gerar_comentario_ia():
    # 1. Pegar apenas o TOP 1 de cada liga principal para economizar tokens
    print("📡 Lendo líderes...")
    res = supabase.table("tabelas_ligas").select("time, liga, pontos").order("posicao").limit(10).execute()
    dados = res.data
    if not dados: return
    
    resumo = ", ".join([f"{t['time']} lidera a {t['liga']} ({t['pontos']} pts)" for t in dados if t['posicao'] == 1])

    # 2. Forçar o modelo FLASH (mais barato/estável)
    # A URL correta para o Flash que raramente dá 429:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{"parts": [{"text": f"Resuma o destaque das ligas em 1 frase curta com emojis: {resumo}"}]}],
        "generationConfig": {"maxOutputTokens": 100} # Economia máxima
    }
    
    print(f"🤖 Solicitando análise ao Gemini Flash...")
    response = requests.post(url, headers={'Content-Type': 'application/json'}, data=json.dumps(payload))
    
    if response.status_code == 200:
        texto = response.json()['candidates'][0]['content']['parts'][0]['text'].strip()
        supabase.table("site_info").update({"comentario_ia": texto}).eq("id", 1).execute()
        print(f"✅ Sucesso: {texto}")
    else:
        print(f"⚠️ Erro de Cota ou API. Aguardando reset do Google...")
        # Se falhar, o site continuará mostrando o último comentário salvo.
