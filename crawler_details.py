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
    
    url = f"https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event={id_espn}"
    
    try:
        res = requests.get(url, timeout=15).json()
        
        posse_casa, posse_fora = 50, 50
        chutes_casa, chutes_fora = 0, 0
        lineup_casa, lineup_fora = [], []

        # A. EXTRAIR ESTATÍSTICAS
        if 'boxscore' in res and 'teams' in res['boxscore']:
            teams = res['boxscore']['teams']
            for i, t in enumerate(teams):
                for stat in t.get('statistics', []):
                    display_val = stat.get('displayValue', '0')
                    # Remove símbolos como '%' para converter em número
                    val = int(''.join(filter(str.isdigit, display_val)) or 0)
                    
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
                    if entry.get('name') == 'starters':
                        for athlete in entry.get('athletes', []):
                            players.append(athlete.get('displayName'))
                
                if i == 0: lineup_casa = players[:11]
                else: lineup_fora = players[:11]

        # C. SALVAR NO SUPABASE
        dados = {
            "jogo_id": str(id_espn),
            "posse_casa": int(posse_casa),
            "posse_fora": int(posse_fora),
            "chutes_casa": int(chutes_casa),
            "chutes_fora": int(chutes_fora),
            "escalacao_casa": lineup_casa,
            "escalacao_fora": lineup_fora
        }

        # O segredo está aqui: capturar o retorno do Supabase
        resultado = supabase.table("detalhes_partida").upsert(dados).execute()
        
        if len(resultado.data) > 0:
            print(f"✅ GRAVADO NO BANCO: Jogo {id_espn}")
        else:
            print(f"❌ FALHA SILENCIOSA: O banco aceitou o comando mas não criou a linha para {id_espn}")

    except Exception as e:
        print(f"⚠️ ERRO CRÍTICO AO SALVAR: {e}")

def main():
    print("📡 Iniciando Crawler de Detalhes...")
    
    try:
        # Mudamos de 'id_espn' para 'id' conforme a sua foto do Supabase
        res = supabase.table("jogos_ao_vivo").select("id").execute()
        jogos = res.data

        if not jogos:
            print("💤 Nenhum jogo encontrado na tabela jogos_ao_vivo.")
            return

        print(f"📊 Processando {len(jogos)} jogos...")
        for j in jogos:
            # Pegamos o valor da coluna 'id'
            id_match = j.get('id')
            if id_match:
                processar_jogo(str(id_match)) # Forçamos virar texto
                time.sleep(1)
                
    except Exception as e:
        print(f"❌ Erro ao ler IDs: {e}")
