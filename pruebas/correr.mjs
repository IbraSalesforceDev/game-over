/**
 * Ejecuta el banco de pruebas de la partida acompañada y cuenta cómo ha ido.
 *
 * Hace falta el navegador de Playwright y el servidor de desarrollo:
 *
 *     npm run dev
 *     npm i -D playwright-core     # si no está
 *     node pruebas/correr.mjs
 *
 * No entra en `npm test` porque necesita un navegador de verdad: WebRTC no
 * existe en Node, y es justamente WebRTC lo que se quiere probar aquí.
 */
import { chromium } from 'playwright-core';
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const pag = await nav.newPage({ viewport: { width: 900, height: 700 } });
const salida = [];
pag.on('console', (m) => salida.push(m.text()));
pag.on('pageerror', (e) => salida.push('PAGEERROR ' + e.message));
await pag.goto(`${process.env.URL_BANCO ?? 'http://localhost:5173'}/pruebas/red.html`);
await pag.waitForFunction(() => document.body.textContent.includes('TODO BIEN') || document.body.textContent.includes('FALLAN') || document.body.textContent.includes('se ha roto'), null, { timeout: 90000 }).catch(() => {});
console.log(await pag.locator('#resultados').innerText().catch(() => '(sin resultados)'));
console.log('---');
for (const s of salida) console.log(s);
await nav.close();
process.exit(salida.some((s) => s.startsWith('BANCO-OK')) ? 0 : 1);
