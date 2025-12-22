import os
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def capturar_ao_vivo_espn():
    print("📡 Acessando API Global de Placares da ESPN...")
    # Endpoint global para pegar todos os jogos de futebol do dia
    url = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        
        jogos = []
        eventos = data.get('events', [])

        for evento in eventos:
            try:
                # Extrai o nome do campeonato (ex: English Premier League)
                campeonato = evento.get('shortName', 'Futebol')
                
                # Trata o status: Se for agendado, mostra o horário. Se estiver rolando, mostra o tempo.
                status_raw = evento['status']['type']['shortDetail']
                if "Scheduled" in status_raw or "TM" in status_raw:
                    status = evento['status']['type']['detail'] # Ex: "17:00"
                else:
                    status = status_raw # Ex: "45'", "HT", "Final"

                comp = evento['competitions'][0]
                casa = comp['competitors'][0]
                fora = comp['competitors'][1]
                
                # Garante ordem correta Home/Away
                if casa['homeAway'] != 'home':
                    casa, fora = fora, casa

                nome_casa = casa['team']['displayName']
                nome_fora = fora['team']['displayName']
                score_casa = casa.get('score', '0')
                score_fora = fora.get('score', '0')
                
                placar = f"{score_casa} - {score_fora}"

                jogos.append({
                    "status": status,
                    "campeonato": campeonato,
                    "time_casa": nome_casa,
                    "time_fora": nome_fora,
                    "placar": placar
                })
            except:
                continue
        
        return jogos
    except Exception as e:
        print(f"❌ Erro na API ESPN: {e}")
        return []

def main():
    dados = capturar_ao_vivo_espn()
    
    if dados:
        print(f"✅ {len(dados)} jogos encontrados. Atualizando Supabase...")
        # Limpa e insere na tabela jogos_ao_vivo
        supabase.table("jogos_ao_vivo").delete().neq("time_casa", "OFF").execute()
        supabase.table("jogos_ao_vivo").insert(dados).execute()
        print("🚀 Placares e Campeonatos atualizados!")
    else:
        print("⚠️ Ninguém jogando agora.")

if __name__ == "__main__":
    main()
