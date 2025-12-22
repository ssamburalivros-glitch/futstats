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
            
            # Estatísticas base
            pontos = next((s['value'] for s in stats if s['name'] == 'points'), 0)
            jogos = next((s['value'] for s in stats if s['name'] == 'gamesPlayed'), 0)
            sg = next((s['value'] for s in stats if s['name'] == 'pointDifferential'), 0)
            posicao = next((s['value'] for s in stats if s['name'] == 'rank'), 0)

            # --- NOVA LÓGICA DE CAPTURA DE FORMA (SUPER ROBUSTA) ---
            forma_final = "EEEEE"
            
            # 1. Tenta extrair de 'summary'
            # 2. Se não der, tenta extrair de 'displayValue' de outros campos
            for s in stats:
                if s.get('name') in ['summary', 'overall']:
                    bruto = s.get('summary') or s.get('displayValue', '')
                    if bruto and any(x in bruto.upper() for x in ['W', 'L', 'T', 'V', 'D']):
                        # Limpeza e Tradução
                        limpo = bruto.replace(",", "").replace(" ", "").upper()
                        forma_final = limpo.replace("W", "V").replace("L", "D").replace("T", "E")
                        break
            
            # Se for menor que 5 (ex: início de liga), completa com E
            forma_final = (forma_final[:5]).ljust(5, 'E')

            # --- PRINT DE DIAGNÓSTICO ---
            if posicao == 1: # Mostra apenas o líder para não poluir o terminal
                print(f"🔍 DEBUG {liga_id}: {team['displayName']} -> Forma Capturada: {forma_final}")

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
        print(f"📤 Enviando {len(dados_totais)} times para o Supabase...")
        # Limpa e Insere
        supabase.table("tabelas_ligas").delete().neq("liga", "OFF").execute()
        supabase.table("tabelas_ligas").insert(dados_totais).execute()
        print("🚀 ATUALIZADO!")

if __name__ == "__main__":
    main()
