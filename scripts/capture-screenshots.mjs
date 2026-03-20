/**
 * Captures 3-4 product screenshots for each Top 100 product.
 * Uses puppeteer-core with local Chrome to capture above-fold,
 * mid-page, and lower-page viewport sections.
 *
 * Usage: node scripts/capture-screenshots.mjs [slug]
 * If slug is provided, only captures that product.
 */

import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "screenshots");

// Extract product URLs from data.ts
const dataFile = readFileSync(join(ROOT, "src/app/top-100/data.ts"), "utf8");
const productPattern =
  /slug:\s*"([^"]+)"[\s\S]*?url:\s*"([^"]+)"/g;

const products = [];
let match;
while ((match = productPattern.exec(dataFile)) !== null) {
  products.push({ slug: match[1], url: `https://${match[2]}` });
}

const VIEWPORT = { width: 1440, height: 900 };
const SECTIONS = [
  { label: "hero", scrollY: 0 },
  { label: "mid", scrollY: 900 },
  { label: "lower", scrollY: 1800 },
];

const CHROME_PATH =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function captureProduct(browser, product) {
  const dir = join(OUT_DIR, product.slug);
  if (existsSync(join(dir, "hero.png"))) {
    console.log(`  [skip] ${product.slug} — already captured`);
    return;
  }

  mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  try {
    console.log(`  [load] ${product.url}`);
    await page.goto(product.url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait a bit for animations/lazy-loaded content
    await new Promise((r) => setTimeout(r, 2000));

    // Try to dismiss cookie banners / modals
    try {
      await page.evaluate(() => {
        const selectors = [
          '[class*="cookie"] button',
          '[class*="consent"] button',
          '[class*="banner"] button[class*="accept"]',
          '[class*="modal"] button[class*="close"]',
          'button[aria-label="Close"]',
          'button[aria-label="Accept"]',
          'button[aria-label="Accept all"]',
          '[id*="cookie"] button',
          '[id*="consent"] button',
        ];
        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn) {
            btn.click();
            break;
          }
        }
      });
      await new Promise((r) => setTimeout(r, 500));
    } catch {
      // Ignore modal dismissal errors
    }

    // Capture each section
    for (const section of SECTIONS) {
      await page.evaluate((y) => window.scrollTo(0, y), section.scrollY);
      await new Promise((r) => setTimeout(r, 500));

      const path = join(dir, `${section.label}.png`);
      await page.screenshot({ path, type: "png" });
      console.log(`  [save] ${product.slug}/${section.label}.png`);
    }
  } catch (err) {
    console.error(`  [fail] ${product.slug}: ${err.message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const targetSlug = process.argv[2];
  const targets = targetSlug
    ? products.filter((p) => p.slug === targetSlug)
    : products;

  if (targets.length === 0) {
    console.error("No matching products found");
    process.exit(1);
  }

  console.log(
    `Capturing screenshots for ${targets.length} product(s)...\n`
  );

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--window-size=1440,900",
    ],
  });

  for (const product of targets) {
    console.log(`\n[${product.slug}]`);
    await captureProduct(browser, product);
  }

  await browser.close();
  console.log("\nDone.");
}

main().catch(console.error);
