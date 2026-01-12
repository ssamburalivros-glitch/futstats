import os
import asyncio
from playwright.async_api import async_playwright
from supabase import create_client

# Configurações do Supabase
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

URL_CALENDARIO = "https://www.espn.com.br/futebol/calendario/_/liga/bra.camp.paulista"

async def extrair_jogos_do_dia(page, data_texto):
    print(f"📅 Processando: {data_texto}")
    jogos = []
    
    # Localiza as linhas de jogos na tabela
    rows = await page.query_selector_all("tr.Table__TR--sm")
    
    for row in rows:
        # Extrai times e logos
        teams = await row.query_selector_all(".Table__Team a")
        logos = await row.query_selector_all(".Table__Team img")
        status = await row.query_selector(".Table__TD:nth-child(3)") # Horário/Placar
        
        if len(teams) >= 2:
            jogos.append({
                "data_jogo": data_texto,
                "time_casa": await teams[0].inner_text(),
                "logo_casa": await logos[0].get_attribute("src") if len(logos) > 0 else "",
                "time_fora": await teams[1].inner_text(),
                "logo_fora": await logos[1].get_attribute("src") if len(logos) > 1 else "",
                "status_ou_horario": await status.inner_text() if status else "A definir"
            })
    return jogos

async def run_crawler():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(URL_CALENDARIO, wait_until="networkidle")

        # 1. Localiza todos os botões de data no carrossel do calendário
        botoes_datas = await page.query_selector_all(".CalendarNav__Item")
        todos_os_jogos = []

        for i in range(len(botoes_datas)):
            # Clica na data
            await botoes_datas[i].click()
            await page.wait_for_timeout(2000) # Espera carregar os jogos do dia
            
            data_label = await botoes_datas[i].inner_text()
            jogos_dia = await extrair_jogos_do_dia(page, data_label.replace("\n", " "))
            todos_os_jogos.extend(jogos_dia)

        if todos_os_jogos:
            print(f"📤 Enviando {len(todos_os_jogos)} jogos para o Supabase...")
            # Limpa e insere
            supabase.table("paulistao_jogos").delete().neq("time_casa", "null").execute()
            supabase.table("paulistao_jogos").insert(todos_os_jogos).execute()
            print("✅ Sucesso!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_crawler())
