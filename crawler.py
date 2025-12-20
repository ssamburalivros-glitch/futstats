import os
import requests
from bs4 import BeautifulSoup
import re
from supabase import create_client
from datetime import datetime

# --- CONFIGURAÇÃO ---
# Se estiver usando variáveis de ambiente, o script priorizará elas.
SUPABASE_URL = "https://vqocdowjdutfzmnvxqvz.supabase.co"
SUPABASE_KEY = "sb_publishable_I_1iAkLogMz0qxxMZJhP3w_U5Fl3Crm"

def get_live_games():
    """Faz scraping dos jogos ao vivo do placardefutebol.com.br"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        }
        
        response = requests.get('https://www.placardefutebol.com.br/', headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        games = []
        
        # BUSCA TODAS AS LINHAS DE JOGO DIRETAMENTE (Evita pular jogos em containers diferentes)
        matches = soup.find_all('div', class_='row align-items-center content')
        
        print(f"🔍 Analisando {len(matches)} partidas encontradas na página...")

        for match in matches:
            status_elem = match.find('span', class_='status-name')
            if not status_elem: 
                continue
            
            status = status_elem.text.strip().upper()
            
            # FILTRO EXPANDIDO: Captura Ao Vivo, Minutos, Intervalo, Fim e Encerrado
            # Isso garante que o 4º jogo apareça mesmo que o status dele seja diferente
            if not re.search(r'AO VIVO|INTERVALO|\d+\'|FIM|ENCERRADO|PENAL', status):
                continue
            
            teams = match.find_all('div', class_='team-name')
            if len(teams) < 2: 
                continue
            
            home_team = teams[0].text.strip()
            away_team = teams[1].text.strip()
            
            # Captura o placar com segurança
            scores = match.find_all('span', class_='badge badge-default')
            try:
                h_score = int(scores[0].text.strip()) if len(scores) >= 2 else 0
                a_score = int(scores[1].text.strip()) if len(scores) >= 2 else 0
            except (ValueError, IndexError):
                h_score, a_score = 0, 0
            
            # Tenta identificar a liga subindo no HTML até o título do bloco
            league = "Outros"
            parent_container = match.find_parent('div', class_='container content')
            if parent_container:
                title_elem = parent_container.find_previous('h3', class_='match-list_league-name')
                if title_elem:
                    league = title_elem.text.strip()
            
            print(f"✅ Jogo encontrado: {home_team} {h_score} x {a_score} {away_team} ({status})")

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
        print(f"❌ Erro crítico no scraping: {e}")
        return []

def sync_to_supabase(games_list):
    """Limpa o banco e insere os novos dados"""
    url = os.environ.get("SUPABASE_URL") or SUPABASE_URL
    key = os.environ.get("SUPABASE_KEY") or SUPABASE_KEY
    
    if not url or url == "SUA_URL_AQUI":
        print("❌ Erro: URL ou KEY do Supabase não configurada.")
        return

    supabase = create_client(url, key)

    try:
        # 1. Deletar jogos antigos (limpa a tabela para não duplicar)
        # Usamos o filtro 'home_team' neq 'VAZIO' para burlar restrições de delete sem filtro
        supabase.table("partidas_ao_vivo").delete().neq("home_team", "VAZIO").execute()

        if games_list:
            # 2. Inserir a nova lista de jogos
            supabase.table("partidas_ao_vivo").insert(games_list).execute()
            print(f"🚀 Sucesso! {len(games_list)} jogos sincronizados no Supabase.")
        else:
            print("ℹ️ Nenhuma partida ao vivo no radar no momento.")
            
    except Exception as e:
        print(f"❌ Erro ao salvar no Supabase: {e}")

if __name__ == "__main__":
    print("--- INICIANDO ATUALIZAÇÃO ---")
    dados = get_live_games()
    sync_to_supabase(dados)
    print("--- PROCESSO CONCLUÍDO ---")
