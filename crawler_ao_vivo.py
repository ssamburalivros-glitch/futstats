import os
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def capturar_ao_vivo_espn():
    print("📡 Acessando API Global da ESPN...")
    url = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        jogos = []
        eventos = data.get('events', [])

        for evento in eventos:
            try:
                id_jogo = str(evento.get('id')) 
                campeonato = evento.get('shortName', 'Futebol')
                
                # Trata o status
                status_raw = evento['status']['type']['shortDetail']
                status = evento['status']['type']['detail'] if "Scheduled" in status_raw else status_raw

                comp = evento['competitions'][0]
                casa = comp['competitors'][0]
                fora = comp['competitors'][1]
                
                if casa['homeAway'] != 'home':
                    casa, fora = fora, casa

                # Placar
                score_casa = casa.get('score', '0')
                score_fora = fora.get('score', '0')
                placar = f"{score_casa} - {score_fora}"

                # --- EXTRAÇÃO DE ESTATÍSTICAS (NOVO) ---
                p_casa, p_fora = "50", "50"
                # A API às vezes traz estatísticas aqui
                for stat in casa.get('statistics', []):
                    if stat.get('name') == 'possessionPct':
                        p_casa = str(stat.get('displayValue')).replace('%','')
                for stat in fora.get('statistics', []):
                    if stat.get('name') == 'possessionPct':
                        p_fora = str(stat.get('displayValue')).replace('%','')

                jogos.append({
                    "id": id_jogo,
                    "status": status,
                    "campeonato": campeonato,
                    "time_casa": casa['team']['displayName'],
                    "logo_casa": casa['team'].get('logo', ''),
                    "time_fora": fora['team']['displayName'],
                    "logo_fora": fora['team'].get('logo', ''),
                    "placar": placar,
                    "posse_casa": p_casa,
                    "posse_fora": p_fora
                })
            except Exception as e:
                continue
        return jogos
    except Exception as e:
        print(f"❌ Erro na API: {e}")
        return []

def main():
    dados = capturar_ao_vivo_espn()
    if dados:
        try:
            supabase.table("jogos_ao_vivo").delete().neq("id", "OFF").execute()
            supabase.table("jogos_ao_vivo").upsert(dados).execute()
            print(f"🚀 Sucesso! {len(dados)} jogos atualizados com estatísticas.")
        except Exception as e:
            print(f"❌ Erro Supabase: {e}")

if __name__ == "__main__":
    main()
