import os
import time
import random
from requests_html import HTMLSession
from bs4 import BeautifulSoup
from supabase import create_client
from fake_useragent import UserAgent

# --- BLOCO DE DIAGNÓSTICO (Para encontrar o erro) ---
URL_ENV = os.environ.get("https://vqocdowjdutfzmnvxqvz.supabase.co")
KEY_ENV = os.environ.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb2Nkb3dqZHV0ZnptbnZ4cXZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIzNjQzNCwiZXhwIjoyMDgxODEyNDM0fQ.GlJ_-kh2u7qsLMRgB5jVpvduhIG0yyY9AZ9rU_mEqcE")

print("--- DIAGNÓSTICO DE AMBIENTE ---")
if URL_ENV:
    print(f"✅ SUPABASE_URL: Detectada (Inicia com: {URL_ENV[:10]}...)")
else:
    print("❌ SUPABASE_URL: NÃO ENCONTRADA")

if KEY_ENV:
    print(f"✅ SUPABASE_KEY: Detectada (Tamanho: {len(KEY_ENV)} caracteres)")
else:
    print("❌ SUPABASE_KEY: NÃO ENCONTRADA")
print("-------------------------------")

if not URL_ENV or not KEY_ENV:
    exit(1)

# Inicialização do Cliente
supabase = create_client(URL_ENV, KEY_ENV)
ua = UserAgent()

FBREF_URLS = {
    "BR": "https://fbref.com/en/comps/24/Serie-A-Stats",
    "PL": "https://fbref.com/en/comps/9/Premier-League-Stats",
    "ES": "https://fbref.com/en/comps/12/La-Liga-Stats",
    "DE": "https://fbref.com/en/comps/20/Bundesliga-Stats",
    "IT": "https://fbref.com/en/comps/11/Serie-A-Stats",
    "PT": "https://fbref.com/en/comps/37/Primeira-Liga-Stats"
}

def get_tabela(liga_key, url):
    session = HTMLSession()
    headers = {'User-Agent': ua.random}
    try:
        print(f"📡 Acessando: {liga_key}...")
        r = session.get(url, headers=headers, timeout=25)
        r.html.render(sleep=5, timeout=30) 
        
        soup = BeautifulSoup(r.html.html, 'html.parser')
        tabela = soup.find('table', class_='stats_table')
        
        if not tabela: return []

        dados_lista = []
        corpo = tabela.find('tbody')
        for row in corpo.find_all('tr'):
            if 'spacer' in row.get('class', []) or 'thead' in row.get('class', []): continue
            cols = row.find_all(['th', 'td'])
            
            if len(cols) >= 10:
                try:
                    # Mapeamento dinâmico básico
                    dados_lista.append({
                        "liga": liga_key,
                        "posicao": int(cols[0].text.strip().replace('.', '')),
                        "time": cols[1].text.strip(),
                        "pontos": int(cols[9].text.strip()) if cols[9].text.strip().isdigit() else 0,
                        "jogos": int(cols[2].text.strip()) if cols[2].text.strip().isdigit() else 0,
                        "sg": int(cols[8].text.strip().replace('+', '')) if len(cols) > 8 else 0
                    })
                except: continue
        return dados_lista
    except Exception as e:
        print(f"❌ Erro em {liga_key}: {e}")
        return []
    finally:
        session.close()

def main():
    todas_as_ligas = []
    for key, url in FBREF_URLS.items():
        res = get_tabela(key, url)
        if res:
            todas_as_ligas.extend(res)
            print(f"✅ {key} coletado.")
        time.sleep(random.uniform(10, 20))

    if todas_as_ligas:
        try:
            # Inject: Limpa e Insere
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            supabase.table("tabelas_ligas").insert(todas_as_ligas).execute()
            print(f"🚀 Sucesso! {len(todas_as_ligas)} linhas injetadas.")
        except Exception as e:
            print(f"❌ Erro no Supabase: {e}")

if __name__ == "__main__":
    main()
