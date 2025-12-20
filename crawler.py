import os
import requests
from bs4 import BeautifulSoup
import re
from supabase import create_client
from datetime import datetime

# COLOQUE SUAS CHAVES DIRETAMENTE AQUI SE NÃO ESTIVER USANDO VAR DE AMBIENTE
SUPABASE_URL = "https://vqocdowjdutfzmnvxqvz.supabase.co"
SUPABASE_KEY = "sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm"

def get_live_games():
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        }
        
        response = requests.get('https://www.placardefutebol.com.br/', headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        games = []
        
        # O seletor correto do placardefutebol geralmente é .match-list-container
        championships = soup.find_all('div', class_='container content')
        
        for championship in championships:
            title_elem = championship.find_previous('h3', class_='match-list_league-name')
            league = title_elem.text.strip() if title_elem else "Outros"
            
            matches = championship.find_all('div', class_='row align-items-center content')
            
            for match in matches:
                status_elem = match.find('span', class_='status-name')
                if not status_elem: continue
                
                status = status_elem.text.strip()
                
                # Filtra apenas jogos realmente em andamento
                if not re.search(r'AO VIVO|INTERVALO|\d+\'', status, re.IGNORECASE):
                    continue
                
                teams = match.find_all('div', class_='team-name')
                if len(teams) < 2: continue
                
                home_team = teams[0].text.strip()
                away_team = teams[1].text.strip()
                
                scores = match.find_all('span', class_='badge badge-default')
                
                # Garante que o placar seja número inteiro para não dar erro no banco
                try:
                    h_score = int(scores[0].text.strip()) if len(scores) >= 2 else 0
                    a_score = int(scores[1].text.strip()) if len(scores) >= 2 else 0
                except:
                    h_score, a_score = 0, 0
                
                is_brasileirao = any(term in league.upper() for term in ['BRASILEIRO', 'SÉRIE A', 'SÉRIE B'])
                
                games.append({
                    'status': status,
                    'league': league,
                    'home_team': home_team,
                    'away_team': away_team,
                    'home_score': h_score,
                    'away_score': a_score,
                    'updated_at': datetime.now().isoformat()
                })
        
        return games
        
    except Exception as e:
        print(f"Erro no scraping: {e}")
        return []

def sync_to_supabase(games_list):
    # Tenta pegar da variável de ambiente, se não houver, usa a string direta
    url = os.environ.get("SUPABASE_URL") or SUPABASE_URL
    key = os.environ.get("SUPABASE_KEY") or SUPABASE_KEY
    
    if url == "SUA_URL_AQUI":
        print("❌ Erro: Configure a URL e KEY do Supabase no script.")
        return

    supabase = create_client(url, key)

    try:
        # 1. Limpa a tabela (O delete sem filtro pode ser bloqueado pelo RLS, 
        # por isso usamos o filtro neq id 0 ou similar)
        supabase.table("partidas_ao_vivo").delete().neq("home_team", "VAZIO").execute()

        if games_list:
            # 2. Inserir novos jogos
            supabase.table("partidas_ao_vivo").insert(games_list).execute()
            print(f"✅ Sincronizado: {len(games_list)} jogos ao vivo!")
        else:
            print("ℹ️ Nenhum jogo ao vivo encontrado agora.")
            
    except Exception as e:
        print(f"❌ Erro ao salvar no Supabase: {e}")

if __name__ == "__main__":
    print("🚀 Iniciando crawler...")
    dados = get_live_games()
    sync_to_supabase(dados)
