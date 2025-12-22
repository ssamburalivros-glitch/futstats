import os
import time
import requests
import re
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "bra.1",
    "PL": "eng.1",
    "ES": "esp.1",
    "DE": "ger.1",
    "IT": "ita.1",
    "PT": "por.1"
}

def pegar_forma_fallback(espn_id, team_id):
    """ Busca os últimos 5 jogos reais no calendário do time se a tabela falhar """
    try:
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        res = requests.get(url, timeout=10)
        eventos = res.json().get('events', [])
        resultados = []
        
        for evento in reversed(eventos):
            if len(resultados) >= 5: break
            if evento['status']['type']['description'] == "Final":
                meu_time = next(t for t in evento['competitions'][0]['competitors'] if t['id'] == team_id)
                if meu_time.get('winner') is True: resultados.append('V')
                elif meu_time.get('winner') is False:
                    adv = next(t for t in evento['competitions'][0]['competitors'] if t['id'] != team_id)
                    resultados.append('E' if adv.get('winner') is False else 'D')
        return "".join(reversed(resultados))
    except: return ""

def capturar_liga(liga_id, espn_id):
    print(f"📡 Processando {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    try:
        data = requests.get(url, timeout=20).json()
        entries = data['children'][0]['standings']['entries']
        times_lista = []

        for entry in entries:
            stats = entry['stats']
            team = entry['team']
            
            # Captura de números
            get_s = lambda n: int(next(s['value'] for s in stats if s['name'] == n))
            
            # Captura de Forma
            forma = next((s.get('summary', '') for s in stats if s['name'] == 'summary'), "")
            if not forma or any(c.isdigit() for c in forma):
                forma = pegar_fallback(espn_id, team['id'])
            
            # Tradução e Limpeza
            forma = forma.upper().replace('W','V').replace('L','D').replace('T','E')
            forma = re.sub(r'[^VED]', '', forma)

            times_lista.append({
                "liga": liga_id,
                "posicao": get_s('rank'),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": get_s('gamesPlayed'),
                "pontos": get_s('points'),
                "sg": get_s('pointDifferential'),
                "forma": forma[-5:] if forma else "S_DADOS"
            })
        return times_lista
    except Exception as e:
        print(f"❌ Erro {liga_id}: {e}")
        return []

def main():
    final_data = []
    for lid, eid in LIGAS.items():
        res = capturar_liga(lid, eid)
        final_data.extend(res)
        time.sleep(1)

    if final_data:
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(final_data).execute()
        print("🚀 Banco atualizado!")

if __name__ == "__main__":
    main()
