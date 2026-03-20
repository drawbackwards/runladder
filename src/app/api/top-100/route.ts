import { NextRequest, NextResponse } from "next/server";
import { getLevel } from "@/lib/ladder";

/**
 * Auto-scoring pipeline for Top 100.
 *
 * POST /api/top-100 — triggers a scoring run for one or more products
 * Requires x-admin-key header.
 *
 * Body: { urls: string[] } — list of URLs to capture and score
 * Response: { results: Array<{ url, score, label, summary, verdict, screenshot }> }
 *
 * This endpoint:
 * 1. Captures a screenshot of each URL via the screenshot API
 * 2. Scores each screenshot via the score API
 * 3. Returns the results for storage/publishing
 *
 * Designed to be called by a Vercel Cron or manual trigger.
 */

export const maxDuration = 300; // 5 minutes for batch scoring

const ADMIN_KEY = process.env.ADMIN_KEY || "";

export async function POST(req: NextRequest) {
  // Auth check
  const key = req.headers.get("x-admin-key");
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { urls } = await req.json();

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "urls must be a non-empty array" },
        { status: 400 }
      );
    }

    // Cap at 10 per request to stay within timeout
    const batch = urls.slice(0, 10);
    const baseUrl = req.nextUrl.origin;
    const results = [];

    for (const url of batch) {
      try {
        // Step 1: Capture screenshot
        const screenshotRes = await fetch(`${baseUrl}/api/screenshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!screenshotRes.ok) {
          results.push({ url, error: "Screenshot capture failed", score: null });
          continue;
        }

        const screenshotData = await screenshotRes.json();
        const screenshots = screenshotData.screenshots;

        if (!screenshots || screenshots.length === 0) {
          results.push({ url, error: "No screenshots returned", score: null });
          continue;
        }

        // Use the first screenshot (full page view)
        const image = screenshots[0].image;

        // Step 2: Score the screenshot
        const scoreRes = await fetch(`${baseUrl}/api/score`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
        });

        if (!scoreRes.ok) {
          results.push({ url, error: "Scoring failed", score: null });
          continue;
        }

        const scoreData = await scoreRes.json();

        results.push({
          url,
          score: scoreData.score,
          label: scoreData.label,
          summary: scoreData.summary,
          next: scoreData.next,
          findingsCount: scoreData.findings?.length || 0,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        results.push({
          url,
          error: err instanceof Error ? err.message : "Unknown error",
          score: null,
        });
      }
    }

    const scored = results.filter((r) => r.score !== null);
    const failed = results.filter((r) => r.score === null);

    return NextResponse.json({
      total: batch.length,
      scored: scored.length,
      failed: failed.length,
      results,
    });
  } catch (err) {
    console.error("[TOP-100] Pipeline error:", err);
    return NextResponse.json(
      { error: "Pipeline failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/top-100 — returns the current seed list with scores
 * Public endpoint (no auth required)
 */
export async function GET() {
  // Dynamic import to avoid bundling issues
  const { PRODUCTS } = await import("@/app/top-100/data");

  return NextResponse.json({
    count: PRODUCTS.length,
    lastUpdated: "2026-Q1",
    products: PRODUCTS.map((p) => ({
      rank: p.rank,
      name: p.name,
      slug: p.slug,
      url: p.url,
      category: p.category,
      score: p.score,
      level: getLevel(p.score),
      verdict: p.verdict,
      delta: p.delta || null,
    })),
  });
}

