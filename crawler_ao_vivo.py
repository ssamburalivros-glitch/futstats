import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def capturar_ao_vivo():
    print("📡 Acessando Placar de Futebol...")
    url = "https://www.placardefutebol.com.br/jogos-de-hoje"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=30)
        soup = BeautifulSoup(response.content, 'html.parser')
        
        jogos = []
        # Tenta encontrar os blocos de partidas
        containers = soup.find_all('div', class_='container-content') or soup.find_all('a', class_='match-link')

        for item in containers:
            try:
                # Busca status (Tempo de jogo ou 'Encerrado')
                status_el = item.select_one('.status-name, .match-status')
                status = status_el.text.strip() if status_el else "Hoje"
                
                # Busca times
                casa_el = item.select_one('.team-home h3, .name-home')
                fora_el = item.select_one('.team-away h3, .name-away')
                
                # Busca placar
                placar_el = item.select_one('.match-score, .score')
                
                if casa_el and fora_el:
                    time_casa = casa_el.text.strip()
                    time_fora = fora_el.text.strip()
                    placar = placar_el.text.strip().replace('\n', ' ') if placar_el else "vs"

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
        print(f"❌ Erro ao acessar site: {e}")
        return []

def main():
    dados = capturar_ao_vivo()
    
    if dados:
        print(f"✅ {len(dados)} jogos encontrados. Limpando e salvando no Supabase...")
        # Deleta dados antigos
        supabase.table("jogos_ao_vivo").delete().neq("time_casa", "OFF").execute()
        # Insere novos
        supabase.table("jogos_ao_vivo").insert(dados).execute()
        print("🚀 Sucesso! Tabela atualizada.")
    else:
        print("⚠️ Nenhum jogo encontrado. Verifique se o site mudou a estrutura.")

if __name__ == "__main__":
    main()
