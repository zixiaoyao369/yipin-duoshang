import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '..', 'V3页面快照');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const pages = [
  { name: '01-项目总览', nav: '项目总览' },
  { name: '02-数据准备', nav: '数据准备' },
  { name: '03-相似匹配-数据总览', nav: '相似匹配', tab: '数据总览' },
  { name: '04-相似匹配-操作记录', nav: null, tab: '操作记录' },
  { name: '05-相似匹配-匹配规则', nav: null, tab: '匹配规则' },
  { name: '06-规则配置', nav: '规则配置' },
  { name: '07-BadCase', nav: 'BadCase' },
  { name: '08-数据核查', nav: '数据核查' },
];

const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;

async function captureFullPage(page, filePath, label) {
  // Expand layout to show full content height
  const fullHeight = await page.evaluate(() => {
    const root = document.querySelector('.flex.h-screen.overflow-hidden') ||
                 document.querySelector('[class*="flex"][class*="h-screen"]');
    const main = document.querySelector('main');
    if (root) { root.style.height = 'auto'; root.style.overflow = 'visible'; }
    if (main) { main.style.overflow = 'visible'; main.style.height = 'auto'; }
    document.body.offsetHeight;
    const rootH = root ? root.scrollHeight : document.body.scrollHeight;
    return Math.max(rootH, document.body.scrollHeight);
  });

  console.log(`  Content height: ${fullHeight}px`);
  await page.setViewport({ width: VIEWPORT_WIDTH, height: fullHeight });
  await new Promise(r => setTimeout(r, 500));

  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`  Saved: ${label}`);

  // Restore
  await page.evaluate(() => {
    const root = document.querySelector('.flex.h-screen.overflow-hidden') ||
                 document.querySelector('[class*="flex"][class*="h-screen"]');
    const main = document.querySelector('main');
    if (root) { root.style.height = ''; root.style.overflow = ''; }
    if (main) { main.style.overflow = ''; main.style.height = ''; }
  });
  await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });
  await new Promise(r => setTimeout(r, 300));
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  });

  const page = await browser.newPage();

  // Load app
  await page.goto('http://localhost:5174/yipin-duoshang/', { waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForSelector('nav', { timeout: 10000 });
  console.log('App loaded successfully\n');

  for (const p of pages) {
    console.log(`Capturing: ${p.name}`);
    await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

    // Click sidebar nav if needed
    if (p.nav) {
      await page.evaluate((text) => {
        const links = document.querySelectorAll('nav a');
        for (const link of links) {
          if (link.textContent.includes(text)) { link.click(); break; }
        }
      }, p.nav);
      await new Promise(r => setTimeout(r, 2000));
    }

    // Click tab if needed
    if (p.tab) {
      await page.evaluate((tabText) => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent.trim() === tabText && btn.className.includes('border-b-2')) {
            btn.click(); break;
          }
          if (btn.textContent.trim() === tabText) {
            btn.click(); break;
          }
        }
      }, p.tab);
      await new Promise(r => setTimeout(r, 1000));
    }

    const filePath = path.join(outputDir, `${p.name}.png`);
    await captureFullPage(page, filePath, p.name);
    console.log('');
  }

  await browser.close();
  console.log('All V3 screenshots captured!');
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
