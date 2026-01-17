import os
import time
import requests
from supabase import create_client

# --- 1. CONFIGURAÇÃO E INICIALIZAÇÃO GLOBAL ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

# Criamos uma variável global vazia
supabase = None

try:
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("❌ ERRO: Variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY não configuradas no GitHub!")
    else:
        # Inicializa o objeto global
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("🚀 Conexão com Supabase estabelecida com sucesso.")
except Exception as e:
    print(f"❌ Falha crítica ao conectar ao Supabase: {e}")

# --- 2. MAPEAMENTO DE LIGAS ---
LIGAS = {
    "BR": "bra.1", "PL": "eng.1", "ES": "esp.1",
    "DE": "ger.1", "IT": "ita.1", "PT": "por.1",
    "FR": "fra.1", "NL": "ned.1", "SA": "sau.1"
}

# --- 3. FUNÇÃO DE CAPTURA ---
def capturar_liga(liga_id, espn_id):
    # Usamos a variável global supabase
    global supabase
    
    if supabase is None:
        print(f"❌ Abortando {liga_id}: Objeto Supabase não foi definido.")
        return

    print(f"📡 Atualizando {liga_id}...")
    url = f"https://site.api.espn.com/apis/v2/sports/soccer/{espn_id}/standings"
    
    try:
        res = requests.get(url, timeout=15).json()
        
        # Estrutura flexível para caminhos diferentes da API
        if 'children' in res:
            entries = res['children'][0].get('standings', {}).get('entries', [])
        else:
            entries = res.get('standings', {}).get('entries', [])

        if not entries:
            print(f"⚠️ Aviso: Dados não encontrados para {liga_id}")
            return

    for entry in entries:
            team = entry.get('team', {})
            stats_list = entry.get('stats', [])
            
            # Criamos o dicionário de stats (nome da stat -> valor)
            s = {item.get('name'): item.get('value') for item in stats_list}
            
            dados = {
                "liga": liga_id,
                "time": team.get('displayName'),
                "posicao": int(s.get('rank') or 0),
                "escudo": team.get('logos', [{}])[0].get('href') if team.get('logos') else "",
                "jogos": int(s.get('gamesPlayed') or 0),
                "vitorias": int(s.get('wins') or 0),
                "empates": int(s.get('ties') or 0),
                "derrotas": int(s.get('losses') or 0),
                "gols_pro": int(s.get('pointsFor') or 0),      # CAPTURA GP
                "gols_contra": int(s.get('pointsAgainst') or 0), # CAPTURA GC
                "sg": int(s.get('pointDifferential') or 0),
                "pontos": int(s.get('points') or 0)
            }

            # Força o link do escudo para HTTPS
            if dados["escudo"] and dados["escudo"].startswith("http:"):
                dados["escudo"] = dados["escudo"].replace("http:", "https:")

            # Envio para o banco
            supabase.table("tabelas_ligas").upsert(dados, on_conflict="liga, time").execute()

        print(f"✅ {liga_id} sincronizada.")
        
    except Exception as e:
        print(f"❌ Erro ao processar {liga_id}: {e}")

# --- 4. EXECUÇÃO PRINCIPAL ---
if __name__ == "__main__":
    if supabase:
        for liga, code in LIGAS.items():
            capturar_liga(liga, code)
            time.sleep(2)
        print("🏁 Processo de atualização de ligas finalizado.")
    else:
        print("❌ Script encerrado prematuramente: Erro de conexão.")
