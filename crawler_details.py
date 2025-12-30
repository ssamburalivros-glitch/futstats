import os
import time
import requests
from supabase import create_client

# --- 1. CONFIGURAÇÃO ---
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERRO: Variáveis de ambiente não encontradas!")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def processar_jogo(id_espn):
    """Puxa estatísticas e escalações da ESPN e salva no Supabase"""
    print(f"🔍 Buscando detalhes para o jogo: {id_espn}")
    
    # Endpoint de Sumário (Stats + Lineups)
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={id_espn}"
    
    try:
        res = requests.get(url, timeout=15).json()
        
        # Iniciar dados padrão
        posse_casa, posse_fora = 50, 50
        chutes_casa, chutes_fora = 0, 0
        lineup_casa, lineup_fora = [], []

        # A. EXTRAIR ESTATÍSTICAS
        if 'boxscore' in res and 'teams' in res['boxscore']:
            teams = res['boxscore']['teams']
            for i, t in enumerate(teams):
                for stat in t.get('statistics', []):
                    val = int(stat.get('displayValue', 0))
                    if stat['name'] == 'possessionPct':
                        if i == 0: posse_casa = val
                        else: posse_fora = val
                    elif stat['name'] == 'shots':
                        if i == 0: chutes_casa = val
                        else: chutes_fora = val

        # B. EXTRAIR ESCALAÇÕES (LINEUPS)
        if 'rosters' in res:
            for i, roster in enumerate(res['rosters']):
                players = []
                for entry in roster.get('roster', []):
                    # Pegamos apenas os titulares (starters)
                    if entry.get('name') == 'starters':
                        for athlete in entry.get('athletes', []):
                            players.append(athlete.get('displayName'))
                
                if i == 0: lineup_casa = players[:11]
                else: lineup_fora = players[:11]

        # C. SALVAR NO SUPABASE
        dados = {
            "jogo_id": str(id_espn),
            "posse_casa": posse_casa,
            "posse_fora": posse_fora,
            "chutes_casa": chutes_casa,
            "chutes_fora": chutes_fora,
            "escalacao_casa": lineup_casa,
            "escalacao_fora": lineup_fora
        }

        supabase.table("detalhes_partida").upsert(dados, on_conflict="jogo_id").execute()
        print(f"✅ Sucesso: Jogo {id_espn} atualizado.")

    except Exception as e:
        print(f"⚠️ Erro ao processar ID {id_espn}: {e}")

def main():
    print("📡 Iniciando Crawler de Detalhes...")
    
    try:
        # Tenta buscar os IDs dos jogos ao vivo. 
        # Se sua coluna no banco se chamar 'id', mude 'id_espn' para 'id' abaixo.
        res = supabase.table("jogos_ao_vivo").select("id_espn").execute()
        jogos = res.data

        if not jogos:
            print("💤 Nenhum jogo ao vivo encontrado para processar detalhes.")
            return
