#!/usr/bin/env python3
import json
from datetime import datetime

def main():
    print("🚀 Gerando dados de jogos ao vivo...")
    
    # Dados de exemplo (em produção, isso viria do site real)
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
                "country": "Brasil",
                "timestamp": datetime.now().isoformat()
            },
            {
                "match": "Real Madrid x Barcelona",
                "status": "AO VIVO 65'",
                "league": "La Liga",
                "home_score": "1",
                "away_score": "1",
                "summary": "1 x 1",
                "is_live": True,
                "country": "Espanha",
                "timestamp": datetime.now().isoformat()
            },
            {
                "match": "Manchester City x Arsenal",
                "status": "INTERVALO",
                "league": "Premier League",
                "home_score": "0",
                "away_score": "0",
                "summary": "0 x 0",
                "is_live": True,
                "country": "Inglaterra",
                "timestamp": datetime.now().isoformat()
            }
        ],
        "total": 3,
        "live_games": 3,
        "updated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "source": "exemplo"
    }
    
    # Salvar na raiz (mesmo diretório)
    with open('games.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Dados salvos em games.json")
    print(f"📊 Total de jogos: {data['total']}")
    print(f"🕐 Atualizado em: {data['updated_at']}")

if __name__ == "__main__":
    main()
