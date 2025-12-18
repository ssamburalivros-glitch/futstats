#!/usr/bin/env python3
import json
from datetime import datetime
import os

def main():
    print("🚀 Iniciando gerador de dados de exemplo...")
    
    # Dados de exemplo
    data = {
        "success": True,
        "games": [
            {
                "match": "Flamengo x Palmeiras",
                "status": "AO VIVO 45'",
                "league": "Brasileirão Série A",
                "home_team": "Flamengo",
                "away_team": "Palmeiras",
                "home_score": "2",
                "away_score": "1",
                "summary": "2 x 1",
                "is_live": True,
                "is_brasileirao": True,
                "country": "Brasil",
                "timestamp": datetime.now().isoformat()
            },
            {
                "match": "Real Madrid x Barcelona",
                "status": "AO VIVO 65'",
                "league": "La Liga",
                "home_team": "Real Madrid",
                "away_team": "Barcelona",
                "home_score": "1",
                "away_score": "1",
                "summary": "1 x 1",
                "is_live": True,
                "is_brasileirao": False,
                "country": "Espanha",
                "timestamp": datetime.now().isoformat()
            },
            {
                "match": "Manchester United x Liverpool",
                "status": "INTERVALO",
                "league": "Premier League",
                "home_team": "Manchester United",
                "away_team": "Liverpool",
                "home_score": "0",
                "away_score": "0",
                "summary": "0 x 0",
                "is_live": True,
                "is_brasileirao": False,
                "country": "Inglaterra",
                "timestamp": datetime.now().isoformat()
            }
        ],
        "total": 3,
        "live_games": 3,
        "brasileirao_games": 1,
        "updated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "source": "exemplo"
    }
    
    # Criar diretório public se não existir
    os.makedirs('public', exist_ok=True)
    
    # Salvar em public/games.json
    with open('public/games.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f" Dados criados com sucesso em public/games.json")
    print(f" Total de jogos: {data['total']}")
    print(f" Jogos ao vivo: {data['live_games']}")
    print(f" Brasileirão: {data['brasileirao_games']}")
    print(f" Atualizado em: {data['updated_at']}")

if __name__ == "__main__":
    main()
