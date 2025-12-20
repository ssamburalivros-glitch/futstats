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
        # ... (headers e requests continuam iguais)
        soup = BeautifulSoup(response.text, 'html.parser')
        games = []
        
        # BUSCA DIRETO PELAS LINHAS DE PARTIDA
        matches = soup.find_all('div', class_='row align-items-center content')
        
        for match in matches:
            status_elem = match.find('span', class_='status-name')
            if not status_elem: continue
            
            status = status_elem.text.strip()
            
            # Adicionamos "FIM" e "ENCERRADO" para garantir que o 4º jogo apareça se ele acabou de acabar
            if not re.search(r'AO VIVO|INTERVALO|\d+\'|FIM|ENCERRADO', status, re.IGNORECASE):
                continue
            
            teams = match.find_all('div', class_='team-name')
            if len(teams) < 2: continue
            
            home_team = teams[0].text.strip()
            away_team = teams[1].text.strip()
            
            # Pega o placar
            scores = match.find_all('span', class_='badge badge-default')
            try:
                h_score = int(scores[0].text.strip()) if len(scores) >= 2 else 0
                a_score = int(scores[1].text.strip()) if len(scores) >= 2 else 0
            except:
                h_score, a_score = 0, 0

            # Tenta pegar a liga (opcional, sobe um nível no HTML)
            league_div = match.find_parent('div', class_='container content')
            league = "Campeonato"
            if league_div:
                prev_h3 = league_div.find_previous('h3', class_='match-list_league-name')
                if prev_h3: league = prev_h3.text.strip()

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
        print(f"Erro: {e}")
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
