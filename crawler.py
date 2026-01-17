import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
# No GitHub Actions, certifique-se que SUPABASE_URL e SUPABASE_KEY estão nos Secrets
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1",
    "FR": "fra.1", "SA": "sau.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"\n📡 Sincronizando: {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=20).json()
        
        # A estrutura da França às vezes muda, essa linha trata os dois caminhos possíveis
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"⚠️ Sem dados para {liga_id}")
            return

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # NORMALIZAÇÃO: Criamos um dicionário com tudo em MINÚSCULO para evitar erros
            s = {str(item.get('name')).lower(): item.get('value') for item in stats_list}
            
            # MAPEAMENTO INTELIGENTE (Busca por vários nomes possíveis que a ESPN usa)
            vitorias = s.get('wins') or s.get('victories') or 0
            empates = s.get('ties') or s.get('draws') or 0
            derrotas = s.get('losses') or 0
            
            # Gols Pro: tenta 'pointsfor' (comum na França) ou 'goalsfor'
            gp = s.get('pointsfor') or s.get('goalsfor') or 0
            # Gols Contra: tenta 'pointsagainst' ou 'goalsagainst'
            gc = s.get('pointsagainst') or s.get('goalsagainst') or 0
            
            sg = s.get('pointdifferential') or s.get('goaldifference') or (int(gp) - int(gc))
            pts = s.get('points') or 0
            jogos = s.get('gamesplayed') or 0
            pos = s.get('rank') or 0

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

            # Upsert no Supabase
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()
            
            # Print especial para debug da França
            if liga_id == "FR" and pos == 1:
                print(f"🇫🇷 Líder da França: {dados['time']} | GP: {dados['gols_pro']} | GC: {dados['gols_contra']}")

        print(f"✅ {liga_id} atualizada com sucesso.")

    except Exception as e:
        print(f"❌ Erro na liga {liga_id}: {e}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1)
