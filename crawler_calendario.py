import os
import asyncio
from playwright.async_api import async_playwright
from supabase import create_client

# Configurações
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

URL_CALENDARIO = "https://www.espn.com.br/futebol/calendario/_/liga/bra.camp.paulista"

async def extrair_da_pagina(page):
    """Extrai os jogos que estão visíveis na tabela atual"""
    jogos = []
    
    # Pega a data que aparece no cabeçalho da tabela
    header = await page.query_selector(".Table__Title")
    data_texto = await header.inner_text() if header else "Data não identificada"
    
    rows = await page.query_selector_all(".Table__TR")
    for row in rows:
        teams = await row.query_selector_all(".Table__Team a")
        if len(teams) >= 2:
            logos = await row.query_selector_all(".Table__Team img")
            tds = await row.query_selector_all(".Table__TD")
            status = await tds[2].inner_text() if len(tds) >= 3 else "A definir"

            jogos.append({
                "data_jogo": data_texto.strip(),
                "time_casa": await teams[0].inner_text(),
                "logo_casa": await logos[0].get_attribute("src") if len(logos) > 0 else "",
                "time_fora": await teams[1].inner_text(),
                "logo_fora": await logos[1].get_attribute("src") if len(logos) > 1 else "",
                "status_ou_horario": status.strip()
            })
    return jogos

async def run_crawler():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="Mozilla/5.0")
        page = await context.new_page()
        
        print("🔗 Acessando ESPN...")
        # Tempo de espera menor para não travar
        await page.goto(URL_CALENDARIO, wait_until="domcontentloaded", timeout=45000)
        
        todos_os_jogos = []

        # Tenta pegar as 3 primeiras datas apenas para garantir que termine rápido
        try:
            await page.wait_for_selector(".CalendarNav__Item", timeout=10000)
            botoes = await page.query_selector_all(".CalendarNav__Item")
            
            for i in range(min(len(botoes), 3)): # Reduzido para 3 datas para ser ultra rápido
                await botoes[i].click()
                await asyncio.sleep(1.5) # Espera curta
                jogos_dia = await extrair_da_pagina(page)
                todos_os_jogos.extend(jogos_dia)
        except:
            print("⚠️ Timeout no menu, pegando apenas a página inicial...")
            todos_os_jogos = await extrair_da_pagina(page)

        if todos_os_jogos:
            print(f"📤 Enviando {len(todos_os_jogos)} jogos...")
            # Limpa o banco e insere
            supabase.table("paulistao_jogos").delete().gt("id", 0).execute()
            supabase.table("paulistao_jogos").insert(todos_os_jogos).execute()
            print("✅ Concluído!")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_crawler())
