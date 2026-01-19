import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def buscar_dados_vivos():
    print("📡 Capturando lista de jogos da ESPN...")
    # Endpoint de placares globais
    url_score = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
    
    try:
        res = requests.get(url_score, timeout=15)
        data = res.json()
        eventos = data.get('events', [])
        lista_final = []

        for ev in eventos:
            id_jogo = ev.get('id')
            # BUSCA DETALHADA: Entramos no summary de cada jogo
            print(f"📊 Extraindo estatísticas do jogo: {id_jogo}")
            url_summary = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={id_jogo}"
            
            try:
                s_res = requests.get(url_summary, timeout=10)
                s_data = s_res.json()
                
                # Dados básicos
                header = s_data.get('header', {})
                competicao = header.get('league', {}).get('name', 'Futebol')
                
                # Equipes
                teams_data = s_data.get('boxscore', {}).get('teams', [])
                if not teams_data: continue # Se não tiver boxscore, ignora
                
                # Processando Equipe 1 (Casa) e Equipe 2 (Fora)
                # No Summary, o índice 0 é Casa e 1 é Fora geralmente
                t_casa = teams_data[0]
                t_fora = teams_data[1]
                
                # Extraindo Posse de Bola
                p_casa, p_fora = "50", "50"
                for stat in t_casa.get('statistics', []):
                    if stat['name'] == 'possessionPct':
                        p_casa = str(stat['displayValue']).replace('%', '')
                for stat in t_fora.get('statistics', []):
                    if stat['name'] == 'possessionPct':
                        p_fora = str(stat['displayValue']).replace('%', '')

                # Placar e Status
                status = s_data.get('header', {}).get('competitions', [{}])[0].get('status', {}).get('type', {}).get('shortDetail', 'LIVE')
                score_casa = t_casa.get('score', '0')
                score_fora = t_fora.get('score', '0')

                lista_final.append({
                    "id": str(id_jogo),
                    "time_casa": t_casa['team']['displayName'],
                    "logo_casa": t_casa['team'].get('logo', ''),
                    "time_fora": t_fora['team']['displayName'],
                    "logo_fora": t_fora['team'].get('logo', ''),
                    "placar": f"{score_casa} - {score_fora}",
                    "status": status,
                    "campeonato": competicao,
                    "posse_casa": p_casa,
                    "posse_fora": p_fora
                })
                print(f"✅ {t_casa['team']['shortDisplayName']} ({p_casa}%) x ({p_fora}%) {t_fora['team']['shortDisplayName']}")

            except Exception as e:
                print(f"⚠️ Pulei o jogo {id_jogo} por falta de dados detalhados.")

        if lista_final:
            # Limpa e Insere
            supabase.table("jogos_ao_vivo").delete().neq("id", "0").execute()
            supabase.table("jogos_ao_vivo").insert(lista_final).execute()
            print(f"🚀 {len(lista_final)} jogos atualizados no Supabase!")

    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    buscar_dados_vivos()
