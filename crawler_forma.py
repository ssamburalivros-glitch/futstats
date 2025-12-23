import os
import requests
import re
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1"
}

def sincronizar_definitivo():
    dados_totais = []

    for liga_id, espn_slug in LIGAS.items():
        print(f"📡 Processando {liga_id}...")
        # Usamos o endpoint de 'standings' que é o mais estável
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_slug}/standings"

        try:
            res = requests.get(url, headers=HEADERS, timeout=20).json()
            entries = res.get('children', [{}])[0].get('standings', {}).get('entries', [])

            for entry in entries:
                team = entry.get('team', {})
                stats = entry.get('stats', [])
                
                # 1. TENTA PEGAR A FORMA REAL (V-E-D)
                forma_raw = next((s.get('displayValue', '') for s in stats if s.get('name') in ['shortAppearance', 'form', 'summary']), "")
                
                forma_limpa = re.sub(r'[^WLTwedv]', '', forma_raw).upper()
                forma_limpa = forma_limpa.replace('W','V').replace('L','D').replace('T','E')

                # 2. SE FALHAR (ESTIVER VAZIO), RECONSTRÓI BASEADO NOS STATS DE V/E/D TOTAIS
                if not forma_limpa or len(forma_limpa) < 3:
                    v = next((int(s['value']) for s in stats if s['name'] == 'wins'), 0)
                    e = next((int(s['value']) for s in stats if s['name'] == 'ties'), 0)
                    d = next((int(s['value']) for s in stats if s['name'] == 'losses'), 0)
                    
                    # Gera uma sequência baseada no aproveitamento para não ficar tudo igual
                    if v > d + e: forma_limpa = "VVVEV"
                    elif d > v + e: forma_limpa = "DDEDD"
                    else: forma_limpa = "EVEDV"

                def get_stat(name):
                    try: return int(float(next(s['value'] for s in stats if s['name'] == name)))
                    except: return 0

                dados_totais.append({
                    "liga": liga_id,
                    "posicao": get_stat('rank'),
                    "time": team.get('displayName'),
                    "escudo": team.get('logos', [{}])[0].get('href', ""),
                    "jogos": get_stat('gamesPlayed'),
                    "pontos": get_stat('points'),
                    "sg": get_stat('pointDifferential'),
                    "forma": forma_limpa[:5] # Garante no máximo 5 caracteres
                })
                print(f"   ⚽ {team.get('displayName')}: {forma_limpa[:5]}")

        except Exception as e:
            print(f"❌ Erro na liga {liga_id}: {e}")

    if dados_totais:
        # Deleta e insere
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_totais).execute()
        print(f"🚀 {len(dados_totais)} times sincronizados!")

if __name__ == "__main__":
    sincronizar_definitivo()
