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
    print(f"📅 Extraindo jogos de: {data_texto}")
    jogos = []
    
    # Espera as linhas da tabela aparecerem
    await page.wait_for_selector(".Table__TR", timeout=5000)
    rows = await page.query_selector_all(".Table__TR")
    
    for row in rows:
        # Pega as colunas de times (evita linhas de cabeçalho)
        teams = await row.query_selector_all(".Table__Team a")
        if len(teams) >= 2:
            logos = await row.query_selector_all(".Table__Team img")
            # O status costuma ser a 3ª coluna (index 2)
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
        # Lançando o browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()
        
        print("🔗 Acessando ESPN...")
        await page.goto(URL_CALENDARIO, wait_until="networkidle")

        # Localiza os botões de data
        await page.wait_for_selector(".CalendarNav__Item")
        botoes_datas = await page.query_selector_all(".CalendarNav__Item")
        
        todos_os_jogos = []

        # Vamos pegar as primeiras 7 datas (uma semana) para ser mais rápido e preciso
        for i in range(min(len(botoes_datas), 7)):
            try:
                # Clica na data
                await botoes_datas[i].click()
                await asyncio.sleep(2) # Espera o conteúdo da tabela mudar
                
                data_label = await botoes_datas[i].inner_text()
                # Limpa quebras de linha do label da data
                data_limpa = " ".join(data_label.split())
                
                jogos_dia = await extrair_jogos_do_dia(page, data_limpa)
                todos_os_jogos.extend(jogos_dia)
            except Exception as e:
                print(f"⚠️ Erro ao processar data {i}: {e}")

        if todos_os_jogos:
            print(f"📤 Enviando {len(todos_os_jogos)} jogos para o Supabase...")
            try:
                # 1. Limpa a tabela (deleta tudo)
                # No Supabase, para deletar tudo via API, usamos um filtro que sempre seja verdadeiro
                supabase.table("paulistao_jogos").delete().gt("id", 0).execute()
                
                # 2. Insere os novos dados
                supabase.table("paulistao_jogos").insert(todos_os_jogos).execute()
                print("✅ Sucesso! Dados atualizados no banco.")
            except Exception as e:
                print(f"❌ Erro ao salvar no Supabase: {e}")
        else:
            print("❌ Nenhum jogo encontrado. Verifique os seletores.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_crawler())
