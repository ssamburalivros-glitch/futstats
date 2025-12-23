import os
import requests
import time
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
    try:
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        res = requests.get(url, timeout=10).json()
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
    except Exception as e:
        return ""

def sincronizar_tudo():
    dados_para_inserir = []

    for liga_nome, espn_slug in LIGAS.items():
        print(f"📡 Lendo Liga: {liga_nome}...")
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_slug}/standings"
        
        try:
            res = requests.get(url, timeout=20).json()
            # A estrutura da ESPN pode variar, tentamos acessar as entradas com segurança
            entries = res.get('children', [{}])[0].get('standings', {}).get('entries', [])
            
            if not entries:
                print(f"⚠️ Nenhuma entrada encontrada para {liga_nome}")
                continue

            for entry in entries:
                team = entry.get('team', {})
                stats = entry.get('stats', [])
                
                # Nome do time e ID
                team_name = team.get('displayName')
                team_id = team.get('id')

                # Conversão de números
                def get_stat(name):
                    try:
                        return int(float(next(s['value'] for s in stats if s['name'] == name)))
                    except: return 0

                forma = pegar_forma_detalhada(espn_slug, team_id)
                
                print(f"   ⚽ {team_name}: {forma if forma else 'S_DADOS'}")

                dados_para_inserir.append({
                    "liga": liga_nome,
                    "posicao": get_stat('rank'),
                    "time": team_name,
                    "escudo": team.get('logos', [{}])[0].get('href', ""),
                    "jogos": get_stat('gamesPlayed'),
                    "pontos": get_stat('points'),
                    "sg": get_stat('pointDifferential'),
                    "forma": forma if forma else "EEEEE"
                })
                time.sleep(0.1)
        except Exception as e:
            print(f"❌ Erro grave na liga {liga_nome}: {e}")

    if dados_para_inserir:
        print(f"📤 Tentando enviar {len(dados_para_inserir)} registros ao Supabase...")
        try:
            # Tenta limpar e inserir
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            result = supabase.table("tabelas_ligas").insert(dados_para_inserir).execute()
            print("🚀 SUCESSO! Dados refletidos no Supabase.")
        except Exception as e:
            print(f"❌ Erro ao salvar no Supabase: {e}")
    else:
        print("❓ Nenhum dado foi coletado para enviar.")

if __name__ == "__main__":
    sincronizar_tudo()
