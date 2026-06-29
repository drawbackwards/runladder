import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { redis } from "@/lib/redis";
import { parseImageDataUrl } from "@/lib/scoring";
import { makeThumbnail } from "@/lib/thumbnail";
import { persistScoreEntry, type ScoreEntryInput } from "@/lib/scores";
import {
  getOrgStyleGuide,
  analyzeStyleCompliance,
  hasFrameText,
  type StyleGuideResult,
  type FrameText,
} from "@/lib/style-guide";
import { CURRENT_API_VERSION } from "@/lib/app-version";

// Persisting a plugin score now runs the same style-compliance pass the web
// score route does (an extra Sonnet call), so give it room past the default.
export const maxDuration = 60;

const API_VERSION_HEADERS = { "X-Ladder-API-Version": CURRENT_API_VERSION };

type ScoreEntry = ScoreEntryInput;

/**
 * Persist a Ladder score to a user's runladder.com history.
 * Called server-to-server by ai-design-assistant after a Figma plugin scan,
 * so Figma scores show up alongside web/Skill scores in the user's dashboard.
 *
 * Auth model: shared service secret (X-Ladder-Service-Token header).
 *
 * Body: { userId: string, score: ScoreEntry }
 * Returns: { ok: true }
 */
export async function POST(req: NextRequest) {
  const serviceToken = req.headers.get("x-ladder-service-token") ?? "";
  const expected = process.env.LADDER_SERVICE_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Service not configured." },
      { status: 503, headers: API_VERSION_HEADERS },
    );
  }
  if (serviceToken !== expected) {
    return NextResponse.json(
      { error: "Invalid service token" },
      { status: 401, headers: API_VERSION_HEADERS },
    );
  }

  try {
    const body = (await req.json()) as {
      userId?: string;
      score?: ScoreEntry;
      image?: string;
      frameText?: FrameText;
    };
    const { userId, score, image, frameText } = body;

    if (!userId || !score?.id || typeof score.score !== "number") {
      return NextResponse.json(
        { error: "Body must include userId and a valid score entry." },
        { status: 400, headers: API_VERSION_HEADERS },
      );
    }

    const parsed = image ? parseImageDataUrl(image) : null;

    /* ── Optional thumbnail: caller passes the raw image data URL, we resize ── */
    let thumbnail: string | undefined = score.thumbnail;
    let thumbnailDiag = "preset-or-none";
    if (!thumbnail && image) {
      if (!parsed) {
        thumbnailDiag = "image-not-parseable";
      } else {
        thumbnailDiag = "parsed";
        thumbnail = await makeThumbnail(
          Buffer.from(parsed.base64Data, "base64"),
          parsed.mediaType,
        );
        thumbnailDiag = thumbnail
          ? "generated"
          : "makeThumbnail-returned-undefined";
      }
    } else if (thumbnail) {
      thumbnailDiag = "preset";
    } else {
      thumbnailDiag = "no-image-no-thumbnail";
    }

    /* ── Team style-guide compliance ──────────────────────────────────────
     * The plugin's "improve" (scoring) action never runs the style pass, so
     * plugin-originated entries used to reach the dashboard with no Style
     * Guide section at all (#363). Run the SAME pass the web score route uses
     * here, on the same image, resolving the user's org → ruleset exactly as
     * verify-token does — so plugin and web dashboard views are consistent.
     *
     * Advisory only: it NEVER affects the numeric score, and a failure becomes
     * an "unavailable" status (or no section when the team has no guide). The
     * whole block is best-effort and never fails the persist. We skip it if the
     * caller already attached a styleGuide, so we don't double-spend the call. */
    let styleGuide: StyleGuideResult | undefined = score.styleGuide as
      | StyleGuideResult
      | undefined;
    let styleDiag = styleGuide ? "preset" : "skipped";
    if (!styleGuide && (parsed || hasFrameText(frameText))) {
      try {
        const clerk = await clerkClient();
        const memberships = await clerk.users.getOrganizationMembershipList({
          userId,
        });
        const orgId = memberships.data[0]?.organization?.id ?? null;
        const orgGuide = orgId ? await getOrgStyleGuide(orgId) : null;
        if (orgGuide) {
          try {
            // Prefer the plugin's ground-truth frame text; the screenshot is a
            // best-effort fallback. Same engine + same text as the in-canvas
            // Improve Copy, so the dashboard card agrees with it (#362/#363).
            const outcome = await analyzeStyleCompliance(
              {
                image: parsed
                  ? { mediaType: parsed.mediaType, base64Data: parsed.base64Data }
                  : null,
                frameText,
              },
              orgGuide.ruleset,
            );
            styleGuide = {
              status: outcome.findings.length > 0 ? "issues" : "compliant",
              teamName: orgGuide.teamName,
              findings: outcome.findings,
              textSource: outcome.textSource,
            };
            styleDiag = `computed-${styleGuide.status}-${outcome.textSource}`;
          } catch (e) {
            console.warn("[LADDER:WARN] plugin style-guide pass failed:", e);
            styleGuide = {
              status: "unavailable",
              teamName: orgGuide.teamName,
              findings: [],
              textSource: hasFrameText(frameText) ? "exact" : "inferred",
            };
            styleDiag = "unavailable";
          }
        } else {
          styleDiag = "no-org-guide";
        }
      } catch (e) {
        // Org/ruleset lookup failed — leave styleGuide unset (no section),
        // never block the persist.
        console.warn("[LADDER:WARN] plugin style-guide lookup failed:", e);
        styleDiag = "lookup-failed";
      }
    }

    const stored = await persistScoreEntry(userId, {
      id: score.id,
      score: score.score,
      label: score.label,
      screenName: score.screenName,
      summary: score.summary,
      next: score.next,
      findings: score.findings,
      rungs: score.rungs,
      styleGuide,
      source: score.source || "figma",
      thumbnail,
      isPublic: !!score.isPublic,
      timestamp: score.timestamp || Date.now(),
      // Figma plugin scores are always design sessions — the user is
      // scoring their own canvas, not auditing someone else's UI.
      sessionType: "design",
    });

    // Diagnostic log: keep the last 50 persist attempts for 24h so we can
    // verify cross-repo calls land without trawling Vercel logs by hand.
    try {
      await redis.lpush(
        "debug:plugin-persist-log",
        JSON.stringify({
          ts: Date.now(),
          userId,
          scoreId: stored.id,
          score: stored.score,
          uplift: stored.uplift,
          previousScore: stored.previousScore,
          screenName: stored.screenName,
          source: stored.source,
          imageBytes: image ? image.length : 0,
          thumbnail: thumbnailDiag,
          thumbnailLength: thumbnail ? thumbnail.length : 0,
          styleGuide: styleDiag,
          ok: true,
        }),
      );
      await redis.ltrim("debug:plugin-persist-log", 0, 49);
      await redis.expire("debug:plugin-persist-log", 60 * 60 * 24);
    } catch {
      // Logging is best-effort.
    }

    return NextResponse.json(
      { ok: true },
      { headers: API_VERSION_HEADERS },
    );
  } catch (err) {
    console.error("[LADDER:ERROR] Plugin persist-score:", err);
    return NextResponse.json(
      { error: "Persist failed." },
      { status: 500, headers: API_VERSION_HEADERS },
    );
  }
}
