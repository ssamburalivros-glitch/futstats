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

def capturar_forma_equipe(espn_id, team_id):
    """Analisa as últimas 5 partidas finalizadas para gerar a string VED"""
    try:
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        response = requests.get(url, timeout=10)
        data = response.json()
        eventos = data.get('events', [])
        
        resultados = []
        # Percorremos do mais recente para o mais antigo
        for evento in reversed(eventos):
            if len(resultados) >= 5:
                break
            
            # Verificamos se o jogo já terminou
            if evento['status']['type']['description'] == "Final":
                competicao = evento['competitions'][0]
                equipes = competicao['competitors']
                
                # Identifica a nossa equipe na partida
                meu_time = next(t for t in equipes if t['id'] == team_id)
                
                # Lógica de Vitória/Empate/Derrota
                if meu_time.get('winner') is True:
                    resultados.append('V')
                elif meu_time.get('winner') is False:
                    # Se o meu time não venceu, verificamos se o outro também não (Empate)
                    adversario = next(t for t in equipes if t['id'] != team_id)
                    if adversario.get('winner') is False:
                        resultados.append('E')
                    else:
                        resultados.append('D')
        
        # Inverte para manter a ordem cronológica (mais antigo -> mais recente)
        return "".join(reversed(resultados))
    except Exception as e:
        print(f"Erro ao buscar forma do time {team_id}: {e}")
        return ""

def atualizar_forma_total():
    # 1. Busca todos os times cadastrados no seu Supabase
    try:
        print("🔍 Buscando times no banco de dados...")
        response = supabase.table("tabelas_ligas").select("time, liga, escudo").execute()
        times_db = response.data
        
        # 2. Como precisamos do ID da ESPN que não está no seu banco, 
        # vamos buscar a classificação atual para mapear Nome -> ID
        for liga_nome, espn_slug in LIGAS.items():
            print(f"📡 Processando Forma: {liga_nome}")
            url_standings = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_slug}/standings"
            standings_data = requests.get(url_standings).json()
            
            entries = standings_data['children'][0]['standings']['entries']
            
            for entry in entries:
                team_info = entry['team']
                team_name = team_info['displayName']
                team_id = team_info['id']
                
                # Busca a forma detalhada
                nova_forma = capturar_forma_equipe(espn_slug, team_id)
                
                if nova_forma:
                    # 3. Atualiza apenas a coluna 'forma' no Supabase para aquele time
                    supabase.table("tabelas_ligas")\
                        .update({"forma": nova_forma})\
                        .eq("time", team_name)\
                        .eq("liga", liga_nome)\
                        .execute()
                    print(f"✅ {team_name}: {nova_forma}")
                
                time.sleep(0.5) # Evita bloqueio da API
                
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    atualizar_forma_total()
