"""Oberfläche mit Speicher-Server: Kurzcode zeigt auf einem zweiten Gerät denselben Stand.
Vorher starten:  python3 -m http.server 8765   und   node test/dev-api.mjs 8787 http://localhost:8765
Aufruf:          python3 test/ui.server.py http://localhost:8765/ http://localhost:8787
"""
import asyncio, random, sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
API = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8787'
fails = []
PC = 'bwi' + str(random.randint(1000, 9999))            # je Lauf ein neuer Kurzcode: ein vergebener lässt sich nicht nochmals anlegen

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
        print('Persönlicher Kurzcode')
        d = await page(br, errors)
        await d.goto(BASE); await d.wait_for_selector('#cylBody tr')
        await d.fill('#pcInput', 'ab'); await d.click('#pcLoad')
        check('3 bis 20' in await d.inner_text('#pcStatus'), 'zu kurzer Kurzcode wird abgelehnt')
        await d.fill('#pcInput', PC.upper()); await d.click('#pcLoad')
        await d.wait_for_function("document.querySelector('#pcStatus').textContent.includes('gibt es noch nicht')", timeout=8000)
        check(await d.input_value('#pcInput') == PC, 'Kurzcode wird klein geschrieben')
        await d.locator('#cylBody tr[data-i="0"] input[data-f="size"]').fill('3')
        await d.locator('#cylBody tr[data-i="0"] input[data-f="p"]').fill('300')
        await d.fill('#setPersons', '3')
        await d.click('#pcSave')
        await d.wait_for_function("document.querySelector('#pcStatus').textContent.includes('angelegt')", timeout=8000)
        check(True, 'Gerät D: Kurzcode angelegt')

        e = await page(br, errors)
        await e.goto(BASE); await e.wait_for_selector('#cylBody tr')
        await e.fill('#pcInput', PC); await e.click('#pcSave')
        await e.wait_for_function("document.querySelector('#pcStatus').textContent.includes('vergeben')", timeout=8000)
        check(True, 'Gerät E: fremder Kurzcode lässt sich nicht überschreiben')
        await e.click('#pcLoad')
        await e.wait_for_function("document.querySelector('#pcStatus').textContent.includes('geladen')", timeout=8000)
        check(await e.locator('#cylBody tr[data-i="0"] input[data-f="p"]').input_value() == '300' and await e.input_value('#setPersons') == '3', 'Gerät E: Konfiguration geladen (Vorrat und Einstellungen)')
        check(await e.locator('#profBody tr[data-i]').count() == 4 and await e.evaluate('location.hash') == '', 'Fahrtprofil bleibt, noch keine Berechnung angelegt')
        check(f'Konfiguration «{PC}»' in await e.inner_text('#saveStatus'), 'Statuszeile nennt die Konfiguration')
        check(await e.is_hidden('#pcUpdate'), 'ohne Änderung kein Knopf «Konfiguration aktualisieren?»')
        await e.fill('#setSf', '15')
        await e.evaluate("window.O2.state().set.factor = 1.2")
        await e.fill('#setClimb', '1.6')
        await e.wait_for_selector('#pcUpdate:not([hidden])', timeout=3000)
        check('aktualisieren?' in await e.inner_text('#pcUpdate') and PC in await e.inner_text('#pcUpdate'), 'Gerät E: nach Änderung in 1/2 erscheint «Konfiguration … aktualisieren?»')
        await e.click('#pcUpdate')
        await e.wait_for_function("document.querySelector('#pcStatus').textContent.includes('gespeichert')", timeout=8000)
        check(await e.is_hidden('#pcUpdate'), 'Gerät E: nach dem Aktualisieren verschwindet der Knopf')
        await e.locator('#profBody tr[data-i="0"] input[data-f="dur"]').fill('1:00')
        check(await e.is_hidden('#pcUpdate'), 'Änderung am Fahrtprofil (3) löst keine Aktualisierung aus')

        await d.goto(BASE + '?neu=1'); await d.wait_for_selector('#cylBody tr')
        check(await d.locator('#cylBody tr[data-i="0"] input[data-f="p"]').input_value() == '300', 'Gerät D: neue Berechnung beginnt mit der eigenen Konfiguration')
        await d.wait_for_function("document.querySelector('#setSf').value === '15'", timeout=8000)
        check(True, 'Gerät D: Änderung von E wird beim Start nachgezogen')
        check('1.20' in await d.inner_text('#factorLine') and not await d.is_hidden('#factorLine'), 'Verbrauchsfaktor gehört zur Konfiguration')
        check(await d.evaluate('location.hash') == '', 'ohne Eingabe wird nichts angelegt')
        await d.fill('#calcTitle', 'Test'); await d.locator('#calcTitle').blur()
        await d.wait_for_function("document.querySelector('#saveStatus').classList.contains('ok')", timeout=8000)
        got = await d.evaluate("fetch(window.O2_CONFIG.apiBase + '/c/' + location.hash.slice(1)).then(r => r.json())")
        check(got['data']['title'] == 'Test' and got['data']['cyl'][0]['p'] == 300, 'Berechnung mit Titel und eigener Konfiguration auf dem Server')
        await d.click('#pcForget')
        check(await d.input_value('#pcInput') == '' and await d.is_hidden('#pcForget'), 'Kurzcode auf dem Gerät vergessen')
        await d.goto(BASE + '?neu=2'); await d.wait_for_selector('#cylBody tr')
        check(await d.locator('#cylBody tr[data-i="0"] input[data-f="p"]').input_value() == '200', 'danach wieder Beispielwerte')

        print('Übergabe mit Kurzcode (Fahrtbriefing merkt sich die Berechnung)')
        import base64, json
        code_i = ''.join(random.choice('ABCDEFGHJKMNPQRSTUVWXYZ23456789') for _ in range(6))
        imp = lambda levels: BASE + '#i.' + base64.urlsafe_b64encode(json.dumps({'v': 1, 't': '2026-017 · HB-QWZ', 'l': levels, 's': 1, 'c': code_i}).encode()).decode().rstrip('=')
        f = await page(br, errors)
        await f.goto(imp([[9000, 1.5], [14000, 2], [8000, 1]])); await f.wait_for_selector('#cylBody tr')
        await f.wait_for_function("document.querySelector('#saveStatus').classList.contains('ok')", timeout=8000)
        check((await f.evaluate('location.hash')) == '#' + code_i and await f.locator('#profBody tr[data-i]').count() == 3, f'Berechnung unter dem übergebenen Kurzcode angelegt ({code_i})')
        await f.locator('#cylBody tr[data-i="0"] input[data-f="p"]').fill('150')
        await f.wait_for_function("document.querySelector('#saveStatus').classList.contains('ok')", timeout=8000)
        g = await page(br, errors)                                   # anderes Gerät: erneute Übergabe mit geändertem Profil
        await g.goto(imp([[9000, 1], [12000, 2], [15000, 1], [8000, 1]])); await g.wait_for_selector('#cylBody tr')
        await g.wait_for_function("document.querySelector('#notice').textContent.includes('ersetzt')", timeout=8000)
        check(await g.locator('#profBody tr[data-i]').count() == 4 and await g.locator('#cylBody tr[data-i="0"] input[data-f="p"]').input_value() == '150', 'erneute Übergabe: Profil ersetzt, Vorrat geblieben')
        check((await g.evaluate('location.hash')) == '#' + code_i, 'Kurzcode bleibt')

        real = [e for e in errors if '404' not in e and '409' not in e]   # unbekannter bzw. vergebener Kurzcode: erwartete Antworten
        check(not real, f'keine Fehler in der Konsole {real[:3]}')
        await br.close()
    print('\nFEHLER: %d' % len(fails) if fails else '\nalles in Ordnung')
    sys.exit(1 if fails else 0)

asyncio.run(main())
