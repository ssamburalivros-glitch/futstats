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
        
        # Inverte para pegar os mais recentes
        for evento in reversed(eventos):
            if len(resultados) >= 5: break
            
            # Só pega jogos que já terminaram
            if evento['status']['type']['description'] == "Final":
                competicao = evento['competitions'][0]
                equipes = competicao['competitors']
                
                meu_time = next(t for t in equipes if t['id'] == team_id)
                
                if meu_time.get('winner') is True:
                    resultados.append('V')
                elif meu_time.get('winner') is False:
                    # Verifica se o adversário venceu ou se foi empate
                    adversario = next(t for t in equipes if t['id'] != team_id)
                    if adversario.get('winner') is False:
                        resultados.append('E')
                    else:
                        resultados.append('D')
        
        return "".join(reversed(resultados))
    except Exception as e:
        return ""

def capturar_liga(liga_id, espn_id):
    print(f"📡 Processando {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        entries = data['children'][0]['standings']['entries']
        times_lista = []

        for entry in entries:
            stats = entry['stats']
            team = entry['team']
            
            # Função auxiliar segura para pegar valores numéricos
            def get_stat(name):
                for s in stats:
                    if s.get('name') == name:
                        return int(s.get('value', 0))
                return 0
            
            # Tenta pegar a forma da tabela principal
            forma = ""
            for s in stats:
                if s.get('name') in ['summary', 'overall', 'form']:
                    forma = s.get('summary') or s.get('displayValue', '')
                    break
            
            # Se a forma veio com números (ex: 1-1-0) ou vazia, usa o fallback real
            if not forma or any(c.isdigit() for c in forma):
                forma = pegar_forma_fallback(espn_id, team['id'])
            
            # Tradução e Limpeza rigorosa (V, E, D apenas)
            forma = forma.upper().replace('W','V').replace('L','D').replace('T','E')
            forma = re.sub(r'[^VED]', '', forma)

            times_lista.append({
                "liga": liga_id,
                "posicao": get_stat('rank'),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": get_stat('gamesPlayed'),
                "pontos": get_stat('points'),
                "sg": get_stat('pointDifferential'),
                "forma": forma[-5:] if forma else "S_DADOS"
            })
            
        print(f"✅ {liga_id}: {len(times_lista)} times processados.")
        return times_lista
    except Exception as e:
        print(f"❌ Erro em {liga_id}: {e}")
        return []

def main():
    final_data = []
    for lid, eid in LIGAS.items():
        res = capturar_liga(lid, eid)
        if res:
            final_data.extend(res)
        time.sleep(1)

    if final_data:
        print(f"📤 Atualizando Supabase com {len(final_data)} registros...")
        # Limpa e insere
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(final_data).execute()
        print("🚀 SUCESSO!")

if __name__ == "__main__":
    main()
