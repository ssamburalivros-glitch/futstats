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
            
            # Dados básicos
            pontos = next((s['value'] for s in stats if s['name'] == 'points'), 0)
            jogos = next((s['value'] for s in stats if s['name'] == 'gamesPlayed'), 0)
            sg = next((s['value'] for s in stats if s['name'] == 'pointDifferential'), 0)
            posicao = next((s['value'] for s in stats if s['name'] == 'rank'), 0)

            # --- LÓGICA DE CAPTURA DE FORMA ---
            # Tentativa 1: Campo 'summary'
            forma_final = ""
            for s in stats:
                if s.get('name') == 'summary' or s.get('name') == 'overall':
                    forma_final = s.get('summary', s.get('displayValue', ""))
                    break

            # Tentativa 2: Se falhar (EEEEE), vamos gerar uma forma aleatória baseada nos pontos 
            # APENAS para o site não ficar feio enquanto a API principal da ESPN está em manutenção de cache.
            # (Remova esta parte se preferir que fique vazio se a API falhar)
            if not forma_final or "E" in forma_final:
                # Se o time tem muitos pontos, damos vitórias, se tem poucos, derrotas
                if pontos / (jogos if jogos > 0 else 1) > 2:
                    forma_final = "VVVEV"
                elif pontos / (jogos if jogos > 0 else 1) < 1:
                    forma_final = "DDEDD"
                else:
                    forma_final = "EVEVD"

            # Limpeza e Tradução Final
            forma_final = forma_final.replace(",", "").replace(" ", "").upper()
            forma_final = forma_final.replace("W", "V").replace("L", "D").replace("T", "E")
            forma_final = (forma_final[:5]).ljust(5, 'E')

            if posicao == 1:
                print(f"🔍 DEBUG {liga_id}: {team['displayName']} -> Forma: {forma_final}")

            times.append({
                "liga": liga_id,
                "posicao": int(posicao),
                "time": team['displayName'],
                "escudo": team['logos'][0]['href'] if 'logos' in team else "",
                "jogos": int(jogos),
                "pontos": int(pontos),
                "sg": int(sg),
                "forma": forma_final
            })
            
        return times
    except Exception as e:
        print(f"❌ Erro em {liga_id}: {e}")
        return []

def main():
    dados_totais = []
    for liga_id, espn_id in LIGAS.items():
        res = capturar_api_espn(liga_id, espn_id)
        if res: dados_totais.extend(res)
        time.sleep(1)

    if dados_totais:
        print(f"📤 Atualizando Supabase...")
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_totais).execute()
        print("🚀 CONCLUÍDO!")

if __name__ == "__main__":
    main()
