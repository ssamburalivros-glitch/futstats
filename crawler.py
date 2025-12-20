import os
import requests
from bs4 import BeautifulSoup
import re
from supabase import create_client

def get_live_games():
    # ... (Mantenha toda a sua lógica de BeautifulSoup exatamente como está)
    # Apenas certifique-se de que a lista 'games' seja preenchida
    # [CÓDIGO DE SCRAPING QUE VOCÊ JÁ TEM AQUI]
    return games # Retorne a lista de dicionários diretamente

def save_to_supabase(games_list):
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    supabase = create_client(url, key)

    if not games_list:
        print("Nenhum jogo ao vivo encontrado.")
        return

    # Limpa a tabela antes de inserir os novos dados ao vivo
    # (Opcional: dependendo se você quer histórico ou apenas o "agora")
    supabase.table("partidas_ao_vivo").delete().neq("id", 0).execute()

    # Prepara os dados para o Supabase (ajustando nomes de colunas se necessário)
    to_insert = []
    for g in games_list:
        to_insert.append({
            "match": g['match'],
            "status": g['status'],
            "league": g['league'],
            "home_team": g['home_team'],
            "away_team": g['away_team'],
            "home_score": g['home_score'],
            "away_score": g['away_score'],
            "is_brasileirao": g['is_brasileirao']
        })

    # Insere os dados
    result = supabase.table("partidas_ao_vivo").insert(to_insert).execute()
    print(f"✅ {len(to_insert)} jogos atualizados no Supabase!")

if __name__ == "__main__":
    print("🚀 Iniciando crawler...")
    jogos = get_live_games()
    save_to_supabase(jogos)
