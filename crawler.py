import os
import time
import random
from requests_html import HTMLSession
from bs4 import BeautifulSoup
from supabase import create_client
from fake_useragent import UserAgent

# --- CONFIGURAÇÕES DE AMBIENTE ---
# O GitHub Actions injeta estas variáveis via Secrets
SUPABASE_URL = os.environ.get("https://vqocdowjdutfzmnvxqvz.supabase.co")
SUPABASE_KEY = os.environ.get("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxb2Nkb3dqZHV0ZnptbnZ4cXZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIzNjQzNCwiZXhwIjoyMDgxODEyNDM0fQ.GlJ_-kh2u7qsLMRgB5jVpvduhIG0yyY9AZ9rU_mEqcE")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erro: SUPABASE_URL ou SUPABASE_KEY não configurados nos Secrets do GitHub.")
    exit(1)

# Inicializa o cliente com a Service Role Key (Permissão de escrita)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
ua = UserAgent()

# URLs FBREF - Temporada 2025 (ou atual disponível)
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
        print(f"📡 Capturando dados de: {liga_key}...")
        r = session.get(url, headers=headers, timeout=25)
        
        # render() baixa o Chromium no primeiro uso e executa o JavaScript da página
        # sleep=5 garante tempo para o Fbref montar a tabela HTML
        r.html.render(sleep=5, timeout=30) 
        
        soup = BeautifulSoup(r.html.html, 'html.parser')
        tabela = soup.find('table', class_='stats_table')
        
        if not tabela:
            print(f"⚠️ Tabela não encontrada para {liga_key}.")
            return []

        dados_lista = []
        # Localiza o corpo da tabela e as linhas
        corpo = tabela.find('tbody')
        for row in corpo.find_all('tr'):
            # Ignora linhas de "rebaixamento" ou vazias que o Fbref coloca
            if 'spacer' in row.get('class', []) or 'thead' in row.get('class', []):
                continue
                
            cols = row.find_all(['th', 'td'])
            
            # Mapeamento colunas Fbref: 0:Pos, 1:Squad, 2:MP (Jogos), 9:Pts, 10:GD (SG)
            if len(cols) >= 10:
                try:
                    pos = cols[0].text.strip()
                    time_nome = cols[1].text.strip()
                    jogos = cols[2].text.strip()
                    # Saldo de Gols costuma estar na coluna 10 ou 11 dependendo da liga
                    sg = cols[10].text.strip() if 'Matches' not in cols[10].text else cols[9].text.strip()
                    pts = cols[9].text.strip() if 'Matches' not in cols[9].text else cols[8].text.strip()

                    dados_lista.append({
                        "liga": liga_key,
                        "posicao": int(pos) if pos.isdigit() else 0,
                        "time": time_nome,
                        "pontos": int(pts) if pts.isdigit() else 0,
                        "jogos": int(jogos) if jogos.isdigit() else 0,
                        "sg": int(sg.replace('+', '')) if sg.replace('+', '').replace('-', '').isdigit() else 0
                    })
                except:
                    continue
        return dados_lista

    except Exception as e:
        print(f"❌ Erro ao processar {liga_key}: {str(e)}")
        return []
    finally:
        session.close()

def main():
    todas_as_ligas = []
    
    for key, url in FBREF_URLS.items():
        resultado = get_tabela(key, url)
        if resultado:
            todas_as_ligas.extend(resultado)
            print(f"✅ {key} processado com sucesso.")
        
        # Delay anti-bloqueio (Imitante comportamento humano)
        delay = random.uniform(10, 20)
        print(f"⏳ Aguardando {delay:.1f}s...")
        time.sleep(delay)

    if todas_as_ligas:
        try:
            # 1. Limpa a tabela para a nova carga
            supabase.table("tabelas_ligas").delete().neq("liga", "VACANT").execute()
            # 2. Insere todos os dados de uma vez
            supabase.table("tabelas_ligas").insert(todas_as_ligas).execute()
            print(f"🚀 Banco atualizado! Total de registros: {len(todas_as_ligas)}")
        except Exception as e:
            print(f"❌ Erro Supabase: {e}")

if __name__ == "__main__":
    main()
