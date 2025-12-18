#!/usr/bin/env python3
import json
from datetime import datetime
import os

def main():
    print("🚀 Gerando dados de exemplo para Vercel...")
    
    # Dados de exemplo mais completos
    data = {
        "success": True,
        "games": [
            {
                "match": "Flamengo x Palmeiras",
                "status": "AO VIVO 45'",
                "league": "Brasileirão Série A",
                "home_score": "2",
                "away_score": "1",
                "summary": "2 x 1",
                "is_live": True,
                "country": "Brasil 🇧🇷",
                "timestamp": datetime.now().isoformat(),
                "is_brasileirao": True
            },
            {
                "match": "Real Madrid x Barcelona",
                "status": "AO VIVO 65'",
                "league": "La Liga",
                "home_score": "1",
                "away_score": "1", 
                "summary": "1 x 1",
                "is_live": True,
                "country": "Espanha 🇪🇸",
                "timestamp": datetime.now().isoformat(),
                "is_brasileirao": False
            },
            {
                "match": "Manchester City x Arsenal",
                "status": "INTERVALO",
                "league": "Premier League",
                "home_score": "0",
                "away_score": "0",
                "summary": "0 x 0",
                "is_live": True,
                "country": "Inglaterra 🏴󠁧󠁢󠁥󠁮󠁧󠁿",
                "timestamp": datetime.now().isoformat(),
                "is_brasileirao": False
            },
            {
                "match": "Bayern Munich x Borussia Dortmund",
                "status": "AO VIVO 30'",
                "league": "Bundesliga",
                "home_score": "1",
                "away_score": "0",
                "summary": "1 x 0",
                "is_live": True,
                "country": "Alemanha 🇩🇪",
                "timestamp": datetime.now().isoformat(),
                "is_brasileirao": False
            },
            {
                "match": "Paris Saint-Germain x Olympique de Marseille",
                "status": "AO VIVO 55'",
                "league": "Ligue 1",
                "home_score": "1",
                "away_score": "1",
                "summary": "1 x 1",
                "is_live": True,
                "country": "França 🇫🇷",
                "timestamp": datetime.now().isoformat(),
                "is_brasileirao": False
            }
        ],
        "total": 5,
        "live_games": 5,
        "brasileirao_games": 1,
        "updated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "source": "exemplo-vercel",
        "server": "Vercel"
    }
    
    # Criar diretório public se não existir
    os.makedirs('public', exist_ok=True)
    
    # Salvar em public/games.json
    with open('public/games.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Dados salvos em public/games.json")
    print(f"📊 Total de jogos: {data['total']}")
    print(f"🔥 Jogos ao vivo: {data['live_games']}")
    print(f"🇧🇷 Brasileirão: {data['brasileirao_games']}")
    print(f"🌍 Países: Brasil, Espanha, Inglaterra, Alemanha, França")
    print(f"🕐 Atualizado em: {data['updated_at']}")

if __name__ == "__main__":
    main()
