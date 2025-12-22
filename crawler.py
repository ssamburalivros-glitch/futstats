import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1"
}

def pegar_forma_real(espn_id, team_id):
    """Busca os últimos 5 jogos reais no calendário específico do time"""
    try:
        # Endpoint de calendário/resultados do time
        url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/teams/{team_id}/schedule"
        res = requests.get(url, timeout=10)
        eventos = res.json().get('events', [])
        resultados = []
        
        # Pega os jogos encerrados de trás para frente
        for evento in reversed(eventos):
            if len(resultados) >= 5: break
            
            if evento['status']['type']['description'] == "Final":
                comp = evento['competitions'][0]
                equipes = comp['competitors']
                
                # Identifica meu time na partida
                meu_time = next(t for t in equipes if t['id'] == team_id)
                
                if meu_time.get('winner') is True:
                    resultados.append('V')
                elif meu_time.get('winner') is False:
                    # Verifica se o adversário venceu ou se foi empate
                    adversario = next(t for t in equipes if t['id'] != team_id)
                    resultados.append('E' if adversario.get('winner') is False else 'D')
        
        # Inverte para ficar na ordem cronológica correta (mais antigo para o mais novo)
        return "".join(reversed(resultados))
    except:
        return ""

def capturar_liga(liga_id, espn_id):
    print(f"📡 Processando {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    try:
        data = requests.get(url, timeout=20).json()
        entries = data['children'][0]['standings']['entries']
        lista = []
        
        for entry in entries:
            s = entry['stats']
            team = entry['team']
            
            # Converte valores numéricos com segurança (evita o erro 38.0)
            def to_int(name):
                try:
                    val = next(i['value'] for i in s if i['name'] == name)
                    return int(float(val))
                except: return 0

            # BUSCA OS RESULTADOS REAIS (V-E-D)
            forma_real = pegar_forma_real(espn_id, team['id'])
            
            lista.append({
                "liga": liga_id,
                "posicao": to_int('rank'),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": to_int('gamesPlayed'),
                "pontos": to_int('points'),
                "sg": to_int('pointDifferential'),
                "forma": forma_real if forma_real else "S_DADOS"
            })
            # Pequena pausa para não sobrecarregar a API
            time.sleep(0.5) 
            
        print(f"✅ {liga_id} concluída.")
        return lista
    except Exception as e:
        print(f"❌ Erro {liga_id}: {e}")
        return []

def main():
    dados_finais = []
    for lid, eid in LIGAS.items():
        res = capturar_liga(lid, eid)
        if res: dados_finais.extend(res)

    if dados_finais:
        print(f"📤 Enviando {len(dados_finais)} registros para o Supabase...")
        try:
            supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
            supabase.table("tabelas_ligas").insert(dados_finais).execute()
            print("🚀 SUCESSO!")
        except Exception as e:
            print(f"❌ Erro Supabase: {e}")

if __name__ == "__main__":
    main()
