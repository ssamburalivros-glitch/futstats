import os
import requests
from bs4 import BeautifulSoup
import re
from supabase import create_client
from datetime import datetime

def get_live_games():
    """Faz scraping dos jogos ao vivo do placardefutebol.com.br"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Referer': 'https://www.google.com/',
        }
        
        response = requests.get('https://www.placardefutebol.com.br/', headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        games = []
        
        # Encontrar os blocos de campeonatos
        championships = soup.find_all('div', class_='container content')
        
        for championship in championships:
            # Tentar pegar o nome da liga
            title_elem = championship.find_previous('h3', class_='match-list_league-name')
            league = title_elem.text.strip() if title_elem else "Outros"
            
            # Jogos dentro desse bloco
            matches = championship.find_all('div', class_='row align-items-center content')
            
            for match in matches:
                status_elem = match.find('span', class_='status-name')
                if not status_elem:
                    continue
                
                status = status_elem.text.strip()
                
                # Filtra apenas o que é "Ao Vivo", "Intervalo" ou Minutos (ex: 34')
                if not re.search(r'AO VIVO|INTERVALO|\d+\'', status, re.IGNORECASE):
                    continue
                
                teams = match.find_all('div', class_='team-name')
                if len(teams) < 2:
                    continue
                
                home_team = teams[0].text.strip()
                away_team = teams[1].text.strip()
                
                scores = match.find_all('span', class_='badge badge-default')
                home_score = scores[0].text.strip() if len(scores) >= 2 else "0"
                away_score = scores[1].text.strip() if len(scores) >= 2 else "0"
                
                is_brasileirao = any(term in league.upper() for term in ['BRASILEIRO', 'SÉRIE A', 'SÉRIE B'])
                
                games.append({
                    'match_name': f"{home_team} x {away_team}",
                    'status': status,
                    'league': league,
                    'home_team': home_team,
                    'away_team': away_team,
                    'home_score': home_score,
                    'away_score': away_score,
                    'is_brasileirao': is_brasileirao,
                    'updated_at': datetime.now().isoformat()
                })
        
        return games
        
    except Exception as e:
        print(f"Erro no scraping: {e}")
        return []

def sync_to_supabase(games_list):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ Erro: Chaves SUPABASE_URL ou SUPABASE_KEY não encontradas.")
        return

    supabase = create_client(url, key)

    try:
        # 1. Deletar jogos antigos para não duplicar
        supabase.table("partidas_ao_vivo").delete().neq("id", 0).execute()

        if games_list:
            # 2. Inserir novos jogos
            supabase.table("partidas_ao_vivo").insert(games_list).execute()
            print(f"✅ Sincronizado: {len(games_list)} jogos ao vivo no Supabase!")
        else:
            print("ℹ️ Nenhum jogo ao vivo encontrado no momento.")
            
    except Exception as e:
        print(f"❌ Erro ao salvar no Supabase: {e}")

if __name__ == "__main__":
    print("🚀 Iniciando processamento...")
    dados = get_live_games()
    sync_to_supabase(dados)
