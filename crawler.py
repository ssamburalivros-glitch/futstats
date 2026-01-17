import os
import time
import requests
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Ligas que possuem dados reais em Janeiro/2026
LIGAS = {
    "PL": "eng.1", "ES": "esp.1", "DE": "ger.1", 
    "IT": "ita.1", "PT": "por.1", "FR": "fra.1"
}

def capturar_liga(liga_id, espn_id):
    print(f"📡 Sincronizando: {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=20).json()
        # Tratamento para estrutura da França/Europa
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"⚠️ Sem dados para {liga_id}")
            return

        for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Criar dicionário baseado na abreviação (mais seguro)
            s = {item.get('abbreviation'): item.get('value') for item in stats_list}
            
            # Mapeamento ESPN: W=Vitórias, D=Empates, L=Derrotas, F=Gols Pró, A=Gols Contra
            v = int(s.get('W', 0))
            e = int(s.get('D', 0))
            d = int(s.get('L', 0))
            gp = int(s.get('F', 0))
            gc = int(s.get('A', 0))
            pts = int(s.get('P', 0))
            jogos = int(s.get('GP', 0))
            pos = int(s.get('R', 0))
            sg = int(s.get('GD', gp - gc))

            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": pos,
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": jogos,
                "vitorias": v,
                "empates": e,
                "derrotas": d,
                "gols_pro": gp,
                "gols_contra": gc,
                "sg": sg,
                "pontos": pts
            }

            # Envia ao Supabase
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ {liga_id} atualizada no banco.")

    except Exception as err:
        print(f"❌ Erro em {liga_id}: {err}")

if __name__ == "__main__":
    # Opcional: Limpar a liga "TY" ou dados bugados antes de rodar
    # supabase.table("tabelas_ligas").delete().neq("id", 0).execute() 
    
    for liga, code in LIGAS.items():
        capturar_liga(liga, code)
        time.sleep(1)
