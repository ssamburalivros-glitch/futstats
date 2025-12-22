import os
import time
import random
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Chaves não encontradas!")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "https://fbref.com/en/comps/24/Serie-A-Stats",
    "PL": "https://fbref.com/en/comps/9/Premier-League-Stats",
    "ES": "https://fbref.com/en/comps/12/La-Liga-Stats",
    "DE": "https://fbref.com/en/comps/20/Bundesliga-Stats",
    "IT": "https://fbref.com/en/comps/11/Serie-A-Stats",
    "PT": "https://fbref.com/en/comps/37/Primeira-Liga-Stats"
}

def capturar_dados(liga_id, url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    }
    try:
        print(f"📡 Lendo {liga_id}...")
        response = requests.get(url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Tenta encontrar a tabela principal de classificação (Regular Season ou Overall)
        # O FBRef costupa usar IDs como 'results20242025121_overall'
        tabela = soup.find('table', {'class': 'stats_table'})
        
        if not tabela:
            print(f"⚠️ Nenhuma tabela encontrada para {liga_id}")
            return []

        times = []
        corpo_tabela = tabela.find('tbody')
        if not corpo_tabela: return []

        for row in corpo_tabela.find_all('tr'):
            # Ignora linhas de separação ou cabeçalhos repetidos
            if 'spacer' in row.get('class', []) or 'thead' in row.get('class', []):
                continue
            
            cols = row.find_all(['th', 'td'])
            
            # Verificação mínima de colunas para garantir que é uma linha de dados
            if len(cols) >= 10:
                try:
                    # posicao costuma estar no <th> ou na primeira <td>
                    pos_text = cols[0].text.strip().replace('.', '')
                    nome_time = cols[1].text.strip()
                    
                    # Busca o escudo
                    img_tag = cols[1].find('img')
                    escudo = img_tag['src'] if img_tag else ""

                    # No FBRef Overall: 2=MP(jogos), 9=Pts, 10=GD(saldo)
                    times.append({
                        "liga": liga_id,
                        "posicao": int(pos_text) if pos_text.isdigit() else 0,
                        "time": nome_time,
                        "escudo": escudo,
                        "jogos": int(cols[2].text.strip()) if cols[2].text.strip().isdigit() else 0,
                        "pontos": int(cols[9].text.strip()) if cols[9].text.strip().isdigit() else 0,
                        "sg": int(cols[10].text.strip().replace('+', '')) if cols[10].text.strip().replace('+', '').lstrip('-').isdigit() else 0
                    })
                except Exception as e:
                    continue
        return times
    except Exception as e:
        print(f"❌ Erro {liga_id}: {e}")
        return []

def main():
    todas_ligas = []
    for liga_id, url in LIGAS.items():
        res = capturar_dados(liga_id, url)
        if res:
            todas_ligas.extend(res)
            print(f"✅ {liga_id} capturado: {len(res)} times encontrados.")
        
        # Delay para não ser bloqueado (FBRef é sensível)
        time.sleep(random.uniform(3, 6))

    if todas_ligas:
        print(f"📤 Enviando {len(todas_ligas)} registros para o Supabase...")
        try:
            # Limpa os dados antigos
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            # Insere os novos
            supabase.table("tabelas_ligas").insert(todas_ligas).execute()
            print("🚀 SUCESSO! Dados atualizados.")
        except Exception as e:
            print(f"❌ Erro ao subir para o banco: {e}")
    else:
        print("⚠️ Nenhum dado coletado para enviar.")

if __name__ == "__main__":
    main()
