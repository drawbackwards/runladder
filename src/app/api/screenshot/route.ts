import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium-min";
import puppeteer, { Page } from "puppeteer-core";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

// Chromium binary hosted on GitHub — downloaded at cold start
const CHROMIUM_PACK =
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar";

/* ── Rate limiting (in-memory, per-IP) ── */
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // screenshots per window (expensive operation)
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

/* ── Blocked domain patterns (explicit/adult content) ── */
const BLOCKED_DOMAINS = [
  /pornhub/i, /xvideos/i, /xnxx/i, /xhamster/i, /redtube/i, /youporn/i,
  /brazzers/i, /bangbros/i, /realitykings/i, /naughtyamerica/i,
  /chaturbate/i, /stripchat/i, /livejasmin/i, /cam4/i, /bongacams/i,
  /onlyfans/i, /fansly/i, /manyvids/i,
  /4chan\.org/i, /8chan/i, /8kun/i,
  /thepiratebay/i, /torrentz/i,
  /silkroad/i, /darkweb/i,
  /bestgore/i, /liveleak/i, /rotten\.com/i,
  /drug(?:s)?(?:forum|market)/i,
];

function isBlockedDomain(hostname: string): boolean {
  return BLOCKED_DOMAINS.some((pattern) => pattern.test(hostname));
}

/* ── Block internal/private IPs ── */
function isPrivateUrl(hostname: string): boolean {
  return /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|::1|\[::1\])/.test(hostname);
}

/* ── AI-guided modal dismissal ── */
async function dismissModalByAI(page: Page, action: string) {
  // Extract key words from AI description to find clickable elements
  const keywords = action.toLowerCase();

  await page.evaluate((kw: string) => {
    // Find all clickable elements (buttons, links, spans with click handlers)
    const clickables = Array.from(
      document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"], [onclick], span[class*="close"], div[class*="close"]')
    ) as HTMLElement[];

    // Score each element by how well its text matches the AI description
    let bestMatch: HTMLElement | null = null;
    let bestScore = 0;

    for (const el of clickables) {
      if (!el.offsetParent && el.getAttribute("aria-hidden") !== "false") continue; // not visible
      const text = (el.textContent || "").trim().toLowerCase();
      const ariaLabel = (el.getAttribute("aria-label") || "").toLowerCase();
      const title = (el.getAttribute("title") || "").toLowerCase();
      const combined = `${text} ${ariaLabel} ${title}`;

      // Simple keyword match scoring
      let score = 0;
      const terms = kw.split(/\s+/);
      for (const term of terms) {
        if (term.length > 2 && combined.includes(term)) score++;
      }

      // Boost for common dismiss patterns
      if (/accept|agree|got it|ok|close|dismiss|no thanks|maybe later|i understand|continue/i.test(combined)) {
        score += 2;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = el;
      }
    }

    if (bestMatch && bestScore > 0) {
      bestMatch.click();
    } else {
      // Fallback: just click any visible "close" or "accept" button
      for (const el of clickables) {
        if (!el.offsetParent) continue;
        const t = (el.textContent || "").trim().toLowerCase();
        if (/^(accept|agree|ok|close|got it|dismiss|×|x|✕)$/i.test(t) || el.getAttribute("aria-label")?.toLowerCase().includes("close")) {
          el.click();
          break;
        }
      }
    }

    // Nuclear option: remove all fixed overlays
    document.querySelectorAll('*').forEach((el) => {
      if (el instanceof HTMLElement) {
        const s = window.getComputedStyle(el);
        if (s.position === 'fixed' && s.zIndex && parseInt(s.zIndex) > 999 && el.offsetHeight > 100) {
          el.remove();
        }
      }
    });
  }, keywords);
}

export async function POST(req: NextRequest) {
  let browser = null;

  try {
    /* ── Bot detection: block known automation tools ── */
    const ua = req.headers.get("user-agent") || "";
    if (/curl|wget|python-requests|httpie|postman|scrapy|phantomjs/i.test(ua)) {
      return NextResponse.json(
        { error: "Automated requests are not allowed." },
        { status: 403 }
      );
    }

    /* ── Rate limiting ── */
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { url } = body;

    if (!url || typeof url !== "string" || url.length > 2048) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Basic URL validation
    let parsed: URL;
    try {
      parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block non-http(s) protocols
    if (!parsed.protocol.startsWith("http")) {
      return NextResponse.json(
        { error: "Only HTTP/HTTPS URLs are supported" },
        { status: 400 }
      );
    }

    // Block private/internal IPs (SSRF protection)
    if (isPrivateUrl(parsed.hostname)) {
      return NextResponse.json(
        { error: "Internal URLs are not allowed." },
        { status: 400 }
      );
    }

    // Block explicit content domains
    if (isBlockedDomain(parsed.hostname)) {
      return NextResponse.json(
        { error: "This URL is not allowed. Ladder scores UI/UX screens from legitimate websites." },
        { status: 400 }
      );
    }

    const normalizedUrl = parsed.toString();

    const execPath = await chromium.executablePath(CHROMIUM_PACK);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1440, height: 900 },
      executablePath: execPath,
      headless: true,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    // Wait for rendering + lazy loading
    await new Promise((r) => setTimeout(r, 3000));

    // Dismiss common modals, cookie banners, and popups
    await page.evaluate(() => {
      const selectors = [
        // Cookie consent buttons
        '[class*="cookie"] button', '[id*="cookie"] button',
        '[class*="consent"] button', '[id*="consent"] button',
        '[class*="Cookie"] button', '[id*="Cookie"] button',
        'button[class*="accept"]', 'button[id*="accept"]',
        'button[class*="Accept"]', 'button[id*="Accept"]',
        'button[class*="agree"]', 'button[id*="agree"]',
        'a[class*="accept"]', 'a[id*="accept"]',
        // Common cookie banner frameworks
        '#onetrust-accept-btn-handler',           // OneTrust
        '.onetrust-close-btn-handler',
        '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll', // Cookiebot
        '.cc-btn.cc-dismiss',                      // Cookie Consent (Osano)
        '#cookie-banner button',
        '.cookie-notice button',
        '[data-testid="cookie-policy-dialog-accept-button"]',
        // Generic close / dismiss buttons
        'button[aria-label="Close"]', 'button[aria-label="close"]',
        'button[aria-label="Dismiss"]', 'button[aria-label="dismiss"]',
        'button[class*="close-modal"]', 'button[class*="closeModal"]',
        'button[class*="dismiss"]',
        // Newsletter / signup popups
        '[class*="modal"] button[class*="close"]',
        '[class*="popup"] button[class*="close"]',
        '[class*="overlay"] button[class*="close"]',
        '[role="dialog"] button[aria-label="Close"]',
        '[role="dialog"] button[class*="close"]',
        // "No thanks" / "Maybe later" links
        'a[class*="dismiss"]', 'a[class*="no-thanks"]', 'a[class*="noThanks"]',
      ];

      for (const sel of selectors) {
        try {
          const els = document.querySelectorAll(sel);
          els.forEach((el) => {
            if (el instanceof HTMLElement && el.offsetParent !== null) {
              el.click();
            }
          });
        } catch { /* ignore selector errors */ }
      }

      // Also remove fixed/sticky overlays that block content
      const overlays = document.querySelectorAll(
        '[class*="overlay"], [class*="modal"], [class*="cookie-banner"], [class*="consent"], [id*="onetrust"], [id*="sp_message"]'
      );
      overlays.forEach((el) => {
        if (el instanceof HTMLElement) {
          const style = window.getComputedStyle(el);
          if (style.position === 'fixed' || style.position === 'sticky') {
            el.remove();
          }
        }
      });
    });

    // Brief pause for modal dismiss animations
    await new Promise((r) => setTimeout(r, 500));

    // AI-powered modal detection: screenshot the page, ask Claude if a modal is blocking
    const preCheck = await page.screenshot({ type: "png", encoding: "base64" });
    try {
      const ai = new Anthropic();
      const modalCheck = await ai.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/png", data: preCheck as string } },
            { type: "text", text: "Is there a modal, popup, cookie banner, or overlay blocking the main page content? If yes, respond with JSON: {\"blocked\":true,\"action\":\"describe the button/link text to click to dismiss it\"}. If the page is clear, respond: {\"blocked\":false}. ONLY return JSON." },
          ],
        }],
      });
      const modalText = modalCheck.content.find((b) => b.type === "text");
      if (modalText && modalText.type === "text") {
        const parsed = JSON.parse(modalText.text.replace(/```json|```/g, "").trim());
        if (parsed.blocked && parsed.action) {
          // Try to find and click the described element
          await dismissModalByAI(page, parsed.action);
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    } catch {
      // AI modal check failed — continue with what we have
    }

    // Take viewport screenshot (above the fold)
    const viewportShot = await page.screenshot({
      type: "png",
      encoding: "base64",
    });

    // Scroll down and capture key sections
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = 900;
    const shots: { label: string; data: string }[] = [
      { label: "Above the fold", data: viewportShot as string },
    ];

    const maxScrolls = Math.min(
      3,
      Math.floor(pageHeight / viewportHeight) - 1
    );
    for (let i = 1; i <= maxScrolls; i++) {
      const scrollY = i * viewportHeight;
      await page.evaluate((y: number) => window.scrollTo(0, y), scrollY);
      await new Promise((r) => setTimeout(r, 800));
      const shot = await page.screenshot({
        type: "png",
        encoding: "base64",
      });
      const labels = ["Mid-page content", "Lower content", "Footer area"];
      shots.push({
        label: labels[i - 1] || `Section ${i + 1}`,
        data: shot as string,
      });
    }

    const pageTitle = await page.title().catch(() => normalizedUrl);

    await browser.close();
    browser = null;

    return NextResponse.json({
      url: normalizedUrl,
      title: pageTitle,
      screenshots: shots.map((s) => ({
        label: s.label,
        image: `data:image/png;base64,${s.data}`,
      })),
    });
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
    console.error(
      "[LADDER:ERROR] Screenshot endpoint:",
      err instanceof Error ? err.message : err
    );

    const message = err instanceof Error ? err.message : "Screenshot failed";
    const isTimeout =
      message.includes("timeout") || message.includes("Timeout");

    return NextResponse.json(
      {
        error: isTimeout
          ? "Page took too long to load. Try a faster URL."
          : `Screenshot capture failed: ${message}`,
      },
      { status: 500 }
    );
  }
}
