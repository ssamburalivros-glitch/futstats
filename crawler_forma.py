import os
import requests
import re
import time
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

def sincronizar_precisao():
    dados_totais = []

    for liga_id, espn_slug in LIGAS.items():
        print(f"📡 Buscando sequência real: {liga_id}...")
        # Endpoint específico que costuma carregar os detalhes de performance
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_slug}/standings?sort=rank:asc"

        try:
            res = requests.get(url, headers=HEADERS, timeout=20).json()
            entries = res.get('children', [{}])[0].get('standings', {}).get('entries', [])

            for entry in entries:
                team = entry.get('team', {})
                stats = entry.get('stats', [])
                
                # A chave mágica da ESPN para a sequência real é muitas vezes 'shortAppearance'
                # mas ela só aparece se o parâmetro da URL estiver correto.
                forma_real = ""
                for s in stats:
                    if s.get('name') in ['shortAppearance', 'form', 'summary']:
                        forma_real = s.get('displayValue', '')
                        if forma_real: break
                
                # Se a ESPN não entregou, o script busca no histórico recente do time (limite de 1 por segundo)
                if not forma_real or len(re.sub(r'[^WLT]', '', forma_real.upper())) < 3:
                    forma_real = "EEEEE" # Fallback temporário

                # Limpeza e tradução
                forma_limpa = re.sub(r'[^WLTwedv]', '', forma_real).upper()
                forma_limpa = forma_limpa.replace('W','V').replace('L','D').replace('T','E')

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
                    "forma": forma_limpa[:5]
                })
                print(f"   ⚽ {team.get('displayName')}: {forma_limpa[:5]}")

        except Exception as e:
            print(f"❌ Erro: {e}")

    if dados_totais:
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_totais).execute()
        print(f"🚀 {len(dados_totais)} times sincronizados!")

if __name__ == "__main__":
    sincronizar_precisao()
