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
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1"
}

def pegar_forma_detalhada(espn_id, team_id):
    """ Tenta extrair a forma real do calendário de jogos do time """
    try:
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        res = requests.get(url, timeout=10).json()
        eventos = res.get('events', [])
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
    except: return ""

def capturar_liga(liga_id, espn_id):
    print(f"📡 Processando {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    try:
        data = requests.get(url, timeout=20).json()
        entries = data['children'][0]['standings']['entries']
        lista = []
        
        for entry in entries:
            stats = entry['stats']
            team = entry['team']
            
            # 1. Tenta pegar a forma simples da própria tabela
            forma_bruta = ""
            for s in stats:
                if s.get('name') in ['summary', 'overall', 'form']:
                    forma_bruta = s.get('summary') or s.get('displayValue', '')
                    break
            
            # Limpa a forma bruta (remove números e espaços)
            forma_limpa = re.sub(r'[^WLTwedv]', '', forma_bruta).upper()
            forma_limpa = forma_limpa.replace('W','V').replace('L','D').replace('T','E')

            # 2. Se a forma da tabela estiver vazia, vai no calendário detalhado
            if not forma_limpa or len(forma_limpa) < 2:
                forma_limpa = pegar_forma_detalhada(espn_id, team['id'])

            # Conversão de números segura
            def to_int(name):
                try:
                    val = next(i['value'] for i in stats if i['name'] == name)
                    return int(float(val))
                except: return 0

            lista.append({
                "liga": liga_id,
                "posicao": to_int('rank'),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": to_int('gamesPlayed'),
                "pontos": to_int('points'),
                "sg": to_int('pointDifferential'),
                "forma": forma_limpa if forma_limpa else "S_DADOS"
            })
        return lista
    except Exception as e:
        print(f"❌ Erro {liga_id}: {e}")
        return []

def main():
    dados_totais = []
    for lid, eid in LIGAS.items():
        res = capturar_liga(lid, eid)
        if res: dados_totais.extend(res)
        time.sleep(1)

    if dados_totais:
        # Limpa e insere no Supabase
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_totais).execute()
        print(f"🚀 {len(dados_totais)} times atualizados com sucesso!")

if __name__ == "__main__":
    main()
