import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def capturar_ao_vivo():
    url = "https://www.placardefutebol.com.br/jogos-de-hoje"
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    jogos = []
    containers = soup.find_all('div', class_='match-container')

    for item in containers:
        try:
            status = item.find('span', class_='status-name').text.strip()
            time_casa = item.find('div', class_='team-home').find('h3').text.strip()
            time_fora = item.find('div', class_='team-away').find('h3').text.strip()
            placar = item.find('div', class_='match-score').text.strip().replace('\n', ' ')

            jogos.append({
                "status": status,
                "time_casa": time_casa,
                "time_fora": time_fora,
                "placar": placar
            })
        except: continue
    return jogos

def main():
    dados = capturar_ao_vivo()
    if dados:
        supabase.table("jogos_ao_vivo").delete().neq("status", "OFF").execute()
        supabase.table("jogos_ao_vivo").insert(dados).execute()

if __name__ == "__main__":
    main()
