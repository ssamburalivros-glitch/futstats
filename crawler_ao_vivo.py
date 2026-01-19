import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = "https://sihunefyfkecumbiyxva.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpaHVuZWZ5ZmtlY3VtYml5eHZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MDg5MzgsImV4cCI6MjA4MTk4NDkzOH0.qgjbdCe1hfzcuglS6AAj6Ua0t45C2GOKH4r3JCpRn_A"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def extrair_posse(id_jogo):
    """ Busca a posse de bola real dentro do Summary do jogo """
    try:
        url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={id_jogo}"
        r = requests.get(url, timeout=10)
        data = r.json()
        
        # O caminho da posse na ESPN: boxscore -> teams -> statistics
        p_casa, p_fora = 50, 50
        teams = data.get('boxscore', {}).get('teams', [])
        
        for i, team in enumerate(teams):
            stats = team.get('statistics', [])
            for s in stats:
                if s.get('name') == 'possessionPct':
                    valor = int(float(s.get('displayValue', '50').replace('%', '')))
                    if i == 0: p_casa = valor
                    else: p_fora = valor
        return p_casa, p_fora
    except:
        return 50, 50

def iniciar_crawler():
    print("📡 Iniciando Varredura...")
    url_base = "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard"
    
    try:
        res = requests.get(url_base)
        eventos = res.json().get('events', [])
        jogos_db = []

        for ev in eventos:
            id_jogo = ev['id']
            # Detalhes básicos
            status = ev['status']['type']['shortDetail']
            campeonato = ev['shortName']
            
            comp = ev['competitions'][0]
            casa = comp['competitors'][0]
            fora = comp['competitors'][1]
            if casa['homeAway'] != 'home': casa, fora = fora, casa

            # BUSCA POSSE REAL (Aqui é onde o 50 vira o valor real)
            print(f"📊 Processando {casa['team']['shortDisplayName']} x {fora['team']['shortDisplayName']}...")
            posse_casa, posse_fora = extrair_posse(id_jogo)

            jogos_db.append({
                "id": str(id_jogo),
                "time_casa": casa['team']['displayName'],
                "logo_casa": casa['team'].get('logo', ''),
                "time_fora": fora['team']['displayName'],
                "logo_fora": fora['team'].get('logo', ''),
                "placar": f"{casa.get('score', '0')} - {fora.get('score', '0')}",
                "status": status,
                "campeonato": campeonato,
                "posse_casa": posse_casa,
                "posse_fora": posse_fora
            })

        if jogos_db:
            # Limpa o banco e insere os novos com posse real
            supabase.table("jogos_ao_vivo").delete().neq("id", "0").execute()
            supabase.table("jogos_ao_vivo").insert(jogos_db).execute()
            print(f"🚀 Sincronização Concluída! {len(jogos_db)} jogos atualizados.")
            
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    iniciar_crawler()
