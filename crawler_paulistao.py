import requests
from bs4 import BeautifulSoup
from supabase import create_client
import os

# --- CONFIGURAÇÕES DO SUPABASE ---
# Se estiver no GitHub Actions, use segredos. Se for local, substitua as strings.
SUPABASE_URL = "SUA_URL_DO_SUPABASE"
SUPABASE_KEY = "SUA_CHAVE_ANON_OU_SERVICE_ROLE"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

URL_ESPN = "https://www.espn.com.br/futebol/competicao/_/id/87/campeonato-paulista"
headers = {"User-Agent": "Mozilla/5.0"}

def limpar_tabelas():
    # Limpa os dados antigos para inserir os novos (Refresh total)
    supabase.table("paulistao_classificacao").delete().neq("grupo", "vazio").execute()
    supabase.table("paulistao_jogos").delete().neq("time_casa", "vazio").execute()

def crawler():
    print("🚀 Iniciando Crawler Paulistão 2026...")
    response = requests.get(URL_ESPN, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')

    # 1. Extrair Classificação
    tabelas = soup.find_all("table", class_="Table")
    letras = ['A', 'B', 'C', 'D']
    
    classificacao_data = []
    for i, tabela in enumerate(tabelas[:4]):
        rows = tabela.find_all("tr")[1:]
        for row in rows:
            cols = row.find_all("td")
            if len(cols) < 2: continue
            
            nome = row.find("span", class_="TeamLink__Name").text.strip()
            logo = row.find("img")["src"] if row.find("img") else ""
            pts = cols[-1].text.strip()
            jgs = cols[2].text.strip()
            
            classificacao_data.append({
                "grupo": f"Grupo {letras[i]}",
                "time_nome": nome,
                "time_logo": logo,
                "pontos": int(pts) if pts.isdigit() else 0,
                "jogos": int(jgs) if jgs.isdigit() else 0
            })

    # 2. Extrair Jogos
    jogos_data = []
    cards = soup.find_all("section", class_="Scoreboard")
    for card in cards:
        try:
            casa = card.find("div", class_="ScoreboardScoreCell__Item--home")
            fora = card.find("div", class_="ScoreboardScoreCell__Item--away")
            
            status = card.find("div", class_="Scoreboard__Status").text.strip()
            is_live = "AO VIVO" in status.upper() or ":" not in status # Lógica simples para live

            jogos_data.append({
                "time_casa": casa.find("div", class_="ScoreboardScoreCell__Name").text.strip(),
                "time_fora": fora.find("div", class_="ScoreboardScoreCell__Name").text.strip(),
                "logo_casa": casa.find("img")["src"] if casa.find("img") else "",
                "logo_fora": fora.find("img")["src"] if fora.find("img") else "",
                "status_ou_horario": status,
                "is_live": is_live
            })
        except: continue

    # 3. Enviar para o Supabase
    limpar_tabelas()
    if classificacao_data:
        supabase.table("paulistao_classificacao").insert(classificacao_data).execute()
    if jogos_data:
        supabase.table("paulistao_jogos").insert(jogos_data).execute()
    
    print(f"✅ Sucesso! {len(classificacao_data)} times e {len(jogos_data)} jogos atualizados.")

if __name__ == "__main__":
    crawler()
