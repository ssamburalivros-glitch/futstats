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
    "PT": "por.1"
}

def pegar_forma_real(espn_id, team_id):
    """ Busca os últimos 5 jogos reais no endpoint de resultados do time """
    try:
        # Endpoint de resultados recentes do time específico
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        res = requests.get(url, timeout=10)
        data = res.json()
        
        eventos = data.get('events', [])
        resultados = []
        
        # Percorre os jogos de trás para frente (mais recentes primeiro)
        for evento in reversed(eventos):
            if len(resultados) >= 5: break
            
            status = evento['status']['type']['description']
            if status == "Final": # Somente jogos encerrados
                # Tenta pegar a nota da vitória/derrota (Winner)
                competicao = evento['competitions'][0]
                equipes = competicao['competitors']
                
                meu_time = next(t for t in equipes if t['id'] == team_id)
                # 'winner' True/False ou checagem de placar
                if meu_time.get('winner') is True:
                    resultados.append('V')
                elif meu_time.get('winner') is False:
                    # Se o adversário também não venceu, é empate
                    adversario = next(t for t in equipes if t['id'] != team_id)
                    if adversario.get('winner') is False:
                        resultados.append('E')
                    else:
                        resultados.append('D')
        
        return "".join(reversed(resultados)) # Inverte para ordem cronológica
    except:
        return ""

def capturar_api_espn(liga_id, espn_id):
    print(f"📡 Processando {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        entries = data['children'][0]['standings']['entries']
        
        times_processados = []
        for entry in entries:
            stats = entry['stats']
            team = entry['team']
            team_id = team['id']
            
            pontos = next((s['value'] for s in stats if s['name'] == 'points'), 0)
            jogos = next((s['value'] for s in stats if s['name'] == 'gamesPlayed'), 0)
            sg = next((s['value'] for s in stats if s['name'] == 'pointDifferential'), 0)
            posicao = next((s['value'] for s in stats if s['name'] == 'rank'), 0)

            # --- TENTATIVA 1: Pegar da classificação ---
            forma = next((s.get('summary', '') for s in stats if s['name'] == 'summary'), "")
            
            # --- TENTATIVA 2: Se falhar, busca os resultados reais do time ---
            if not forma or any(c.isdigit() for c in forma):
                forma = pegar_forma_real(espn_id, team_id)
            
            # Limpeza final
            forma_limpa = forma.replace(",", "").replace(" ", "").upper()
            forma_limpa = forma_limpa.replace("W", "V").replace("L", "D").replace("T", "E")
            
            times_processados.append({
                "liga": liga_id,
                "posicao": int(posicao),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": int(jogos),
                "pontos": int(pontos),
                "sg": int(sg),
                "forma": forma_limpa[-5:] if forma_limpa else "S_DADOS"
            })
            
        print(f"✅ {liga_id} concluída.")
        return times_processados
    except Exception as e:
        print(f"❌ Erro: {e}")
        return []

def main():
    todos_dados = []
    for liga, eid in LIGAS.items():
        res = capturar_api_espn(liga, eid)
        todos_dados.extend(res)
        time.sleep(2) # Respeita a API

    if todos_dados:
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(todos_dados).execute()
        print("🚀 BANCO ATUALIZADO COM DADOS REAIS!")

if __name__ == "__main__":
    main()
