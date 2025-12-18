#!/usr/bin/env python3
import json
from datetime import datetime
import os
import requests
from bs4 import BeautifulSoup
import re

def get_live_games():
    """Faz scraping dos jogos ao vivo do placardefutebol.com.br"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get('https://www.placardefutebol.com.br/', headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        games = []
        
        # Encontrar os campeonatos
        championships = soup.find_all('div', class_='container content')
        
        for championship in championships:
            # Nome do campeonato
            title_elem = championship.find_previous('h3', class_='match-list_league-name')
            league = title_elem.text.strip() if title_elem else "Campeonato"
            
            # Jogos dentro do campeonato
            matches = championship.find_all('div', class_='row align-items-center content')
            
            for match in matches:
                # Status do jogo
                status_elem = match.find('span', class_='status-name')
                if not status_elem:
                    continue
                status = status_elem.text.strip()
                
                # Verificar se está ao vivo (contém 'AO VIVO', 'INTERVALO', ou tem minuto)
                if not re.search(r'AO VIVO|INTERVALO|\d+\'', status, re.IGNORECASE):
                    continue
                
                # Times
                teams = match.find_all('div', class_='team-name')
                if len(teams) < 2:
                    continue
                home_team = teams[0].text.strip()
                away_team = teams[1].text.strip()
                
                # Placar
                scores = match.find_all('span', class_='badge badge-default')
                home_score = "0"
                away_score = "0"
                if len(scores) >= 2:
                    home_score = scores[0].text.strip()
                    away_score = scores[1].text.strip()
                
                # Verificar se é brasileirão
                is_brasileirao = any(term in league.upper() for term in ['BRASILEIRO', 'SÉRIE A'])
                
                # País
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
            'brasileirao_games': len([g for g in games if g['is_brasileirao']]),
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

def main():
    print("🚀 Iniciando crawler de jogos ao vivo...")
    data = get_live_games()
    
    # Criar diretório public se não existir
    os.makedirs('public', exist_ok=True)
    
    # Salvar em public/games.json
    with open('public/games.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Dados salvos em public/games.json")
    print(f"📊 Total de jogos: {data['total']}")
    print(f"🔥 Jogos ao vivo: {data['live_games']}")
    print(f"🇧🇷 Brasileirão: {data.get('brasileirao_games', 0)}")
    print(f"🕐 Atualizado em: {data['updated_at']}")

if __name__ == "__main__":
    main()
