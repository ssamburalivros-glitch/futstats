import os
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def capturar_ao_vivo_espn():
    print("📡 Acessando API Global de Placares da ESPN...")
    # Endpoint alternativo que costuma ser mais completo para futebol mundial
    url = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        
        jogos = []
        eventos = data.get('events', [])

        for evento in eventos:
            try:
                # Extrai o status (Ex: 15', HT, Final, ou Horário)
                status = evento['status']['type']['shortDetail']
                
                comp = evento['competitions'][0]
                casa = comp['competitors'][0] # Time da casa
                fora = comp['competitors'][1] # Time de fora
                
                # Inverte se a posição home/away estiver trocada na API
                if casa['homeAway'] != 'home':
                    casa, fora = fora, casa

                nome_casa = casa['team']['displayName']
                nome_fora = fora['team']['displayName']
                score_casa = casa.get('score', '0')
                score_fora = fora.get('score', '0')
                
                placar = f"{score_casa} - {score_fora}"

                jogos.append({
                    "status": status,
                    "time_casa": nome_casa,
                    "time_fora": nome_fora,
                    "placar": placar
                })
            except Exception as e:
                continue
        
        return jogos
    except Exception as e:
        print(f"❌ Erro na API ESPN: {e}")
        return []

def main():
    dados = capturar_ao_vivo_espn()
    
    if dados:
        print(f"✅ {len(dados)} jogos encontrados. Atualizando Supabase...")
        # Limpa e insere
        supabase.table("jogos_ao_vivo").delete().neq("time_casa", "OFF").execute()
        supabase.table("jogos_ao_vivo").insert(dados).execute()
        print("🚀 Placares atualizados!")
    else:
        print("⚠️ A API não retornou jogos agora. Tente novamente em instantes.")

if __name__ == "__main__":
    main()
