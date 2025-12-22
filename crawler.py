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
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1"
}

def pegar_forma_real(espn_id, team_id):
    """Busca os últimos 5 jogos reais no calendário do time"""
    try:
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        res = requests.get(url, timeout=10)
        eventos = res.json().get('events', [])
        resultados = []
        
        for evento in reversed(eventos):
            if len(resultados) >= 5: break
            if evento['status']['type']['description'] == "Final":
                comp = evento['competitions'][0]
                meu_time = next(t for t in comp['competitors'] if t['id'] == team_id)
                if meu_time.get('winner') is True: resultados.append('V')
                elif meu_time.get('winner') is False:
                    adv = next(t for t in comp['competitors'] if t['id'] != team_id)
                    resultados.append('E' if adv.get('winner') is False else 'D')
        return "".join(reversed(resultados))
    except: return "EEEEE"

def capturar_liga(liga_id, espn_id):
    print(f"📡 Processando {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    try:
        data = requests.get(url, timeout=20).json()
        entries = data['children'][0]['standings']['entries']
        lista = []
        for entry in entries:
            s = entry['stats']
            team = entry['team']
            
            # Força a busca da forma real time por time
            forma_real = pegar_forma_real(espn_id, team['id'])
            
            lista.append({
                "liga": liga_id,
                "posicao": next(i['value'] for i in s if i['name'] == 'rank'),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": next(i['value'] for i in s if i['name'] == 'gamesPlayed'),
                "pontos": next(i['value'] for i in s if i['name'] == 'points'),
                "sg": next(i['value'] for i in s if i['name'] == 'pointDifferential'),
                "forma": forma_real
            })
        return lista
    except Exception as e:
        print(f"❌ Erro {liga_id}: {e}")
        return []

def main():
    dados = []
    for lid, eid in LIGAS.items():
        res = capturar_liga(lid, eid)
        if res: dados.extend(res)
        time.sleep(2) # Pausa para evitar bloqueio

    if dados:
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados).execute()
        print("🚀 TABELAS ATUALIZADAS!")

if __name__ == "__main__":
    main()
