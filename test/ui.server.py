"""Oberfläche mit Speicher-Server: Kurzcode zeigt auf einem zweiten Gerät denselben Stand.
Vorher starten:  python3 -m http.server 8765   und   node test/dev-api.mjs 8787 http://localhost:8765
Aufruf:          python3 test/ui.server.py http://localhost:8765/ http://localhost:8787
"""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
API = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8787'
fails = []

def check(ok, text):
    print(('  ok   ' if ok else '  FAIL ') + text)
    if not ok: fails.append(text)

async def page(br, errors):
    ctx = await br.new_context(viewport={'width': 1280, 'height': 900}, service_workers='block')
    await ctx.route('**/js/config.js', lambda r: r.fulfill(content_type='text/javascript', body=f"window.O2_CONFIG = {{ apiBase: '{API}' }};"))
    pg = await ctx.new_page()
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(str(e)))
    return pg

async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        errors = []
        a = await page(br, errors)
        await a.goto(BASE); await a.wait_for_selector('#cylBody tr')
        await a.locator('#cylBody tr[data-i="0"] input[data-f="p"]').fill('150')
        await a.locator('#cylBody tr[data-i="0"] input[data-f="p"]').blur()
        await a.wait_for_function("document.querySelector('#saveStatus').classList.contains('ok')", timeout=8000)
        status = await a.inner_text('#saveStatus')
        check('gespeichert' in status, f'Gerät A: «{status}»')
        url = await a.input_value('#shareUrl')
        code = (await a.evaluate('location.hash')).lstrip('#')
        check(url.endswith('#' + code), f'Link ohne Anhang ({url})')

        b = await page(br, errors)
        await b.goto(BASE + '#' + code); await b.wait_for_selector('#cylBody tr')
        await b.wait_for_function("document.querySelector('#cylBody tr[data-i=\"0\"] input[data-f=\"p\"]').value === '150'", timeout=8000)
        check(True, 'Gerät B: Stand vom Server')
        await b.locator('#setPersons').fill('3'); await b.locator('#setPersons').blur()
        await b.wait_for_function("document.querySelector('#saveStatus').classList.contains('ok')", timeout=8000)

        await a.reload(); await a.wait_for_selector('#cylBody tr')
        await a.wait_for_function("document.querySelector('#setPersons').value === '3'", timeout=8000)
        check(True, 'Gerät A: Änderung von B nach Neuladen')

        c = await page(br, errors)
        await c.goto(BASE + '#ZZZZZZ'); await c.wait_for_selector('#cylBody tr')
        await c.wait_for_selector('#notice:not([hidden])', timeout=8000)
        check('ZZZZZZ' in await c.inner_text('#notice'), 'unbekannter Kurzcode: Hinweis')
        real = [e for e in errors if '404' not in e]
        check(not real, f'keine Fehler in der Konsole {real[:3]}')
        await br.close()
    print('\nFEHLER: %d' % len(fails) if fails else '\nalles in Ordnung')
    sys.exit(1 if fails else 0)

asyncio.run(main())
