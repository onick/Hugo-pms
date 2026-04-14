import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
const LOGIN = { email: 'mfranciscomartinez@gmail.com', password: 'Isabella1515@@' };
const OUT = './static/screenshots';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Login
  console.log('Logging in...');
  await page.goto(`${BASE}/auth`);
  await page.fill('input[type="email"]', LOGIN.email);
  await page.fill('input[type="password"]', LOGIN.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  console.log('Logged in at:', page.url());

  const screenshots = [
    { name: 'front-desk', url: '/dashboard/front-desk?tab=calendario', wait: 3000 },
    { name: 'reservas', url: '/dashboard/front-desk?tab=reservas', wait: 3000 },
    { name: 'huespedes', url: '/dashboard/front-desk?tab=huespedes', wait: 3000 },
    { name: 'habitaciones', url: '/dashboard/front-desk?tab=habitaciones', wait: 2000 },
    { name: 'facturacion', url: '/dashboard/front-desk?tab=facturacion', wait: 3000 },
    { name: 'housekeeping', url: '/dashboard/front-desk?tab=limpieza', wait: 2000 },
    { name: 'tarifas', url: '/dashboard/front-desk?tab=ingresos', wait: 2000 },
    { name: 'dashboard', url: '/dashboard', wait: 3000 },
    { name: 'settings', url: '/dashboard/settings', wait: 2000 },
  ];

  for (const s of screenshots) {
    console.log(`Capturing ${s.name}...`);
    await page.goto(`${BASE}${s.url}`);
    await page.waitForTimeout(s.wait);
    await page.screenshot({ path: `${OUT}/${s.name}.png`, fullPage: false });
    console.log(`  ✅ ${s.name}.png`);
  }

  await browser.close();
  console.log('\nDone! Screenshots saved to static/screenshots/');
}

main().catch(e => { console.error(e); process.exit(1); });
