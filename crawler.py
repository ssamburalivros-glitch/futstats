import os
import time
import random
from requests_html import HTMLSession
from bs4 import BeautifulSoup
from supabase import create_client
from fake_useragent import UserAgent

# --- CONFIGURAÇÃO DE AMBIENTE ---
SUPABASE_URL = os.environ.get("https://vqocdowjdutfzmnvxqvz.supabase.co")
SUPABASE_KEY = os.environ.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb2Nkb3dqZHV0ZnptbnZ4cXZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIzNjQzNCwiZXhwIjoyMDgxODEyNDM0fQ.GlJ_-kh2u7qsLMRgB5jVpvduhIG0yyY9AZ9rU_mEqcE")

print("--- INICIALIZANDO CRAWLER FUTSTATS ---")
if SUPABASE_URL and SUPABASE_KEY:
    print(f"✅ Conexão configurada. URL: {SUPABASE_URL[:15]}...")
else:
    print("❌ ERRO FATAL: Chaves do Supabase não encontradas!")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
ua = UserAgent()

LIGAS = {
    "BR": "https://fbref.com/en/comps/24/Serie-A-Stats",
    "PL": "https://fbref.com/en/comps/9/Premier-League-Stats",
    "ES": "https://fbref.com/en/comps/12/La-Liga-Stats",
    "DE": "https://fbref.com/en/comps/20/Bundesliga-Stats",
    "IT": "https://fbref.com/en/comps/11/Serie-A-Stats",
    "PT": "https://fbref.com/en/comps/37/Primeira-Liga-Stats"
}

def capturar_dados(liga_id, url):
    session = HTMLSession()
    headers = {'User-Agent': ua.random}
    try:
        print(f"📡 Raspando: {liga_id}...")
        r = session.get(url, headers=headers, timeout=20)
        r.html.render(sleep=5, timeout=30) 
        
        soup = BeautifulSoup(r.html.html, 'parser.html' if 'parser.html' in str(BeautifulSoup) else 'html.parser')
        tabela = soup.find('table', class_='stats_table')
        
        if not tabela:
            return []

        lista_times = []
        corpo = tabela.find('tbody')
        for row in corpo.find_all('tr'):
            if 'spacer' in row.get('class', []) or 'thead' in row.get('class', []):
                continue
            cols = row.find_all(['th', 'td'])
            if len(cols) >= 10:
                try:
                    lista_times.append({
                        "liga": liga_id,
                        "posicao": int(cols[0].text.strip().replace('.', '')),
                        "time": cols[1].text.strip(),
                        "jogos": int(cols[2].text.strip()),
                        "pontos": int(cols[9].text.strip()),
                        "sg": int(cols[10].text.strip().replace('+', ''))
                    })
                except:
                    continue
        return lista_times
    except Exception as e:
        print(f"❌ Erro em {liga_id}: {e}")
        return []
    finally:
        session.close()

def main():
    dados_acumulados = []
    for liga_id, url in LIGAS.items():
        resultado = capturar_dados(liga_id, url)
        if resultado:
            dados_acumulados.extend(resultado)
            print(f"✅ {liga_id}: {len(resultado)} times.")
        time.sleep(random.uniform(5, 10))

    if dados_acumulados:
        try:
            print("📤 Enviando para o Supabase...")
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            supabase.table("tabelas_ligas").insert(dados_acumulados).execute()
            print(f"🚀 SUCESSO! {len(dados_acumulados)} registros atualizados.")
        except Exception as e:
            print(f"❌ Erro banco: {e}")

if __name__ == "__main__":
    main()
