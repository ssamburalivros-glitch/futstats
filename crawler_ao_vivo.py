import os
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def capturar_ao_vivo_espn():
    print("📡 Acessando API Global de Placares da ESPN...")
    url = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        
        jogos = []
        eventos = data.get('events', [])

        for evento in eventos:
            try:
                # 0. EXTRAI O ID DO JOGO (CRITICAL PARA O BANCO NOVO)
                id_jogo = str(evento.get('id')) 

                # 1. Extrai o nome da competição
                campeonato = evento.get('shortName', 'Futebol')
                
                # 2. Trata o status
                status_raw = evento['status']['type']['shortDetail']
                if "Scheduled" in status_raw or "TM" in status_raw:
                    status = evento['status']['type']['detail']
                else:
                    status = status_raw

                # 3. Extrai dados dos times
                comp = evento['competitions'][0]
                casa = comp['competitors'][0]
                fora = comp['competitors'][1]
                
                if casa['homeAway'] != 'home':
                    casa, fora = fora, casa

                # 4. Busca os Logos
                logo_casa = casa['team'].get('logo', '')
                logo_fora = fora['team'].get('logo', '')

                nome_casa = casa['team']['displayName']
                nome_fora = fora['team']['displayName']
                
                # 5. Placar
                score_casa = casa.get('score', '0')
                score_fora = fora.get('score', '0')
                placar = f"{score_casa} - {score_fora}"

                jogos.append({
                    "id": id_jogo,          # NOVO: Necessário para a nova estrutura TEXT
                    "status": status,
                    "campeonato": campeonato,
                    "time_casa": nome_casa,
                    "logo_casa": logo_casa,
                    "time_fora": nome_fora,
                    "logo_fora": logo_fora,
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
            # 1. Limpa os dados antigos
            # Nota: neq("id", "0") é uma forma segura de deletar tudo
            supabase.table("jogos_ao_vivo").delete().neq("id", "OFF").execute()
            
            # 2. Insere os novos dados (Upsert é mais seguro que Insert)
            supabase.table("jogos_ao_vivo").upsert(dados).execute()
            print("🚀 Sucesso! Tabela jogos_ao_vivo atualizada com IDs e Logos.")
            
        except Exception as e:
            print(f"❌ Erro ao salvar no Supabase: {e}")
            print("DICA: Verifique se a coluna 'id' no banco é do tipo TEXT.")
    else:
        print("⚠️ A API não retornou dados de jogos para hoje.")

if __name__ == "__main__":
    main()
