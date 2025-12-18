import requests
from bs4 import BeautifulSoup
import json
import re
from datetime import datetime
import sys
import os

class FutStatsCrawler:
    def __init__(self):
        self.base_url = 'https://www.placardefutebol.com.br/'
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        })
    
    def get_all_live_games(self):
        """Busca TODOS os jogos ao vivo, de qualquer campeonato"""
        try:
            response = self.session.get(self.base_url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            all_games = []
            
            # Encontrar todos os campeonatos
            championships = soup.find_all('div', class_='container content')
            
            if not championships:
                # Tentar outro padrão de classe
                championships = soup.find_all('div', class_='league')
            
            for champ in championships:
                # Encontrar título do campeonato
                title_elem = champ.find_previous('h3', class_='match-list_league-name')
                if not title_elem:
                    title_elem = champ.find_previous('h2')
                    if not title_elem:
                        title_elem = champ.find_previous('h1')
                
                league = title_elem.text.strip() if title_elem else "Campeonato Desconhecido"
                
                # Encontrar todos os jogos
                matches = champ.find_all('div', class_=re.compile(r'row.*content'))
                if not matches:
                    matches = champ.find_all('div', class_='match')
                
                for match in matches:
                    try:
                        # Verificar status
                        status_elem = match.find('span', class_='status-name')
                        if not status_elem:
                            status_elem = match.find('span', class_=re.compile(r'status|time'))
                        
                        status = status_elem.text.strip() if status_elem else "Aguardando"
                        
                        # Filtrar por status ao vivo
                        status_lower = status.lower()
                        is_live = any(term in status_lower for term in ['ao vivo', 'intervalo', "'", 'minuto'])
                        
                        if not is_live:
                            continue
                        
                        # Obter times
                        teams = match.find_all('div', class_='team-name')
                        if len(teams) < 2:
                            teams = match.find_all('span', class_='team-name')
                            if len(teams) < 2:
                                teams = match.find_all('div', class_='team')
                        
                        if len(teams) < 2:
                            continue
                        
                        team_home = teams[0].text.strip()
                        team_visitor = teams[1].text.strip()
                        
                        # Obter placar
                        scoreboard = match.find_all('span', class_='badge badge-default')
                        if not scoreboard:
                            scoreboard = match.find_all('span', class_='score')
                            if not scoreboard:
                                scoreboard = match.find_all('div', class_='score')
                        
                        home_score = "0"
                        away_score = "0"
                        
                        if len(scoreboard) >= 2:
                            home_score = scoreboard[0].text.strip()
                            away_score = scoreboard[1].text.strip()
                        elif len(scoreboard) == 1:
                            score_text = scoreboard[0].text.strip()
                            if 'x' in score_text or '-' in score_text:
                                scores = re.split(r'[x\-]', score_text)
                                if len(scores) >= 2:
                                    home_score = scores[0].strip()
                                    away_score = scores[1].strip()
                        
                        # Detectar se é brasileirão
                        is_brasileirao = any(term in league.lower() for term in [
                            'brasileiro', 'série a', 'brasileirão', 'brazilian'
                        ])
                        
                        game_data = {
                            'match': f'{team_home} x {team_visitor}',
                            'status': status,
                            'league': league,
                            'home_team': team_home,
                            'away_team': team_visitor,
                            'home_score': home_score,
                            'away_score': away_score,
                            'summary': f'{home_score} x {away_score}',
                            'is_live': True,
                            'is_brasileirao': is_brasileirao,
                            'timestamp': datetime.now().isoformat(),
                            'country': self.detect_country(league)
                        }
                        
                        all_games.append(game_data)
                        
                    except Exception as e:
                        print(f"Erro ao processar jogo: {e}")
                        continue
            
            return {
                'success': True,
                'games': all_games,
                'total': len(all_games),
                'live_games': len([g for g in all_games if g.get('is_live', False)]),
                'brasileirao_games': len([g for g in all_games if g.get('is_brasileirao', False)]),
                'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'source': 'placardefutebol.com.br'
            }
            
        except Exception as e:
            print(f"Erro geral: {e}")
            return {
                'success': False,
                'error': str(e),
                'games': [],
                'total': 0,
                'updated_at': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
    
    def detect_country(self, league):
        """Detecta o país do campeonato"""
        league_lower = league.lower()
        
        if any(term in league_lower for term in ['brasileiro', 'brasileirão', 'série a']):
            return 'Brasil'
        elif any(term in league_lower for term in ['premier league', 'inglês']):
            return 'Inglaterra'
        elif any(term in league_lower for term in ['la liga', 'espanhol']):
            return 'Espanha'
        elif any(term in league_lower for term in ['serie a', 'italiano']):
            return 'Itália'
        elif any(term in league_lower for term in ['bundesliga', 'alemão']):
            return 'Alemanha'
        elif any(term in league_lower for term in ['ligue 1', 'francês']):
            return 'França'
        elif any(term in league_lower for term in ['português', 'primeira liga']):
            return 'Portugal'
        elif any(term in league_lower for term in ['argentino']):
            return 'Argentina'
        else:
            return 'Internacional'

def main():
    """Função principal para execução automática"""
    crawler = FutStatsCrawler()
    result = crawler.get_all_live_games()
    
    # Salvar em arquivo JSON
    output_file = 'live_games.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    # Salvar também em formato público
    public_file = 'public/games.json'
    os.makedirs('public', exist_ok=True)
    with open(public_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f" Crawler executado com sucesso!")
    print(f" Total de jogos encontrados: {result.get('total', 0)}")
    print(f" Jogos ao vivo: {result.get('live_games', 0)}")
    print(f"🇧🇷 Brasileirão: {result.get('brasileirao_games', 0)}")
    
    # Retornar código de saída
    if result['success']:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()