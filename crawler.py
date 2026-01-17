import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1",
    "FR": "fra.1", "SA": "sau.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"📡 Sincronizando: {liga_id}...")
    # Usamos o endpoint de API da ESPN, não o link do site
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=20).json()
        
        # A França (fra.1) costuma vir dentro de 'children' ou direto em 'standings'
        if 'children' in res and len(res['children']) > 0:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"⚠️ Sem dados para {liga_id}")
            return

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Normaliza tudo para minúsculo para não errar o nome do campo
            s = {str(item.get('name')).lower(): item.get('value') for item in stats_list}
            
            # MAPEAMENTO ESPECÍFICO PARA FRANÇA E OUTRAS
            vitorias = s.get('wins', 0)
            empates = s.get('ties', 0)
            derrotas = s.get('losses', 0)
            
            # Gols Pro: Na França a ESPN chama de 'pointsfor'
            gp = s.get('goalsfor') or s.get('pointsfor') or 0
            
            # Gols Contra: Na França a ESPN chama de 'pointsagainst'
            gc = s.get('goalsagainst') or s.get('pointsagainst') or 0
            
            sg = s.get('goaldifference') or s.get('pointdifferential') or (int(gp) - int(gc))
            pts = s.get('points', 0)
            jogos = s.get('gamesplayed', 0)
            pos = s.get('rank', 0)

            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": int(pos),
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": int(jogos),
                "vitorias": int(vitorias),
                "empates": int(empates),
                "derrotas": int(derrotas),
                "gols_pro": int(gp),
                "gols_contra": int(gc),
                "sg": int(sg),
                "pontos": int(pts)
            }

            # Envia ao Supabase
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ {liga_id} atualizada.")

    except Exception as e:
        print(f"❌ Erro na liga {liga_id}: {e}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1)
