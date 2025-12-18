import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime
import re

def get_live_games():
    """Busca todos os jogos ao vivo"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get('https://www.placardefutebol.com.br/', headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        games = []
        
        # Buscar todos os campeonatos
        championships = soup.find_all('div', class_='container content')
        
        for champ in championships:
            # Encontrar título do campeonato
            title_elem = champ.find_previous('h3', class_='match-list_league-name')
            league = title_elem.text.strip() if title_elem else "Campeonato"
            
            # Encontrar jogos
            matches = champ.find_all('div', class_='row align-items-center content')
            
            for match in matches:
                # Verificar status
                status_elem = match.find('span', class_='status-name')
                if status_elem:
                    status = status_elem.text.strip()
                    
                    # Filtrar apenas jogos ao vivo ou em andamento
                    if not any(term in status.upper() for term in ['AO VIVO', 'INTERVALO', "'"]):
                        continue
                    
                    # Obter times
                    teams = match.find_all('div', class_='team-name')
                    if len(teams) >= 2:
                        home_team = teams[0].text.strip()
                        away_team = teams[1].text.strip()
                        
                        # Obter placar
                        scores = match.find_all('span', class_='badge badge-default')
                        home_score = "0"
                        away_score = "0"
                        
                        if len(scores) >= 2:
                            home_score = scores[0].text.strip()
                            away_score = scores[1].text.strip()
                        
                        # Verificar se é brasileirão
                        is_brasileirao = any(term in league.upper() for term in ['BRASILEIRO', 'SÉRIE A'])
                        
                        # Determinar país
                        country = "Brasil" if is_brasileirao else "Internacional"
                        
                        game_data = {
                            'match': f'{home_team} x {away_team}',
                            'status': status,
                            'league': league,
                            'home_team': home_team,
                            'away_team': away_team,
                            'home_score': home_score,
                            'away_score': away_score,
                            'summary': f'{home_score} x {away_score}',
                            'is_live': True,
                            'is_brasileirao': is_brasileirao,
                            'country': country,
                            'timestamp': datetime.now().isoformat()
                        }
                        
                        games.append(game_data)
        
        return {
            'success': True,
            'games': games,
            'total': len(games),
            'live_games': len(games),
            'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'source': 'placardefutebol.com.br'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'games': [],
            'total': 0,
            'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }

if __name__ == '__main__':
    print("🚀 Iniciando crawler de jogos ao vivo...")
    
    result = get_live_games()
    
    # Salvar dados em arquivo JSON
    with open('public/games.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Crawler executado com sucesso!")
    print(f"📊 Total de jogos encontrados: {result['total']}")
    print(f"🕐 Atualizado em: {result['updated_at']}")
