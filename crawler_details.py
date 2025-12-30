import os
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def buscar_detalhes_espn(jogo_id):
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={jogo_id}"
    try:
        response = requests.get(url, timeout=15)
        return response.json() if response.status_code == 200 else None
    except Exception as e:
        print(f"⚠️ Erro API ESPN {jogo_id}: {e}")
        return None

def processar_detalhes():
    try:
        response = supabase.table("jogos_ao_vivo").select("id").execute()
        jogos = response.data
    except Exception as e:
        print(f"❌ Erro Supabase: {e}")
        return

    if not jogos: return

    for j in jogos:
        jogo_id = j['id']
        data = buscar_detalhes_espn(jogo_id)
        if not data: continue

        try:
            # 1. LOCALIZAR O BOXSCORE CORRETO
            boxscore = data.get('boxscore', {})
            teams_data = boxscore.get('teams', [])
            
            # Inicializar valores padrão
            stats_final = {
                "casa": {"posse": 50, "chutes": 0},
                "fora": {"posse": 50, "chutes": 0}
            }

            # 2. MAPEAMENTO DINÂMICO DE ESTATÍSTICAS
            # A ESPN separa por times (Home/Away)
            for team_idx, team_info in enumerate(teams_data):
                # Determina se é o time 0 (casa) ou 1 (fora) baseado no JSON
                posicao = "casa" if team_idx == 0 else "fora"
                
                for stat in team_info.get('statistics', []):
                    # Captura Posse de Bola
                    if stat['name'] == 'possessionPct':
                        stats_final[posicao]["posse"] = int(float(stat['displayValue'].replace('%','')))
                    # Captura Chutes Totais
                    elif stat['name'] == 'shots':
                        stats_final[posicao]["chutes"] = int(stat['displayValue'])

            # 3. EXTRAÇÃO DE ESCALAÇÕES (ROSTERS)
            escalacao_casa, escalacao_fora = [], []
            rosters = boxscore.get('players', [])
            
            if len(rosters) >= 2:
                # Titulares Time Casa
                for p in rosters[0].get('statistics', [{}])[0].get('athletes', []):
                    escalacao_casa.append({"n": p['athlete']['displayName'], "p": p['athlete']['position']['abbreviation']})
                # Titulares Time Fora
                for p in rosters[1].get('statistics', [{}])[0].get('athletes', []):
                    escalacao_fora.append({"n": p['athlete']['displayName'], "p": p['athlete']['position']['abbreviation']})

            # 4. UPSERT NO SUPABASE
            detalhes = {
                "jogo_id": jogo_id,
                "posse_casa": stats_final["casa"]["posse"],
                "posse_fora": stats_final["fora"]["posse"],
                "chutes_casa": stats_final["casa"]["chutes"],
                "chutes_fora": stats_final["fora"]["chutes"],
                "escalacao_casa": escalacao_casa,
                "escalacao_fora": escalacao_fora,
                "atualizado_em": "now()"
            }

            supabase.table("detalhes_partida").upsert(detalhes).execute()
            print(f"✅ Dados Reais Sincronizados: {jogo_id}")

        except Exception as e:
            print(f"⚠️ Falha no processamento técnico do jogo {jogo_id}: {e}")

if __name__ == "__main__":
    processar_detalhes()
