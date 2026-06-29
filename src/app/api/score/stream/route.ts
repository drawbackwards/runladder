import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { redis, lifetimeScansKey } from "@/lib/redis";
import {
  parseImageDataUrl,
  scoreImageStream,
} from "@/lib/scoring";
import { makeThumbnail } from "@/lib/thumbnail";
import {
  FREE_LIFETIME_LIMIT,
  PRO_MONTHLY_LIMIT,
  isPaidTier,
  monthlyHardCapForTier,
} from "@/lib/plans";
import { getMonthlyScans } from "@/lib/usage";
import { getUserTier } from "@/lib/tier";
import { canScorePrivately as tierCanScorePrivately } from "@/lib/score-scope";
import { persistScoreEntry, type ScoreEntryInput } from "@/lib/scores";
import { getOrgStyleGuide } from "@/lib/style-guide";
import {
  ANON_COOKIE,
  readAnonId,
  mintAnonId,
  clientIp,
  assertAnonAllowed,
  recordAnonScore,
} from "@/lib/anon-score";

export const maxDuration = 60;

const ANON_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Streaming variant of POST /api/score.
 *
 * Emits Server-Sent Events as the model generates the response so the
 * client can show the score number a couple seconds after submit
 * instead of waiting 12-18s for the full payload. Event shapes mirror
 * the ScoringStreamEvent union in src/lib/scoring.ts:
 *
 *   event: score        — {"value": 3.2}
 *   event: label        — {"value": "Comfortable"}
 *   event: screenName   — {"value": "Newsletter Signup"}
 *   event: complete     — {"value": <full ScoreResult>, "scoreId": "..."}
 *   event: error        — {"message": "..."}
 *
 * The non-streaming POST /api/score handler stays as the canonical
 * endpoint and the source of the contract; this is purely a UX layer.
 */
export async function POST(req: NextRequest) {
  /* ── Bot detection ── */
  const ua = req.headers.get("user-agent") || "";
  if (/curl|wget|python-requests|httpie|postman|scrapy|phantomjs/i.test(ua)) {
    return errorResponse("Automated requests are not allowed.", 403);
  }

  /* ── Auth / anonymous gate ── Mirror /api/score: signed-in users score
   * per their tier; signed-out visitors get ONE free score (#187),
   * cookie-capped with a per-IP daily backstop. */
  const { userId, orgId } = await auth();

  let anonId: string | null = null;
  let anonIsNew = false;
  let anonIp = "";
  if (!userId) {
    anonIp = clientIp(req);
    anonId = readAnonId(req);
    if (!anonId) {
      anonId = mintAnonId();
      anonIsNew = true;
    }
    const gate = await assertAnonAllowed(anonId, anonIp);
    if (!gate.allowed) {
      return errorResponse(
        `Sign up for free to get ${FREE_LIFETIME_LIMIT} Ladder scores.`,
        401,
        { signup: true },
      );
    }
  }

  /* ── Rate limiting (signed-in tiers; matches /api/score) ── */
  const tier = userId ? await getUserTier(userId) : null;
  if (userId && tier) {
    if (!isPaidTier(tier)) {
      const usedKey = lifetimeScansKey(userId);
      const used = (await redis.get<number>(usedKey)) ?? 0;
      if (used >= FREE_LIFETIME_LIMIT) {
        return errorResponse(
          `You've used all ${FREE_LIFETIME_LIMIT} free Ladder scores. Upgrade to Pro for ${PRO_MONTHLY_LIMIT.toLocaleString()} scores per month.`,
          429,
          { upgrade: true },
        );
      }
    } else {
      // Paid-tier hard ceiling at 2x the soft cap. Mirrors /api/score so
      // SSE and JSON paths give identical enforcement.
      const hardCap = monthlyHardCapForTier(tier);
      if (hardCap !== null) {
        const monthly = await getMonthlyScans(userId);
        if (monthly >= hardCap) {
          return errorResponse(
            `Monthly scoring paused — you're at ${monthly.toLocaleString()} scores, past 2x your tier's cap. Email hello@drawbackwards.com to lift the ceiling.`,
            429,
            { hardCapped: true, contact: "hello@drawbackwards.com" },
          );
        }
      }
    }
  }

  const body = await req.json();
  const {
    image,
    source,
    isPublic,
    sessionType: rawSessionType,
    // Ground-truth on-screen text (e.g. captured from a URL's DOM) for the
    // style-compliance pass. Absent for raw image uploads → best-effort.
    frameText,
  } = body;
  const sessionType: "design" | "evaluation" =
    rawSessionType === "evaluation" ? "evaluation" : "design";

  const parsed = parseImageDataUrl(image);
  if (!parsed) {
    return errorResponse("Invalid image format. Use a data URL (base64).", 400);
  }

  // Team style-guide compliance (advisory; never affects the score).
  const styleGuide = orgId ? await getOrgStyleGuide(orgId) : null;

  /* ── Stream! ── */
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        for await (const ev of scoreImageStream(parsed, {
          styleRuleset: styleGuide?.ruleset,
          styleTeamName: styleGuide?.teamName,
          styleFrameText: frameText,
        })) {
          if (ev.kind === "error") {
            send("error", { message: ev.value, status: ev.status });
            controller.close();
            return;
          }
          if (ev.kind === "score") send("score", { value: ev.value });
          if (ev.kind === "label") send("label", { value: ev.value });
          if (ev.kind === "screenName") send("screenName", { value: ev.value });
          if (ev.kind === "complete") {
            const result = ev.value;
            // Persist + count usage now that we have the full result.
            // Signed-in → save to the user's history; anonymous → stash
            // for claim-on-signup and bump the anon counters (#187).
            let persistedScoreId: string | null = null;
            try {
              const thumbnail = await makeThumbnail(
                Buffer.from(parsed.base64Data, "base64"),
                parsed.mediaType,
              );
              const scoreId = `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`;
              const entry: ScoreEntryInput = {
                id: scoreId,
                score: result.score,
                label: result.label,
                screenName: result.screenName || source || "upload",
                summary: result.summary,
                next: result.next,
                findings: result.findings,
                rungs: result.rungs,
                styleGuide: result.styleGuide,
                source: source || "upload",
                thumbnail,
                // Anonymous scores are always private. Free signed-in users
                // can't score privately (paid feature, #290), so their scores
                // are forced public regardless of the posted flag; paid tiers
                // are honored.
                isPublic: userId
                  ? tierCanScorePrivately(tier)
                    ? !!isPublic
                    : true
                  : false,
                timestamp: Date.now(),
                sessionType,
              };
              if (userId) {
                await persistScoreEntry(userId, entry);
              } else if (anonId) {
                await recordAnonScore(anonId, anonIp, entry);
              }
              persistedScoreId = scoreId;
            } catch (e) {
              console.error(
                "[LADDER:ERROR] Stream persist failed:",
                (e as Error).message,
              );
              // Don't abort the stream — surface the result anyway.
            }

            send("complete", {
              value: {
                ...result,
                screenName: result.screenName || source || "Screen",
                // Only signed-in scores have a dashboard detail page; anon
                // scores are claimed by cookie after sign-up, so no id here.
                scoreId: userId ? persistedScoreId : null,
              },
            });
            controller.close();
            return;
          }
        }
        // Generator exhausted without complete (shouldn't happen)
        send("error", { message: "Scoring ended without result", status: 500 });
        controller.close();
      } catch (e) {
        console.error(
          "[LADDER:ERROR] Stream handler crashed:",
          (e as Error).message,
        );
        send("error", {
          message: "Scoring failed. Please try again.",
          status: 500,
        });
        controller.close();
      }
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
  // Set the anon-id cookie on a newly-minted anonymous visitor so the next
  // request is recognized (drives the per-browser cap + claim-on-signup).
  if (anonId && anonIsNew) {
    headers["Set-Cookie"] =
      `${ANON_COOKIE}=${anonId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ANON_COOKIE_MAX_AGE}`;
  }

  return new Response(stream, { headers });
}

function errorResponse(
  message: string,
  status: number,
  extra: Record<string, unknown> = {},
) {
  return new Response(JSON.stringify({ error: message, ...extra }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
