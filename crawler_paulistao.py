import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
import datetime

# --- CONFIGURAÇÃO DE CONEXÃO (GITHUB SECRETS) ---
# O script busca automaticamente as chaves configuradas no GitHub Settings > Secrets
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def iniciar_supabase():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ ERRO: SUPABASE_URL ou SUPABASE_KEY não encontrados.")
        print("Certifique-se de configurar as 'Secrets' no seu repositório GitHub.")
        return None
    return create_client(SUPABASE_URL, SUPABASE_KEY)

# URL da ESPN para o Campeonato Paulista
URL_ESPN = "https://www.espn.com.br/futebol/competicao/_/id/87/campeonato-paulista"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
}

def crawler():
    supabase = iniciar_supabase()
    if not supabase:
        return

    print(f"🕒 Início do Crawler: {datetime.datetime.now().strftime('%H:%M:%S')}")
    
    try:
        response = requests.get(URL_ESPN, headers=HEADERS, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, 'html.parser')

        # --- 1. EXTRAÇÃO DA CLASSIFICAÇÃO (GRUPOS) ---
        print("🔍 Coletando tabelas de classificação...")
        tabelas = soup.find_all("table", class_="Table")
        letras_grupos = ['A', 'B', 'C', 'D']
        classificacao_payload = []

        for i, tabela in enumerate(tabelas[:4]):
            if i >= len(letras_grupos): break
            rows = tabela.find_all("tr")[1:] # Ignora o header
            
            for row in rows:
                cols = row.find_all("td")
                if len(cols) < 2: continue
                
                try:
                    nome_time = row.find("span", class_="TeamLink__Name").text.strip()
                    logo_time = row.find("img")["src"] if row.find("img") else ""
                    # Posições comuns na ESPN: J (índice 2), PTS (último índice)
                    jogos = cols[2].text.strip()
                    pontos = cols[-1].text.strip()

                    classificacao_payload.append({
                        "grupo": f"Grupo {letras_grupos[i]}",
                        "time_nome": nome_time,
                        "time_logo": logo_time,
                        "pontos": int(pontos) if pontos.isdigit() else 0,
                        "jogos": int(jogos) if jogos.isdigit() else 0
                    })
                except Exception as e:
                    print(f"⚠️ Erro ao processar linha de time: {e}")

        # --- 2. EXTRAÇÃO DOS JOGOS ---
        print("🔍 Coletando agenda de jogos...")
        jogos_payload = []
        cards_jogos = soup.find_all("section", class_="Scoreboard")

        for card in cards_jogos:
            try:
                casa = card.find("div", class_="ScoreboardScoreCell__Item--home")
                fora = card.find("div", class_="ScoreboardScoreCell__Item--away")
                status = card.find("div", class_="Scoreboard__Status").text.strip()
                
                # Verifica se é Live (se houver placar ou tempo rolando)
                is_live = "AO VIVO" in status.upper() or "'" in status

                jogos_payload.append({
                    "time_casa": casa.find("div", class_="ScoreboardScoreCell__Name").text.strip(),
                    "time_fora": fora.find("div", class_="ScoreboardScoreCell__Name").text.strip(),
                    "logo_casa": casa.find("img")["src"] if casa.find("img") else "",
                    "logo_fora": fora.find("img")["src"] if fora.find("img") else "",
                    "status_ou_horario": status,
                    "is_live": is_live
                })
            except Exception as e:
                continue

        # --- 3. ATUALIZAÇÃO NO SUPABASE (DELETE + INSERT) ---
        print("📤 Enviando dados para o Supabase...")
        
        # Limpa as tabelas antes de inserir os novos dados (Refresh total)
        supabase.table("paulistao_classificacao").delete().neq("time_nome", "null").execute()
        supabase.table("paulistao_jogos").delete().neq("time_casa", "null").execute()

        if classificacao_payload:
            supabase.table("paulistao_classificacao").insert(classificacao_payload).execute()
        
        if jogos_payload:
            supabase.table("paulistao_jogos").insert(jogos_payload).execute()

        print(f"✅ Sucesso! {len(classificacao_payload)} times e {len(jogos_payload)} jogos atualizados.")

    except Exception as e:
        print(f"❌ Erro crítico no Crawler: {e}")

if __name__ == "__main__":
    crawler()
