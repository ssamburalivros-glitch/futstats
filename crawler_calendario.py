import os
import asyncio
from playwright.async_api import async_playwright
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

URL_CALENDARIO = "https://www.espn.com.br/futebol/calendario/_/liga/bra.camp.paulista"

async def extrair_jogos_do_dia(page, data_texto):
    print(f"📅 Extraindo jogos de: {data_texto}")
    jogos = []
    
    # Aguarda as linhas da tabela estarem presentes
    try:
        await page.wait_for_selector(".Table__TR", timeout=10000)
    except:
        return []

    rows = await page.query_selector_all(".Table__TR")
    for row in rows:
        teams = await row.query_selector_all(".Table__Team a")
        if len(teams) >= 2:
            logos = await row.query_selector_all(".Table__Team img")
            tds = await row.query_selector_all(".Table__TD")
            status_text = await tds[2].inner_text() if len(tds) >= 3 else "A definir"

            jogos.append({
                "data_jogo": data_texto.strip(),
                "time_casa": await teams[0].inner_text(),
                "logo_casa": await logos[0].get_attribute("src") if len(logos) > 0 else "",
                "time_fora": await teams[1].inner_text(),
                "logo_fora": await logos[1].get_attribute("src") if len(logos) > 1 else "",
                "status_ou_horario": status_text.strip()
            })
    return jogos

async def run_crawler():
    async with async_playwright() as p:
        # User-Agent para evitar ser bloqueado
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        
        print("🔗 Acessando ESPN...")
        await page.goto(URL_CALENDARIO, wait_until="load", timeout=60000)

        # Tenta pegar a data atual que já está na tela caso o menu de navegação falhe
        header_data = await page.query_selector(".Table__Title")
        data_padrao = await header_data.inner_text() if header_data else "Data não identificada"

        todos_os_jogos = []

        # Tenta localizar o menu de datas, se falhar, pega apenas o que está na tela
        try:
            await page.wait_for_selector(".CalendarNav__Item", timeout=15000)
            botoes_datas = await page.query_selector_all(".CalendarNav__Item")
            
            for i in range(min(len(botoes_datas), 5)): # Pega as próximas 5 datas
                await botoes_datas[i].click()
                await asyncio.sleep(2)
                
                label = await botoes_datas[i].inner_text()
                data_limpa = " ".join(label.split())
                
                jogos_dia = await extrair_jogos_do_dia(page, data_limpa)
                todos_os_jogos.extend(jogos_dia)
        except Exception as e:
            print(f"⚠️ Menu de datas não carregou, tentando extrair página inicial: {e}")
            jogos_dia = await extrair_jogos_do_dia(page, data_padrao)
            todos_os_jogos.extend(jogos_dia)

        if todos_os_jogos:
            print(f"📤 Enviando {len(todos_os_jogos)} jogos para o Supabase...")
            supabase.table("paulistao_jogos").delete().gt("id", 0).execute()
            supabase.table("paulistao_jogos").insert(todos_os_jogos).execute()
            print("✅ Sucesso!")
        else:
            print("❌ Falha crítica: Nenhum dado capturado.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_crawler())
