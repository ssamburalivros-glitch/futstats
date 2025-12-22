import os
import time
import random
from requests_html import HTMLSession
from bs4 import BeautifulSoup
from supabase import create_client
from fake_useragent import UserAgent

# --- 1. CONFIGURAÇÃO DE AMBIENTE ---
# Busca os valores configurados nos Secrets do GitHub
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

print("--- INICIALIZANDO CRAWLER FUTSTATS ---")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERRO FATAL: SUPABASE_URL ou SUPABASE_KEY não encontradas nos Secrets do GitHub!")
    exit(1)

# Inicializa o cliente Supabase (usando a Service Role Key)
try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✅ Conexão com Supabase preparada.")
except Exception as e:
    print(f"❌ Erro ao conectar no Supabase: {e}")
    exit(1)

ua = UserAgent()

# URLs das Ligas no Fbref
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
        r = session.get(url, headers=headers, timeout=25)
        
        # Renderiza o JavaScript da página (necessário para tabelas do Fbref)
        r.html.render(sleep=5, timeout=35) 
        
        soup = BeautifulSoup(r.html.html, 'html.parser')
        tabela = soup.find('table', class_='stats_table')
        
        if not tabela:
            print(f"⚠️ Tabela não encontrada para {liga_id}")
            return []

        lista_times = []
        corpo = tabela.find('tbody')
        
        for row in corpo.find_all('tr'):
            # Ignora linhas que não são de dados (cabeçalhos extras ou separadores)
            if 'spacer' in row.get('class', []) or 'thead' in row.get('class', []):
                continue
                
            cols = row.find_all(['th', 'td'])
            
            # Estrutura Fbref: 0:Pos, 1:Time, 2:Jogos, 9:Pts, 10:SG
            if len(cols) >= 10:
                try:
                    nome_time = cols[1].text.strip()
                    # Tenta pegar a imagem do escudo se existir
                    img_tag = cols[1].find('img')
                    escudo_url = img_tag['src'] if img_tag and 'src' in img_tag.attrs else ""

                    lista_times.append({
                        "liga": liga_id,
                        "posicao": int(cols[0].text.strip().replace('.', '')),
                        "time": nome_time,
                        "escudo": escudo_url,
                        "jogos": int(cols[2].text.strip()),
                        "pontos": int(cols[9].text.strip()),
                        "sg": int(cols[10].text.strip().replace('+', ''))
                    })
                except Exception as e:
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
            print(f"✅ {liga_id}: {len(resultado)} times extraídos.")
        
        # Delay entre requisições para evitar bloqueio
        pausa = random.uniform(8, 15)
        print(f"⏳ Aguardando {pausa:.1f}s...")
        time.sleep(pausa)

    if dados_acumulados:
        try:
            print("📤 Enviando dados para o Supabase...")
            # Limpa os dados antigos da tabela 'tabelas_ligas'
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            
            # Insere a nova carga de dados
            supabase.table("tabelas_ligas").insert(dados_acumulados).execute()
            print(f"🚀 SUCESSO! {len(dados_acumulados)} registros atualizados no banco.")
        except Exception as e:
            print(f"❌ Erro ao salvar no banco: {e}")
    else:
        print("⚠️ Atenção: Nenhum dado foi coletado.")

if __name__ == "__main__":
    main()
