import os
import time
import requests
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
    "PT": "por.1",
    "FR": "fra.1", 
    "SA": "sau.1", 
    "NL": "ned.1"
}

def pegar_forma_detalhada(espn_id, team_id):
    """ Extrai a forma (V-E-D) dos últimos 5 jogos """
    try:
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        res = requests.get(url, timeout=10).json()
        eventos = res.get('events', [])
        resultados = []
        
        for evento in reversed(eventos):
            if len(resultados) >= 5: break
            if evento['status']['type']['description'] == "Final":
                comp = evento['competitions'][0]
                try:
                    meu_time = next(t for t in comp['competitors'] if t['id'] == team_id)
                    if meu_time.get('winner') is True: resultados.append('V')
                    elif meu_time.get('winner') is False:
                        adv = next(t for t in comp['competitors'] if t['id'] != team_id)
                        resultados.append('E' if adv.get('winner') is False else 'D')
                except StopIteration: continue
        return "".join(reversed(resultados))
    except: return "EEEEE"

def capturar_liga(liga_id, espn_id):
    print(f"📡 Processando {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=20).json()
        
        # --- NAVEGAÇÃO SEGURA NA ESTRUTURA DA API ---
        entries = []
        if 'children' in res and len(res['children']) > 0:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        elif 'standings' in res:
            entries = res['standings'].get('entries', [])

        if not entries:
            print(f"⚠️ Aviso: Estrutura de dados da liga {liga_id} não reconhecida.")
            return

        for entry in entries:
            team_data = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Converte a lista de stats em um dicionário fácil de ler
            # Evita o erro 'value' verificando se a chave existe antes
            s = {item.get('name'): item.get('value') for item in stats_list if 'name' in item}
            
            # Mapeamento dos campos (Estatísticas)
            dados_finais = {
                "liga": liga_id,
                "posicao": int(s.get('rank', 0)) if s.get('rank') is not None else 0,
                "time": team_data.get('displayName', 'Desconhecido'),
                "escudo": team_data.get('logos', [{}])[0].get('href') if team_data.get('logos') else "",
                "jogos": int(s.get('gamesPlayed', 0)),
                "vitorias": int(s.get('wins', 0)),
                "empates": int(s.get('ties', 0)),
                "derrotas": int(s.get('losses', 0)),
                "sg": int(s.get('pointDifferential', 0)),
                "pontos": int(s.get('points', 0)),
                "forma": pegar_forma_detalhada(espn_id, team_data.get('id'))
            }

            # Envia para o Supabase (Upsert baseado em Liga e Time)
            try:
                supabase.table("tabelas_ligas").upsert(dados_finais).execute()
            except Exception as e:
                print(f"❌ Erro ao salvar {dados_finais['time']}: {e}")

        print(f"✅ {liga_id} atualizada com sucesso!")

    except Exception as e:
        print(f"❌ Erro Crítico em {liga_id}: {str(e)}")

# --- EXECUÇÃO ---
if __name__ == "__main__":
    for liga, espn_code in LIGAS.items():
        capturar_liga(liga, espn_code)
        time.sleep(1) # Delay amigável
    print("🚀 Processo concluído!")
