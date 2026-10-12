#!/usr/bin/env python3
"""EDS O2-Planung — Oberflächentest mit Playwright (Chromium).

Aufruf:  python3 -m http.server 8765 &   (im Projektordner)
         python3 test/ui.smoke.py [http://localhost:8765/] [Ordner für Bildschirmfotos]

Prüft die Beispielrechnung, das Anlegen einer Berechnung mit Kurzcode, das Wiederladen
(Gerät und Link-Anhang), Einheiten, Nachführen, Sprache, Legende, QR und den A5-Druck.
"""
import asyncio
import re
import sys

from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
SHOTS = sys.argv[2] if len(sys.argv) > 2 else None
fails = []


def check(cond, msg):
    print(('  ok   ' if cond else '  FAIL ') + msg)
    if not cond:
        fails.append(msg)


async def shot(page, name, **kw):
    if SHOTS:
        await page.screenshot(path=f'{SHOTS}/{name}.png', **kw)


async def no_server(ctx):
    """Gerätemodus erzwingen: Diese Prüfung läuft ohne Speicher-Server (der Fall mit Server steht in ui.server.py)."""
    await ctx.route('**/js/config.js', lambda r: r.fulfill(content_type='text/javascript', body="window.O2_CONFIG = { apiBase: '' };"))


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errors = []

        # ---------- Desktop ----------
        ctx = await b.new_context(viewport={'width': 1280, 'height': 900})
        await no_server(ctx)
        await ctx.grant_permissions(['clipboard-read', 'clipboard-write'])
        pg = await ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        await pg.goto(BASE)
        await pg.wait_for_timeout(500)
        print('Beispielrechnung')
        bal = await pg.inner_text('#balance')
        check('Sauerstoffvorrat ist genügend' in bal, 'Status «genügend»')
        check('773 L' in bal and '368 L' in bal and '405 L' in bal, 'Bilanz 773 / 368 / 405 L')
        check(re.search(r'6:0[01] h', bal) is not None, 'Reichweite rund 6:00 h')
        rows = await pg.inner_text('#rowsTable')
        check('Steigen FL080 – FL120' in rows and 'Sinken FL100 – 2800 m' in rows, 'Zwischenzeilen Steigen/Sinken')
        check('139.7' in rows and '134.8' in rows, 'Verbrauch je Höhenstufe')
        check(await pg.evaluate('location.hash') == '', 'ohne Änderung kein Kurzcode')
        check('Beispielwerte' in await pg.inner_text('#saveStatus'), 'Hinweis «Beispielwerte»')
        check(await pg.locator('#qrBtn svg').count() == 1, 'QR-Code neben «Link kopieren»')
        check(re.fullmatch(r'v\d+\.\d+\.\d+', await pg.inner_text('#versionStamp')) is not None, 'Versionsnummer in der Kopfzeile')
        check('mhoxygen.com' in await pg.get_attribute('.footer a', 'href'), 'Quellenlink Mountain High in der Fusszeile')
        await shot(pg, 'desktop', full_page=True)

        print('Erste Änderung legt die Berechnung an')
        p1 = pg.locator('#cylBody tr[data-i="0"] input[data-f="p"]')
        await p1.fill('180')
        await pg.wait_for_timeout(200)
        code = (await pg.evaluate('location.hash')).lstrip('#')
        check(re.fullmatch(r'[A-HJKMNP-Z2-9]{6}', code) is not None, f'Kurzcode angelegt ({code})')
        check('nur auf diesem Gerät' in await pg.inner_text('#saveStatus'), 'ohne Server: «nur auf diesem Gerät»')
        usable = await pg.inner_text('#sumUsable')
        check(usable == '731', f'nutzbar neu 731 L ({usable})')
        await pg.click('#copyBtn')
        link = await pg.evaluate('navigator.clipboard.readText()')
        check(f'#{code}.' in link, 'kopierter Link trägt den Stand als Anhang')

        print('Wiederladen')
        await pg.reload()
        await pg.wait_for_timeout(400)
        check(await p1.input_value() == '180', 'Stand nach Neuladen vom Gerät')
        ctx2 = await b.new_context(viewport={'width': 1280, 'height': 900})
        await no_server(ctx2)
        other = await ctx2.new_page()
        await other.goto(link)
        await other.wait_for_timeout(500)
        check(await other.locator('#cylBody tr[data-i="0"] input[data-f="p"]').input_value() == '180', 'fremdes Gerät: Stand aus dem Link')
        await other.goto(BASE + '#ZZZZZZ')
        await other.wait_for_timeout(400)
        check(not await other.is_hidden('#notice'), 'unbekannter Kurzcode: Hinweis und Beispielwerte')
        await ctx2.close()

        print('Einheiten')
        await pg.click('#pUnitSeg button[data-unit="psi"]')
        check(await p1.input_value() == '2611', 'psi: 180 bar = 2611 psi')
        check(await pg.inner_text('#thCylP') == 'DRUCK PSI' or (await pg.inner_text('#thCylP')).lower() == 'druck psi', 'Spaltenkopf psi')
        await pg.click('#pUnitSeg button[data-unit="bar"]')
        await pg.click('#altUnitSeg button[data-unit="m"]')
        check(await pg.locator('#profBody tr[data-i="1"] input[data-f="alt"]').input_value() == '3658 m', 'Höhen in Metern')
        await pg.click('#altUnitSeg button[data-unit="ft"]')
        a2 = pg.locator('#profBody tr[data-i="1"] input[data-f="alt"]')
        await a2.fill('130')
        await a2.blur()
        check(await a2.input_value() == 'FL130', 'Eingabe «130» wird FL130')
        await a2.fill('FL120')
        await a2.blur()
        st = pg.locator('#setStart')
        await st.fill('9000 ft')
        await st.blur()
        check(await st.input_value() == '9000' and 'ft' in await pg.inner_text('#lblStart'), 'Beginnhöhe in Fuss umstellbar')
        await st.fill('2800 m')
        await st.blur()
        check(await st.input_value() == '2800', 'Beginnhöhe zurück in Meter')

        print('Zeilen ergänzen und entfernen')
        await pg.click('#addCyl')
        check(await pg.locator('#cylBody tr[data-i]').count() == 3, 'dritter Zylinder')
        await pg.click('#cylBody tr[data-i="2"] .del-btn')
        await pg.click('#addLvl')
        check(await pg.locator('#profBody tr[data-i]').count() == 5, 'fünfte Höhenstufe')
        await pg.click('#profBody tr[data-i="4"] .del-btn')
        await p1.fill('200')

        print('Nachführen')
        await pg.click('#trackBtn')
        await pg.select_option('#trLevel', '1')
        await pg.fill('#trElapsed', '3:00')
        await pg.fill('#dlgTrack input.now[data-i="0"]', '118')
        await pg.wait_for_timeout(100)
        check(await pg.inner_text('#trIst') == '594 L' or await pg.inner_text('#trIst') == '595 L', 'Rest Ist rund 594 L')
        check(await pg.inner_text('#trPlanRest') == '627 L', 'Rest Plan 627 L')
        check('1.2' in await pg.inner_text('#trUsed'), 'Faktor rund 1.22')
        check('Sauerstoffvorrat ist genügend' in await pg.inner_text('#trStatus'), 'Rest der Fahrt gedeckt')
        await shot(pg, 'track-desktop')
        await pg.click('#trApply')
        await pg.wait_for_timeout(200)
        check(await p1.input_value() == '118', 'Druck übernommen')
        check(await pg.locator('#profBody tr[data-i]').count() == 3, 'geflogene Höhenstufe abgeschlossen')
        check(not await pg.is_hidden('#factorLine'), 'Verbrauchsfaktor sichtbar')
        await pg.click('#factorReset')
        check(await pg.is_hidden('#factorLine'), 'Faktor zurückgesetzt')

        print('Zurücksetzen, Legende, QR, Sprache')
        await pg.click('#resetBtn')
        await pg.click('#dlgConfirm button[data-v="1"]')
        await pg.wait_for_timeout(200)
        check(await p1.input_value() == '200' and await pg.locator('#profBody tr[data-i]').count() == 4, 'Zurücksetzen auf Beispielwerte')
        check((await pg.evaluate('location.hash')).lstrip('#') == code, 'Kurzcode bleibt beim Zurücksetzen')
        await pg.click('#legendBtn')
        leg = await pg.inner_text('#dlgLegend')
        check('Mountain High' in leg and '16.3' in leg and '96.9' in leg, 'Legende mit Quelle und Stützpunkten')
        check('mhoxygen.com' in await pg.get_attribute('#dlgLegend a', 'href'), 'Legende verlinkt die Herstellertabelle')
        await shot(pg, 'legend')
        await pg.click('#dlgLegend [data-close]')
        await pg.click('#qrBtn')
        check(await pg.locator('#dlgQr .qr-big svg').count() == 1, 'QR-Code gross')
        await pg.click('#dlgQr [data-close]')
        await pg.click('#langSeg button[data-lang="en"]')
        check('Oxygen supply is sufficient' in await pg.inner_text('#balance'), 'Englisch')
        await shot(pg, 'desktop-en', full_page=True)
        await pg.click('#langSeg button[data-lang="de"]')

        print('Druck A5 auf A4 quer')
        r = await pg.evaluate('window.O2.preparePrint()')
        check(r['fits'] and r['level'] == 0, f'Beispiel passt ohne Verkleinern ({r})')
        await pg.emulate_media(media='print')
        pdf = await pg.pdf(prefer_css_page_size=True, print_background=True)
        if SHOTS:
            open(f'{SHOTS}/print.pdf', 'wb').write(pdf)
        pages = len(re.findall(rb'/Type\s*/Page[^s]', pdf))
        check(pages == 1, f'eine Druckseite ({pages})')
        box = re.search(rb'/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)', pdf)
        check(box is not None and abs(float(box.group(1)) - 841.9) < 2 and abs(float(box.group(2)) - 595.3) < 2, 'Seitenformat A4 quer')
        await pg.emulate_media(media='screen')
        # viele Zylinder und Höhenstufen: muss weiterhin auf eine A5-Seite passen
        await pg.evaluate('''() => { const s = window.O2.state();
          s.cyl = Array.from({length: 12}, (_, i) => ({nr: String(i + 1), size: 2, p: 200 - i}));
          s.prof = Array.from({length: 10}, (_, i) => ({alt: 9000 + (i % 5) * 1500, dur: 0.5 + i * 0.1})); }''')
        await pg.locator('#setSf').fill('11')
        r2 = await pg.evaluate('window.O2.preparePrint()')
        check(r2['fits'], f'12 Zylinder und 10 Höhenstufen passen auf A5 ({r2})')
        await pg.emulate_media(media='print')
        pdf2 = await pg.pdf(prefer_css_page_size=True, print_background=True)
        if SHOTS:
            open(f'{SHOTS}/print-many.pdf', 'wb').write(pdf2)
        check(len(re.findall(rb'/Type\s*/Page[^s]', pdf2)) == 1, 'auch dann nur eine Druckseite')
        await pg.emulate_media(media='screen')
        # zugesagte Obergrenze: 6 Zylinder und 12 Höhenstufen (jede mit Übergang) auf einer A5-Seite
        await pg.evaluate('''() => { const s = window.O2.state();
          s.cyl = Array.from({length: 6}, (_, i) => ({nr: String(i + 1), size: 2, p: 200 - i}));
          s.prof = Array.from({length: 12}, (_, i) => ({alt: 9000 + (i % 2 ? 4500 : 0) + i * 300, dur: 0.5 + i * 0.1})); }''')
        await pg.locator('#setSf').fill('12')
        r3 = await pg.evaluate('window.O2.preparePrint()')
        check(r3['fits'], f'6 Zylinder und 12 Höhenstufen passen auf A5 ({r3})')
        await pg.emulate_media(media='print')
        pdf3 = await pg.pdf(prefer_css_page_size=True, print_background=True)
        if SHOTS:
            open(f'{SHOTS}/print-6-12.pdf', 'wb').write(pdf3)
        check(len(re.findall(rb'/Type\s*/Page[^s]', pdf3)) == 1, 'eine Druckseite bei 6 Zylindern und 12 Höhenstufen')
        await pg.emulate_media(media='screen')
        await ctx.close()

        # ---------- Handy ----------
        print('Handy')
        ctx3 = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True)
        await no_server(ctx3)
        ph = await ctx3.new_page()
        ph.on('pageerror', lambda e: errors.append(str(e)))
        await ph.goto(BASE)
        await ph.wait_for_timeout(500)
        check(await ph.is_visible('#bottombar') and 'genügend' in await ph.inner_text('#bottombar'), 'feste Bilanzleiste unten')
        check(await ph.is_hidden('#bodySet') and await ph.is_hidden('#bodyProf'), 'Abschnitte 2 und 3 eingeklappt')
        check(await ph.is_visible('.header-logo'), 'Logo in der Kopfzeile')
        sw = await ph.evaluate('document.documentElement.scrollWidth')
        check(sw <= 390, f'kein seitliches Scrollen ({sw}px)')
        await shot(ph, 'phone')
        await ph.click('#panelSet .panel-toggle')
        await ph.click('#panelProf .panel-toggle')
        await ph.click('#colOut .res-toggle')
        check(await ph.is_visible('#bodySet') and await ph.is_visible('#rowsTable'), 'Abschnitte aufklappbar')
        sw = await ph.evaluate('document.documentElement.scrollWidth')
        check(sw <= 390, f'aufgeklappt kein seitliches Scrollen ({sw}px)')
        await shot(ph, 'phone-open', full_page=True)
        await ph.click('#trackBtn2')
        check(await ph.is_visible('#trApply'), 'Nachführen als Vollbild')
        await shot(ph, 'phone-track')
        await ph.click('#dlgTrack [data-close]')
        await ph.click('#menuBtn')
        await ph.click('#menu button[data-act="theme"]')
        check(await ph.evaluate('document.documentElement.dataset.theme') == 'dark', 'dunkle Darstellung')
        await shot(ph, 'phone-dark')
        await ctx3.close()

        check(not errors, 'keine Fehler in der Browser-Konsole' + (': ' + ' | '.join(errors[:5]) if errors else ''))
        await b.close()

    print()
    print('FEHLER: %d' % len(fails) if fails else 'ALLE PRÜFUNGEN BESTANDEN')
    sys.exit(1 if fails else 0)


asyncio.run(main())
