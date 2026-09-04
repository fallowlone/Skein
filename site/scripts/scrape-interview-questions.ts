import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://itlead.org/en/interview-questions');
  console.log('Page title:', await page.title());
  await browser.close();
}

main().catch(console.error);
