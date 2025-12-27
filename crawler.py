import os
import time
import requests
import re
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Dicionário atualizado com as novas ligas (FR, SA, NL)
LIGAS = {
    "BR": "bra.1", 
    "PL": "eng.1", 
    "ES": "esp.1",
    "DE": "ger.1", 
    "IT": "ita.1", 
    "PT": "por.1",
    "FR": "fra.1",    # França - Ligue 1
    "SA": "sau.1",    # Arábia Saudita - Pro League
    "NL": "ned.1"     # Holanda - Eredivisie
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
        res = requests.get(url, timeout=20).json()
        
        # --- LÓGICA DE NAVEGAÇÃO SEGURA ---
        # Tenta encontrar 'entries' em dois caminhos diferentes (Padrão ou Simplificado)
        entries = []
        if 'children' in res and len(res['children']) > 0:
            # Caminho padrão (BR, PL, ES...)
            entries = res['children'][0].get('standings', {}).get('entries', [])
        elif 'standings' in res:
            # Caminho simplificado (Muitas vezes usado na SA e NL)
            entries = res['standings'].get('entries', [])
        
        if not entries:
            print(f"⚠️ Aviso: Estrutura de dados da liga {liga_id} não reconhecida.")
            return

        lista = []
        for entry in entries:
            stats = entry.get('stats', [])
            team = entry.get('team', {})
            
            # Mapeamento dinâmico de estatísticas
            s_map = {s['name']: s['value'] for s in stats if 'name' in s}
            
            item = {
                "liga": liga_id,
                "posicao": entry.get('stats', [{}])[0].get('value'), # Geralmente o primeiro item é a posição
                "time": team.get('displayName'),
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": s_map.get('gamesPlayed', 0),
                "vitorias": s_map.get('wins', 0),
                "empates": s_map.get('ties', 0),
                "derrotas": s_map.get('losses', 0),
                "sg": s_map.get('pointDifferential', 0),
                "pontos": s_map.get('points', 0),
                "forma": pegar_forma_detalhada(espn_id, team.get('id'))
            }
            lista.append(item)
            
        # Salva no Supabase (Upsert para não duplicar)
        for time_data in lista:
            supabase.table("tabelas_ligas").upsert(time_data, on_conflict="liga,time").execute()

    except Exception as e:
        print(f"❌ Erro {liga_id}: {str(e)}")
        
def main():
    dados_totais = []
    for lid, eid in LIGAS.items():
        res = capturar_liga(lid, eid)
        if res: dados_totais.extend(res)
        time.sleep(1) # Delay para evitar bloqueio por excesso de requisições

    if dados_totais:
        # Limpa os dados antigos e insere os novos no Supabase
        try:
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            supabase.table("tabelas_ligas").insert(dados_totais).execute()
            print(f"🚀 Sucesso! {len(dados_totais)} times de {len(LIGAS)} ligas atualizados!")
        except Exception as e:
            print(f"❌ Erro ao subir para o Supabase: {e}")

if __name__ == "__main__":
    main()
