import os
import time
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# URLs da ESPN (Muito mais fáceis de ler)
LIGAS = {
    "BR": "https://www.espn.com.br/futebol/classificacao/_/liga/bra.1",
    "PL": "https://www.espn.com.br/futebol/classificacao/_/liga/eng.1",
    "ES": "https://www.espn.com.br/futebol/classificacao/_/liga/esp.1",
    "DE": "https://www.espn.com.br/futebol/classificacao/_/liga/ger.1",
    "IT": "https://www.espn.com.br/futebol/classificacao/_/liga/ita.1",
    "PT": "https://www.espn.com.br/futebol/classificacao/_/liga/por.1"
}

def capturar_espn(liga_id, url):
    print(f"📡 Lendo {liga_id} via ESPN...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        response = requests.get(url, headers=headers, timeout=20)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # A ESPN separa os nomes dos times em uma tabela e os números em outra
        # Vamos pegar a tabela de nomes (esquerda)
        tabela_nomes = soup.find('table', class_='Table--left')
        # E a tabela de estatísticas (direita)
        tabela_stats = soup.find('div', class_='Table__Scroller').find('table')
        
        if not tabela_nomes or not tabela_stats:
            print(f"⚠️ Tabelas não encontradas para {liga_id}")
            return []

        nomes_rows = tabela_nomes.find('tbody').find_all('tr')
        stats_rows = tabela_stats.find('tbody').find_all('tr')

        times = []
        for i in range(len(nomes_rows)):
            # Extraindo nome e escudo
            col_time = nomes_rows[i].find_all('td')[0]
            nome_time = col_time.find('span', class_='hide-mobile').text.strip()
            img = col_time.find('img')
            escudo = img['src'] if img else ""
            
            # Extraindo estatísticas
            cols_stats = stats_rows[i].find_all('td')
            # Estrutura ESPN: 0=J, 1=V, 2=E, 3=D, 7=SG, 8=Pts
            jogos = cols_stats[0].text.strip()
            sg = cols_stats[7].text.strip()
            pontos = cols_stats[8].text.strip()

            times.append({
                "liga": liga_id,
                "posicao": i + 1,
                "time": nome_time,
                "escudo": escudo,
                "jogos": int(jogos) if jogos.isdigit() else 0,
                "pontos": int(pontos) if pontos.isdigit() else 0,
                "sg": int(sg.replace('+', '')) if sg.replace('+', '').lstrip('-').isdigit() else 0
            })
            
        print(f"✅ {liga_id}: {len(times)} times.")
        return times
    except Exception as e:
        print(f"❌ Erro em {liga_id}: {e}")
        return []

def main():
    dados_finais = []
    for liga_id, url in LIGAS.items():
        res = capturar_espn(liga_id, url)
        if res:
            dados_finais.extend(res)
        time.sleep(1)

    if dados_finais:
        print(f"📤 Enviando {len(dados_finais)} registros para o Supabase...")
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_finais).execute()
        print("🚀 PROJETO FINALIZADO COM SUCESSO!")
    else:
        print("💀 Falha total. Verifique as URLs da ESPN.")

if __name__ == "__main__":
    main()
