import os
import requests
import time
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

def sincronizar_tudo():
    dados_para_inserir = []

    for liga_nome, espn_slug in LIGAS.items():
        print(f"📡 Lendo Liga: {liga_nome}...")
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_slug}/standings"
        
        try:
            res = requests.get(url, timeout=20).json()
            entries = res.get('children', [{}])[0].get('standings', {}).get('entries', [])
            
            for entry in entries:
                team = entry.get('team', {})
                stats = entry.get('stats', [])
                team_name = team.get('displayName')

                # Tenta capturar a forma do campo 'summary' ou 'displayValue'
                forma_bruta = ""
                for s in stats:
                    if s.get('name') in ['summary', 'overall', 'form']:
                        forma_bruta = s.get('displayValue', '') or s.get('summary', '')
                        if forma_bruta: break

                # Limpa a forma: transforma W em V, L em D, T em E e remove o resto
                # Exemplo: "W D W L T" -> "VDVDE"
                forma_limpa = re.sub(r'[^WLTwedv]', '', forma_bruta).upper()
                forma_limpa = forma_limpa.replace('W','V').replace('L','D').replace('T','E')
                
                # Se ainda estiver vazio, gera um "E" baseado nos pontos (apenas para não ficar vazio)
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
