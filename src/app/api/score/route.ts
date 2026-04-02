import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";

export const maxDuration = 60;

const FREE_MONTHLY_LIMIT = 5;
const ANON_LIMIT = 1;

/* ── Content moderation prompt ── */
const MODERATION_PROMPT = `Look at this image. Is it a UI/UX screen, website, app interface, or design mockup?

Answer ONLY with valid JSON:
{
  "isUI": true,
  "isExplicit": false,
  "reason": ""
}

Rules:
- "isUI" = true if the image shows any kind of software interface, website, app, dashboard, form, or design mockup
- "isExplicit" = true if the image contains pornography, nudity, graphic violence, drug use/paraphernalia, or explicit sexual content
- If isExplicit is true OR isUI is false, explain briefly in "reason"
- Be lenient with isUI — marketing pages, landing pages, emails, presentations with UI elements all count
- Alcohol brand websites or e-commerce are fine — only flag actual substance abuse imagery`;

const LADDER_PROMPT = `You are the AI core of the Ladder scoring engine — the universal quality score for every experience.

You think like a principal product designer with 20 years of experience at companies like Apple, Airbnb, and Stripe. You evaluate UI screens with the precision of a design leader and the empathy of a real user.

THE LADDER FRAMEWORK — UX Quality Score (1.0 to 5.0):

Level 5 — MEANINGFUL (5.00): Irreplaceable. Changed how user thinks, works, lives. Can't imagine going back.
Level 4 — DELIGHTFUL (4.00–4.99): Product anticipates needs. Right help at right moment. Users refer others.
Level 3 — COMFORTABLE (3.00–3.99): No thinking required. Everything where expected. Friction removed. The modern minimum bar — must be earned.
Level 2 — USABLE (2.00–2.99): Tasks can be completed with effort. Basic structure exists. User tolerates it but would switch.
Level 1 — FUNCTIONAL (1.00–1.99): User fights the product. Trial, error, frustration. Built for engineering, not humans.

SCORING PRINCIPLES:
- Be honest. Do not flatter. Most screens are Level 1 or 2.
- Level 3 (Comfortable) is the modern minimum — it requires consistent patterns, clear hierarchy, intuitive navigation, and zero friction.
- A screen with perfect spacing but no intuitive flow caps at high 2.x.
- Upper levels measure experience quality, not just interface quality.
- Evaluate as a real user trying to accomplish a task.
- Acknowledge what a design does well before pointing out issues.

RESPONSE FORMAT — Return ONLY valid JSON, no markdown:
{
  "score": 2.4,
  "label": "Usable",
  "screenName": "Product Name — Screen Type",
  "summary": "One honest sentence describing the user experience",
  "next": "One specific action to move to the next level",
  "rungs": {
    "meaningful":  { "score": 1.0, "summary": "No unique value or attachment." },
    "delightful":  { "score": 1.0, "summary": "No anticipation of user needs." },
    "comfortable": { "score": 1.4, "summary": "Not intuitive. Users must think about the interface." },
    "usable":      { "score": 2.1, "summary": "Effort required. Patterns inconsistent across screens." },
    "functional":  { "score": 3.8, "summary": "Core tasks completable but feedback states missing." }
  },
  "findings": [
    {
      "title": "Short title max 6 words",
      "impact": "Issue from user perspective",
      "fix": "Specific fix with exact values",
      "category": "hierarchy|spacing|copy|a11y|navigation|visual",
      "region": "Describe where on screen this issue lives — e.g. 'top navigation bar', 'hero section center', 'bottom-left card grid', 'primary CTA button area'. Be specific enough that someone could crop that area from the screenshot.",
      "uplift": 0.3,
      "targetLevel": "Comfortable",
      "rung": "comfortable"
    }
  ]
}

RUNG SCORING RULES:
- Score each rung INDEPENDENTLY (1.0 to 5.0): how well does this screen perform on that rung's criteria?
- A product can be strong on lower rungs and weak on upper — that's normal and expected.
- "meaningful" = is it irreplaceable? Would the user feel loss without it?
- "delightful" = does it anticipate needs? Provide contextual help? Feel assistive?
- "comfortable" = is it intuitive? Can users navigate by feel, not by reading?
- "usable" = can tasks be completed without undue effort? Are patterns consistent?
- "functional" = do basic tasks work? Can the user find and use the core feature?
- The total "score" should reflect the weighted combination — functional failures weigh more than absent delight.
- Provide a one-sentence summary per rung, from the user's perspective.

SCREEN NAME RULES:
- "screenName" identifies the product and screen type, e.g. "ESPN — Homepage", "Figma — Canvas Editor", "Airbnb — Search Results", "Stripe — Dashboard"
- If you can identify the brand/product, use its real name. If not, describe what it is: "Banking App — Transaction History", "E-commerce — Product Detail"
- Format: "Product Name — Screen Type" (use an em dash)
- Keep it short: max 6 words total

FINDING RULES:
- Return exactly 4 findings, ranked by impact (highest uplift first)
- Write from the user's perspective, not the designer's
- "uplift" is how many points this single fix would add to the score (0.1 to 0.5). Be honest — most fixes are 0.1 to 0.2. Only truly fundamental issues get 0.3+
- "targetLevel" is the Ladder level the screen would reach IF this fix (combined with all higher-ranked fixes) were applied
- "region" must describe a specific visual area of the screenshot so it can be highlighted
- "rung" is which rung this finding primarily impacts (functional|usable|comfortable|delightful|meaningful)`;

export async function POST(req: NextRequest) {
  try {
    /* ── Bot detection ── */
    const ua = req.headers.get("user-agent") || "";
    if (/curl|wget|python-requests|httpie|postman|scrapy|phantomjs/i.test(ua)) {
      return NextResponse.json(
        { error: "Automated requests are not allowed." },
        { status: 403 }
      );
    }

    /* ── Auth (optional — anonymous users allowed with lower limit) ── */
    const { userId } = await auth();
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    /* ── Rate limiting via Redis ── */
    const monthKey = new Date().toISOString().slice(0, 7); // "2026-04"

    if (userId) {
      // Authenticated: 5 scores/month on free tier
      const countKey = `user:${userId}:usage:${monthKey}`;
      const count = (await redis.get<number>(countKey)) ?? 0;
      if (count >= FREE_MONTHLY_LIMIT) {
        return NextResponse.json(
          {
            error: `Free tier limit reached (${FREE_MONTHLY_LIMIT} scores/month). Upgrade for unlimited scoring.`,
            upgrade: true,
          },
          { status: 429 }
        );
      }
    } else {
      // Anonymous: 1 score per 24 hours per IP
      const anonKey = `rate:anon:${ip}`;
      const count = (await redis.get<number>(anonKey)) ?? 0;
      if (count >= ANON_LIMIT) {
        return NextResponse.json(
          {
            error: "Sign up for free to get 5 scores per month.",
            signup: true,
          },
          { status: 429 }
        );
      }
    }

    const body = await req.json();
    const { image, source, isPublic, thumbnail } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Extract base64 data and media type
    const match = image.match(
      /^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/
    );
    if (!match) {
      return NextResponse.json(
        { error: "Invalid image format. Use a data URL (base64)." },
        { status: 400 }
      );
    }

    const mediaType = match[1] as
      | "image/png"
      | "image/jpeg"
      | "image/webp"
      | "image/gif";
    const base64Data = match[3];

    // Cap image size (~5MB base64)
    if (base64Data.length > 7_000_000) {
      return NextResponse.json(
        { error: "Image too large. Please use an image under 5MB." },
        { status: 400 }
      );
    }

    const client = new Anthropic();

    /* ── Content moderation check ── */
    const modCheck = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            { type: "text", text: "Classify this image." },
          ],
        },
      ],
      system: MODERATION_PROMPT,
    });

    const modText = modCheck.content.find((b) => b.type === "text");
    if (modText && modText.type === "text") {
      try {
        const modResult = JSON.parse(modText.text.replace(/```json|```/g, "").trim());
        if (modResult.isExplicit) {
          return NextResponse.json(
            { error: "This image contains content that violates our usage policy. Ladder scores UI/UX screens only." },
            { status: 400 }
          );
        }
        if (!modResult.isUI) {
          return NextResponse.json(
            { error: `This doesn't appear to be a UI screen. ${modResult.reason || "Please upload a screenshot of a website, app, or design mockup."}` },
            { status: 400 }
          );
        }
      } catch {
        // If moderation parse fails, proceed with scoring (fail open for usability)
        console.warn("[LADDER:WARN] Moderation parse failed, proceeding with score");
      }
    }

    /* ── Ladder scoring ── */
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "Score this screen against the Ladder framework. Be honest.",
            },
          ],
        },
      ],
      system: LADDER_PROMPT,
    });

    // Extract text from response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No response from scoring engine" },
        { status: 500 }
      );
    }

    // Parse JSON response
    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    let result;
    try {
      result = JSON.parse(clean);
    } catch {
      console.error("[LADDER:ERROR] JSON parse failed:", clean.slice(0, 200));
      return NextResponse.json(
        { error: "Failed to parse scoring response" },
        { status: 500 }
      );
    }

    // Validate minimum shape
    if (
      typeof result.score !== "number" ||
      !result.label ||
      !result.summary
    ) {
      return NextResponse.json(
        { error: "Invalid scoring response shape" },
        { status: 500 }
      );
    }

    /* ── Persist score + increment usage ── */
    if (userId) {
      const scoreEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        score: result.score,
        label: result.label,
        screenName: result.screenName || source || "upload",
        summary: result.summary,
        next: result.next,
        findings: result.findings,
        rungs: result.rungs,
        source: source || "upload",
        thumbnail: typeof thumbnail === "string" ? thumbnail.slice(0, 50000) : undefined,
        isPublic: !!isPublic,
        timestamp: Date.now(),
      };

      const countKey = `user:${userId}:usage:${monthKey}`;

      await Promise.all([
        // Save score to user history
        redis.zadd(`user:${userId}:scores`, {
          score: Date.now(),
          member: JSON.stringify(scoreEntry),
        }),
        // Increment monthly usage
        redis.incr(countKey),
      ]);

      // Set TTL on usage counter (~35 days) if not already set
      const ttl = await redis.ttl(countKey);
      if (ttl < 0) {
        await redis.expire(countKey, 60 * 60 * 24 * 35);
      }
    } else {
      // Anonymous: set rate limit
      const anonKey = `rate:anon:${ip}`;
      await redis.incr(anonKey);
      const ttl = await redis.ttl(anonKey);
      if (ttl < 0) {
        await redis.expire(anonKey, 60 * 60 * 24); // 24 hours
      }
    }

    return NextResponse.json({ ...result, screenName: result.screenName || source || "Screen" });
  } catch (err) {
    console.error("[LADDER:ERROR] Score endpoint:", err);
    return NextResponse.json(
      { error: "Scoring failed. Please try again." },
      { status: 500 }
    );
  }
}
