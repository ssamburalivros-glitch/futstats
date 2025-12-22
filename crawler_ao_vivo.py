import os
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def capturar_ao_vivo_espn():
    print("📡 Acessando API de Placares da ESPN...")
    # URL da API de eventos (jogos) da ESPN
    url = "https://site.api.espn.com/apis/site/v2/sports/soccer/scoreboard"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        
        jogos = []
        eventos = data.get('events', [])

        for evento in eventos:
            try:
                # Status do jogo (ex: "70'", "Final", "14:00")
                status = evento['status']['type']['shortDetail']
                
                # Times e Placar
                competidores = evento['competitions'][0]['competitors']
                casa = next(team for team in competidores if team['homeAway'] == 'home')
                fora = next(team for team in competidores if team['homeAway'] == 'away')
                
                time_casa = casa['team']['displayName']
                time_fora = fora['team']['displayName']
                
                # Formata placar: "1 - 0"
                placar = f"{casa['score']} - {fora['score']}"

                jogos.append({
                    "status": status,
                    "time_casa": time_casa,
                    "time_fora": time_fora,
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
        print(f"✅ {len(dados)} jogos encontrados na ESPN. Atualizando Supabase...")
        # Limpa a tabela (utilizando o filtro para burlar restrição de delete total se necessário)
        supabase.table("jogos_ao_vivo").delete().neq("time_casa", "OFF").execute()
        # Insere novos dados
        supabase.table("jogos_ao_vivo").insert(dados).execute()
        print("🚀 Placares atualizados com sucesso via API!")
    else:
        print("⚠️ Nenhum jogo encontrado pela API no momento.")

if __name__ == "__main__":
    main()
