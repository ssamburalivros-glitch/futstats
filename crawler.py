import os
import time
import requests
from supabase import create_client

# Configurações de API (GitHub Secrets)
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Ligas Europeias Ativas em Janeiro/2026
LIGAS = {
    "PL": "eng.1", 
    "ES": "esp.1", 
    "DE": "ger.1", 
    "IT": "ita.1", 
    "PT": "por.1", 
    "FR": "fra.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"\n📡 --- INICIANDO LIGA: {liga_id} ---")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        response = requests.get(url, timeout=20)
        res = response.json()

        # Tratamento para diferentes estruturas da API ESPN
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"⚠️ Nenhuma entrada encontrada para {liga_id}")
            return

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # MAPEAMENTO POR SIGLA (Abbreviation)
            # A ESPN usa: W (Wins), D (Draws), L (Losses), F (Goals For), A (Goals Against)
            s = {item.get('abbreviation'): item.get('value') for item in stats_list}
            
            # Extração dos valores (usando .get para evitar erros se a sigla sumir)
            v = int(s.get('W', 0))
            e = int(s.get('D', 0))
            d = int(s.get('L', 0))
            gp = int(s.get('F', 0))
            gc = int(s.get('A', 0))
            pts = int(s.get('P', 0))
            jogos = int(s.get('GP', 0))
            pos = int(s.get('R', 0))
            sg = int(s.get('GD', gp - gc)) # Se não vier 'GD', calcula GP - GC

            time_nome = team.get('displayName')
            
            # LOG para você conferir no GitHub Actions
            print(f"🔹 {time_nome}: {pts}pts | {gp} GP | {gc} GC")

            dados = {
                "liga": liga_id,
                "time": time_nome,
                "posicao": pos,
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": jogos,
                "vitorias": v,
                "empates": e,
                "derrotas": d,
                "gols_pro": gp,
                "gols_contra": gc,
                "sg": sg,
                "pontos": pts
            }

            # Envia/Atualiza no Supabase
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ Liga {liga_id} sincronizada com sucesso!")

    except Exception as err:
        print(f"❌ Erro crítico na liga {liga_id}: {err}")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(2) # Pausa para evitar bloqueio da API
