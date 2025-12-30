import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = "SEU_URL"
SUPABASE_KEY = "SUA_KEY"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1",
    "FR": "fra.1", "NL": "ned.1", "SA": "sau.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"📡 Atualizando {liga_id}...")
    
    # URL sem ano definido puxa sempre a temporada ATUAL ativa na ESPN
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=15).json()
        
        # A estrutura da ESPN varia: às vezes está em 'children', às vezes direto em 'standings'
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"⚠️ Aviso: Nenhuma entrada encontrada para {liga_id}")
            return

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Mapeamento dinâmico das estatísticas
            s = {item.get('name'): item.get('value') for item in stats_list}
            
            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": int(s.get('rank') or 0),
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": int(s.get('gamesPlayed') or 0),
                "vitorias": int(s.get('wins') or 0),
                "empates": int(s.get('ties') or 0),
                "derrotas": int(s.get('losses') or 0),
                "sg": int(s.get('pointDifferential') or 0),
                "pontos": int(s.get('points') or 0)
            }

            # Garante link seguro (HTTPS) para evitar erro de carregamento no site
            if dados["escudo"] and dados["escudo"].startswith("http:"):
                dados["escudo"] = dados["escudo"].replace("http:", "https:")

            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ {liga_id} sincronizada.")
        
    except Exception as e:
        print(f"❌ Erro crítico em {liga_id}: {e}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(2)
