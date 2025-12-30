import os
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def buscar_detalhes_espn(jogo_id):
    """Busca estatísticas e escalações de um jogo específico na API da ESPN"""
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={jogo_id}"
    try:
        response = requests.get(url, timeout=15)
        if response.status_code != 200:
            return None
        return response.json()
    except Exception as e:
        print(f"⚠️ Erro ao acessar detalhes do jogo {jogo_id}: {e}")
        return None

def processar_detalhes():
    # 1. Puxa todos os IDs da tabela 'jogos_ao_vivo' que você acabou de atualizar
    try:
        response = supabase.table("jogos_ao_vivo").select("id").execute()
        jogos = response.data
    except Exception as e:
        print(f"❌ Erro ao ler jogos do Supabase: {e}")
        return

    if not jogos:
        print("💤 Nenhum jogo encontrado na tabela ao_vivo para processar detalhes.")
        return

    print(f"🔍 Encontrados {len(jogos)} jogos. Buscando estatísticas...")

    for j in jogos:
        jogo_id = j['id']
        data = buscar_detalhes_espn(jogo_id)
        
        if not data:
            continue

        try:
            # --- EXTRAÇÃO DE ESTATÍSTICAS ---
            posse_casa, posse_fora = 50, 50
            chutes_casa, chutes_fora = 0, 0
            
            # Percorre as estatísticas da ESPN
            boxscore = data.get('boxscore', {})
            teams_stats = boxscore.get('statistics', [])
            
            for stat_group in teams_stats:
                label = stat_group.get('label')
                if label == 'Possession':
                    posse_casa = int(float(stat_group['statistics'][0]['displayValue'].replace('%','')))
                    posse_fora = int(float(stat_group['statistics'][1]['displayValue'].replace('%','')))
                elif label == 'Shots':
                    chutes_casa = int(stat_group['statistics'][0]['displayValue'])
                    chutes_fora = int(stat_group['statistics'][1]['displayValue'])

            # --- EXTRAÇÃO DE ESCALAÇÕES ---
            # Pegamos a lista de jogadores (roster) se disponível
            rosters = boxscore.get('players', [])
            escalacao_casa = []
            escalacao_fora = []

            if len(rosters) >= 2:
                # Time Casa
                for p in rosters[0].get('statistics', [{}])[0].get('athletes', []):
                    escalacao_casa.append({"nome": p['athlete']['displayName'], "posicao": p['athlete']['position']['abbreviation']})
                # Time Fora
                for p in rosters[1].get('statistics', [{}])[0].get('athletes', []):
                    escalacao_fora.append({"nome": p['athlete']['displayName'], "posicao": p['athlete']['position']['abbreviation']})

            # --- SALVAR NO SUPABASE ---
            detalhes = {
                "jogo_id": jogo_id,
                "posse_casa": posse_casa,
                "posse_fora": posse_fora,
                "chutes_casa": chutes_casa,
                "chutes_fora": chutes_fora,
                "escalacao_casa": escalacao_casa, # Salva como JSONB
                "escalacao_fora": escalacao_fora, # Salva como JSONB
                "atualizado_em": "now()"
            }

            supabase.table("detalhes_partida").upsert(detalhes).execute()
            print(f"✅ Detalhes atualizados: {jogo_id}")

        except Exception as e:
            print(f"⚠️ Falha ao processar dados do jogo {jogo_id}: {e}")

if __name__ == "__main__":
    processar_detalhes()
