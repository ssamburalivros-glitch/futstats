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

                # BUSCA MELHORADA DA FORMA
                forma_bruta = ""
                for s in stats:
                    # A ESPN costuma usar 'summary' ou 'shortAppearance' para a forma
                    if s.get('name') in ['summary', 'form', 'shortAppearance', 'overall']:
                        forma_bruta = s.get('displayValue', '') or s.get('summary', '')
                        # Se encontrou algo que contenha W, L ou T, interrompe a busca
                        if any(char in forma_bruta.upper() for char in ['W', 'L', 'T']):
                            break

                # Limpeza da forma: W -> V, L -> D, T -> E
                forma_limpa = re.sub(r'[^WLTwedv]', '', forma_bruta).upper()
                forma_limpa = forma_limpa.replace('W','V').replace('L','D').replace('T','E')
                
                # Se ainda estiver vazio (algumas ligas não fornecem), pegamos os últimos resultados 
                # do campo 'description' que às vezes contém algo como "Won 3, Lost 2"
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
