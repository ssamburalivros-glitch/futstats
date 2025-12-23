import os
import requests
import time
import re
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Header para simular um navegador real e evitar bloqueios
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1"
}

def pegar_forma_detalhada_com_header(espn_id, team_id):
    """Busca os últimos 5 jogos no calendário do time com proteção de User-Agent"""
    try:
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        res = requests.get(url, headers=HEADERS, timeout=10).json()
        eventos = res.get('events', [])
        resultados = []
        
        for evento in reversed(eventos):
            if len(resultados) >= 5: break
            if evento['status']['type']['description'] == "Final":
                comp = evento['competitions'][0]
                equipes = comp['competitors']
                meu_time = next(t for t in equipes if t['id'] == team_id)
                
                if meu_time.get('winner') is True:
                    resultados.append('V')
                elif meu_time.get('winner') is False:
                    adv = next(t for t in equipes if t['id'] != team_id)
                    resultados.append('E' if adv.get('winner') is False else 'D')
        
        return "".join(reversed(resultados))
    except:
        return ""

def sincronizar_tudo():
    dados_para_inserir = []

    for liga_nome, espn_slug in LIGAS.items():
        print(f"📡 Lendo Liga: {liga_nome}...")
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_slug}/standings"
        
        try:
            res = requests.get(url, headers=HEADERS, timeout=20).json()
            entries = res.get('children', [{}])[0].get('standings', {}).get('entries', [])
            
            for entry in entries:
                team = entry.get('team', {})
                stats = entry.get('stats', [])
                team_name = team.get('displayName')
                team_id = team.get('id')

                # 1. Tenta pegar a forma da própria tabela (mais rápido)
                forma_limpa = ""
                for s in stats:
                    if s.get('name') in ['summary', 'form', 'shortAppearance']:
                        val = s.get('displayValue', '') or s.get('summary', '')
                        forma_limpa = re.sub(r'[^WLTwedv]', '', val).upper()
                        forma_limpa = forma_limpa.replace('W','V').replace('L','D').replace('T','E')
                        if forma_limpa: break

                # 2. Se a tabela falhou (o que está acontecendo), busca no calendário individual
                if not forma_limpa or len(forma_limpa) < 2:
                    forma_limpa = pegar_forma_detalhada_com_header(espn_slug, team_id)

                # 3. Fallback final caso o time não tenha jogado nada
                if not forma_limpa:
                    forma_limpa = "EEEEE"

                def get_stat(name):
                    try: return int(float(next(s['value'] for s in stats if s['name'] == name)))
                    except: return 0

                print(f"   ⚽ {team_name}: {forma_limpa}")

                dados_para_inserir.append({
                    "liga": liga_nome,
                    "posicao": get_stat('rank'),
                    "time": team_name,
                    "escudo": team.get('logos', [{}])[0].get('href', ""),
                    "jogos": get_stat('gamesPlayed'),
                    "pontos": get_stat('points'),
                    "sg": get_stat('pointDifferential'),
                    "forma": forma_limpa
                })
                time.sleep(0.5) # Pausa amigável para não ser bloqueado

        except Exception as e:
            print(f"❌ Erro na liga {liga_nome}: {e}")

    if dados_para_inserir:
        try:
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            supabase.table("tabelas_ligas").insert(dados_para_inserir).execute()
            print(f"🚀 SUCESSO! {len(dados_para_inserir)} times no Supabase.")
        except Exception as e:
            print(f"❌ Erro Supabase: {e}")

if __name__ == "__main__":
    sincronizar_tudo()
