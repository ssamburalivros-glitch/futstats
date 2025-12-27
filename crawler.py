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
    "FR": "fra.1", "SA": "sau.1", "NL": "ned.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"📡 Processando {liga_id}...")
    
    # URL 1: Padrão | URL 2: Backup (Comum para Saudita/Holanda)
    urls = [
        f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings",
        f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/seasons/2024/standings"
    ]
    
    entries = []
    for url in urls:
        try:
            res = requests.get(url, timeout=15).json()
            # Tenta encontrar no caminho 'children'
            if 'children' in res:
                entries = res['children'][0].get('standings', {}).get('entries', [])
            # Tenta encontrar no caminho direto 'standings'
            elif 'standings' in res:
                entries = res['standings'].get('entries', [])
            
            if entries: break
        except: continue

    if not entries:
        print(f"❌ Erro: Não foi possível obter dados para {liga_id}")
        return

    for entry in entries:
        team = entry.get('team', {})
        stats_list = entry.get('stats', [])
        s = {item.get('name'): item.get('value') for item in stats_list if 'name' in item}
        
        # Criamos o objeto de dados exatamente como o banco espera
        dados = {
            "liga": liga_id,
            "time": team.get('displayName'),
            "posicao": int(s.get('rank', 0) or 0),
            "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
            "jogos": int(s.get('gamesPlayed', 0) or 0),
            "vitorias": int(s.get('wins', 0) or 0),
            "empates": int(s.get('ties', 0) or 0),
            "derrotas": int(s.get('losses', 0) or 0),
            "sg": int(s.get('pointDifferential', 0) or 0),
            "pontos": int(s.get('points', 0) or 0)
        }

        try:
            # O SEGREDO: on_conflict especifica quais colunas formam a chave única
            # para que o Supabase faça UPDATE em vez de INSERT
            supabase.table("tabelas_ligas").upsert(
                dados, 
                on_conflict="liga, time"
            ).execute()
        except Exception as e:
            print(f"❌ Erro ao salvar {dados['time']}: {e}")

    print(f"✅ {liga_id} atualizada!")

if __name__ == "__main__":
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1)
