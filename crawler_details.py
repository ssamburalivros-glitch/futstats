import os
import time
import requests
import json
from supabase import create_client

# --- 1. CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERRO: Configure as variáveis SUPABASE_URL e SUPABASE_KEY.")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- 2. FUNÇÃO PARA EXTRAIR DADOS DA ESPN ---
def processar_jogo(id_espn):
    # Endpoint "Summary" da ESPN (contém stats e lineups)
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={id_espn}"
    
    try:
        res = requests.get(url, timeout=10).json()
        
        # A. Extração de Estatísticas (Posse e Chutes)
        stats_casa = {'possession': 50, 'shots': 0}
        stats_fora = {'possession': 50, 'shots': 0}
        
        if 'boxscore' in res and 'teams' in res['boxscore']:
            teams = res['boxscore']['teams'] # [0] é Casa, [1] é Fora (geralmente)
            
            for t in teams:
                # Identifica se é casa ou fora
                is_home = (t['team']['id'] == res['header']['competitions'][0]['competitors'][0]['team']['id'])
                target = stats_casa if is_home else stats_fora
                
                # Pega as estatísticas da lista
                for stat in t.get('statistics', []):
                    if stat['name'] == 'possessionPct':
                        target['possession'] = int(stat['displayValue'] or 50)
                    elif stat['name'] == 'shots':
                        target['shots'] = int(stat['displayValue'] or 0)

        # B. Extração de Escalações (Lineups)
        lineup_casa = []
        lineup_fora = []

        if 'rosters' in res:
            for roster in res['rosters']:
                # Verifica de qual time é esse roster
                is_home = (roster['team']['id'] == res['header']['competitions'][0]['competitors'][0]['team']['id'])
                
                players = []
                # Pega Titulares (starters) e Reservas (substitutes) se quiser
                sections = roster.get('roster', [])
                for section in sections:
                    if section.get('name') in ['starters', 'substitutes']: 
                        for p in section.get('athletes', []):
                            players.append(p.get('displayName', 'Desconhecido'))
                
                if is_home:
                    lineup_casa = players
                else:
                    lineup_fora = players

        # Se não achou roster na aba rosters, tenta boxscore players (comum em jogos menores)
        elif 'boxscore' in res and 'players' in res['boxscore']:
             # Lógica similar de backup... (simplificado aqui para não ficar gigante)
             pass

        # --- 3. PREPARAR DADOS PARA O SUPABASE ---
        dados_finais = {
            "jogo_id": str(id_espn),
            "posse_casa": stats_casa['possession'],
            "posse_fora": stats_fora['possession'],
            "chutes_casa": stats_casa['shots'],
            "chutes_fora": stats_fora['shots'],
            "escalacao_casa": lineup_casa[:11], # Pega só os 11 titulares para não poluir
            "escalacao_fora": lineup_fora[:11]
        }
        
        # Envia
        supabase.table("detalhes_partida").upsert(dados_finais).execute()
        print(f"✅ Detalhes atualizados para jogo {id_espn}")

    except Exception as e:
        print(f"⚠️ Erro ao processar jogo {id_espn}: {e}")

# --- 4. LOOP PRINCIPAL ---
def main():
    print("🔄 Buscando jogos ativos no Supabase...")
    
    # 1. Busca IDs dos jogos que já estão na tabela 'jogos_ao_vivo'
    try:
        response = supabase.table("jogos_ao_vivo").select("id_espn").execute()
        jogos = response.data
        
        if not jogos:
            print("💤 Nenhum jogo ao vivo cadastrado no momento.")
            return

        print(f"🎯 Encontrados {len(jogos)} jogos para detalhar.")
        
        for jogo in jogos:
            id_espn = jogo.get('id_espn')
            if id_espn:
                processar_jogo(id_espn)
                time.sleep(1) # Respeita a API

    except Exception as e:
        print(f"❌ Erro crítico no loop principal: {e}")

if __name__ == "__main__":
    main()
