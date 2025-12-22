import os
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
# Certifique-se de que estas variáveis estão configuradas no seu GitHub Secrets
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def capturar_ao_vivo_espn():
    print("📡 Acessando API Global de Placares da ESPN...")
    # Endpoint que traz todos os jogos monitorados pela ESPN no dia
    url = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        
        jogos = []
        eventos = data.get('events', [])

        for evento in eventos:
            try:
                # 1. Extrai o nome da competição
                campeonato = evento.get('shortName', 'Futebol')
                
                # 2. Trata o status (Horário ou Minutagem)
                status_raw = evento['status']['type']['shortDetail']
                if "Scheduled" in status_raw or "TM" in status_raw:
                    status = evento['status']['type']['detail'] # Ex: "17:00"
                else:
                    status = status_raw # Ex: "45'", "HT", "Final"

                # 3. Extrai dados dos times
                comp = evento['competitions'][0]
                casa = comp['competitors'][0]
                fora = comp['competitors'][1]
                
                # Garante que o time da casa seja o 'home'
                if casa['homeAway'] != 'home':
                    casa, fora = fora, casa

                # 4. Busca os Logos (URLs das imagens)
                # Tentamos pegar o logo principal. Caso não exista, enviamos vazio.
                logo_casa = casa['team'].get('logo', '')
                logo_fora = fora['team'].get('logo', '')

                nome_casa = casa['team']['displayName']
                nome_fora = fora['team']['displayName']
                
                # 5. Placar
                score_casa = casa.get('score', '0')
                score_fora = fora.get('score', '0')
                placar = f"{score_casa} - {score_fora}"

                jogos.append({
                    "status": status,
                    "campeonato": campeonato,
                    "time_casa": nome_casa,
                    "logo_casa": logo_casa, # SALVA A URL DO LOGO
                    "time_fora": nome_fora,
                    "logo_fora": logo_fora, # SALVA A URL DO LOGO
                    "placar": placar
                })
            except Exception as e:
                print(f"⚠️ Erro ao processar jogo individual: {e}")
                continue
        
        return jogos
    except Exception as e:
        print(f"❌ Erro crítico na API ESPN: {e}")
        return []

def main():
    dados = capturar_ao_vivo_espn()
    
    if dados:
        print(f"✅ {len(dados)} jogos encontrados. Atualizando Supabase...")
        try:
            # Limpa os dados antigos para evitar duplicidade
            supabase.table("jogos_ao_vivo").delete().neq("time_casa", "OFF").execute()
            
            # Insere os novos dados com os logos
            supabase.table("jogos_ao_vivo").insert(dados).execute()
            print("🚀 Sucesso! Tabela jogos_ao_vivo atualizada com logos.")
        except Exception as e:
            print(f"❌ Erro ao salvar no Supabase: {e}")
    else:
        print("⚠️ A API não retornou dados de jogos para hoje.")

if __name__ == "__main__":
    main()
