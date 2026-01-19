import os
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
# Certifica-te que estas variáveis estão no teu ambiente ou substitui pelas strings
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def buscar_detalhes_estatisticos(event_id):
    """
    Faz uma chamada extra para o resumo do jogo para pegar estatísticas reais.
    """
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={event_id}"
    try:
        res = requests.get(url, timeout=10)
        data = res.json()
        
        posse_casa, posse_fora = "50", "50"
        
        # A ESPN organiza estatísticas em ['boxscore']['teams']
        if 'boxscore' in data and 'teams' in data['boxscore']:
            teams = data['boxscore']['teams']
            for i, team_data in enumerate(teams):
                stats = team_data.get('statistics', [])
                for s in stats:
                    if s['name'] == 'possessionPct':
                        if i == 0: posse_casa = str(s['displayValue']).replace('%','')
                        else: posse_fora = str(s['displayValue']).replace('%','')
        
        return posse_casa, posse_fora
    except:
        return "50", "50"

def capturar_ao_vivo_espn():
    print("📡 Conectando à Central de Dados FutStats...")
    url = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        jogos_processados = []
        eventos = data.get('events', [])

        for evento in eventos:
            try:
                id_jogo = str(evento.get('id')) 
                campeonato = evento.get('shortName', 'Futebol')
                
                # Status do jogo
                status_raw = evento['status']['type']['shortDetail']
                status_full = evento['status']['type']['detail']
                status = status_full if "Scheduled" in status_raw or ":" in status_raw else status_raw

                comp = evento['competitions'][0]
                casa = comp['competitors'][0]
                fora = comp['competitors'][1]
                
                if casa['homeAway'] != 'home': casa, fora = fora, casa

                nome_casa = casa['team']['displayName']
                nome_fora = fora['team']['displayName']
                
                print(f"⚽ Processando: {nome_casa} x {nome_fora}...")

                # Placar
                score_casa = casa.get('score', '0')
                score_fora = fora.get('score', '0')
                placar = f"{score_casa} - {score_fora}"

                # --- BUSCA ESTATÍSTICAS REAIS ---
                # Se o jogo estiver a decorrer (não agendado), busca estatísticas detalhadas
                p_casa, p_fora = "50", "50"
                if "Scheduled" not in status and "v" not in placar:
                    p_casa, p_fora = buscar_detalhes_estatisticos(id_jogo)

                jogos_processados.append({
                    "id": id_jogo,
                    "status": status,
                    "campeonato": campeonato,
                    "time_casa": nome_casa,
                    "logo_casa": casa['team'].get('logo', ''),
                    "time_fora": nome_fora,
                    "logo_fora": fora['team'].get('logo', ''),
                    "placar": placar,
                    "posse_casa": p_casa,
                    "posse_fora": p_fora
                })
            except Exception as e:
                print(f"⚠️ Erro no jogo {id_jogo}: {e}")
                continue
        
        return jogos_processados
    except Exception as e:
        print(f"❌ Erro Crítico na API: {e}")
        return []

def main():
    dados = capturar_ao_vivo_espn()
    
    if dados:
        print(f"✅ {len(dados)} jogos encontrados. Atualizando Supabase...")
        try:
            # Limpa e atualiza
            supabase.table("jogos_ao_vivo").delete().neq("id", "OFF").execute()
            supabase.table("jogos_ao_vivo").upsert(dados).execute()
            print("🚀 Tabela jogos_ao_vivo sincronizada com sucesso!")
        except Exception as e:
            print(f"❌ Erro no Supabase: {e}")
    else:
        print("⚠️ Nenhum dado retornado pela API.")

if __name__ == "__main__":
    main()
