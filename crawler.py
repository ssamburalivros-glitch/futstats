import os
import time
import requests
from supabase import create_client

# --- CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# IDs das Ligas na API da ESPN
LIGAS = {
    "BR": "bra.1",
    "PL": "eng.1",
    "ES": "esp.1",
    "DE": "ger.1",
    "IT": "ita.1",
    "PT": "por.1"
}

def capturar_api_espn(liga_id, espn_id):
    print(f"📡 Acessando API ESPN para {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        response = requests.get(url, timeout=20)
        data = response.json()
        
        entries = data['children'][0]['standings']['entries']
        
        times = []
        for entry in entries:
            stats = entry['stats']
            team = entry['team']
            
            # Mapeando estatísticas básicas
            pontos = next(s['value'] for s in stats if s['name'] == 'points')
            jogos = next(s['value'] for s in stats if s['name'] == 'gamesPlayed')
            sg = next(s['value'] for s in stats if s['name'] == 'pointDifferential')
            posicao = next(s['value'] for s in stats if s['name'] == 'rank')

            # --- NOVA LÓGICA: CAPTURAR A FORMA (SUMMARY) ---
            # A API da ESPN retorna algo como "V, V, E, D, V" ou "W, W, D, L, W"
            try:
                forma_bruta = next(s['summary'] for s in stats if s['name'] == 'summary')
                # Padroniza para o nosso site: Remove vírgulas, espaços e converte W->V e L->D
                forma_limpa = forma_bruta.replace(",", "").replace(" ", "")
                forma_limpa = forma_limpa.replace("W", "V").replace("L", "D").replace("T", "E")
                forma_final = forma_limpa[:5] # Pega apenas os últimos 5
            except:
                forma_final = "EEEEE" # Caso a API não retorne a forma

            times.append({
                "liga": liga_id,
                "posicao": int(posicao),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": int(jogos),
                "pontos": int(pontos),
                "sg": int(sg),
                "forma": forma_final  # <--- ADICIONADO AO DICIONÁRIO
            })
            
        print(f"✅ {liga_id}: {len(times)} times encontrados.")
        return times
    except Exception as e:
        print(f"❌ Erro na API para {liga_id}: {e}")
        return []

def main():
    dados_finais = []
    for liga_id, espn_id in LIGAS.items():
        res = capturar_api_espn(liga_id, espn_id)
        if res:
            dados_finais.extend(res)
        time.sleep(1)

    if dados_finais:
        print(f"📤 Enviando {len(dados_finais)} registros para o Supabase...")
        # Limpa o banco antes de inserir para manter a classificação fresca
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        # Insere os novos dados
        supabase.table("tabelas_ligas").insert(dados_finais).execute()
        print("🚀 SUCESSO! Banco de dados atualizado com a coluna FORMA.")
    else:
        print("💀 Falha crítica: Nenhuma liga capturada.")

if __name__ == "__main__":
    main()
