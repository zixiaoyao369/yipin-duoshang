import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(__dirname, '..', 'V2页面快照');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const pages = [
  { name: '01-项目总览', path: '/' },
  { name: '02-数据准备', path: '/data-prep' },
  { name: '03-类目匹配', path: '/category-match' },
  { name: '04-相似匹配', path: '/similarity-match' },
  { name: '05-规则配置', path: '/rules-config' },
  { name: '06-BadCase', path: '/badcase' },
  { name: '07-数据核查', path: '/data-verify' },
];

const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  });

  const page = await browser.newPage();

  // Navigate to home page to initialize the app
  await page.goto('http://localhost:5175/', { waitUntil: 'networkidle0', timeout: 15000 });
  await page.waitForSelector('nav', { timeout: 10000 });
  console.log('App loaded successfully');

  for (const p of pages) {
    console.log(`\nCapturing: ${p.name} (${p.path})`);

    // Reset viewport to default before navigating
    await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

    // Click sidebar navigation link
    const linkText = p.path === '/' ? '项目总览' : p.name.replace(/^\d+-/, '');
    await page.evaluate((text) => {
      const links = document.querySelectorAll('nav a');
      for (const link of links) {
        if (link.textContent.includes(text)) {
          link.click();
          break;
        }
      }
    }, linkText);

    // Wait for page to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify active sidebar
    const activeLink = await page.evaluate(() => {
      const links = document.querySelectorAll('nav a');
      for (const link of links) {
        if (link.className.includes('bg-white/12')) return link.textContent.trim();
      }
      return 'unknown';
    });
    console.log(`  Active sidebar: "${activeLink}"`);

    // Get page title
    const pageTitle = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return 'no main';
      const h1 = main.querySelector('h1, h2');
      return h1 ? h1.textContent.trim() : 'no title found';
    });
    console.log(`  Page title: "${pageTitle}"`);

    // Expand layout to show full content height
    const fullHeight = await page.evaluate(() => {
      const root = document.querySelector('.flex.h-screen.overflow-hidden');
      const main = document.querySelector('main');
      if (root) {
        root.style.height = 'auto';
        root.style.overflow = 'visible';
      }
      if (main) {
        main.style.overflow = 'visible';
        main.style.height = 'auto';
      }
      document.body.offsetHeight;
      const rootH = root ? root.scrollHeight : document.body.scrollHeight;
      const bodyH = document.body.scrollHeight;
      return Math.max(rootH, bodyH);
    });

    console.log(`  Full content height: ${fullHeight}px`);

    // Set viewport to full content height
    await page.setViewport({ width: VIEWPORT_WIDTH, height: fullHeight });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take screenshot
    const filePath = path.join(outputDir, `${p.name}.png`);
    await page.screenshot({
      path: filePath,
      fullPage: true,
    });
    console.log(`  Saved: ${filePath}`);

    // Restore layout styles
    await page.evaluate(() => {
      const root = document.querySelector('.flex.h-screen.overflow-hidden') ||
                   document.querySelector('[class*="flex"][class*="h-screen"]');
      const main = document.querySelector('main');
      if (root) {
        root.style.height = '';
        root.style.overflow = '';
      }
      if (main) {
        main.style.overflow = '';
        main.style.height = '';
      }
    });
    await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  await browser.close();
  console.log('\nAll V2 full-page screenshots captured successfully!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
