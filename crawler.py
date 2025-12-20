def get_live_games():
    """Faz scraping dos jogos ao vivo do placardefutebol.com.br"""
    try:
        # Headers mais robustos para evitar bloqueio
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': 'https://www.google.com/',
        }
        
        response = requests.get('https://www.placardefutebol.com.br/', headers=headers, timeout=15)
        
        # Se o site retornar erro 403, tentamos uma alternativa
        if response.status_code == 403:
            print("⚠️ Fomos bloqueados pelo site. Tentando contornar...")
            # Aqui poderíamos usar um proxy ou cabeçalhos diferentes
        
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        games = []
        
        # ... o restante do código que te enviei anteriormente permanece igual
