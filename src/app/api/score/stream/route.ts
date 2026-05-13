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
  ANON_LIMIT,
  PRO_MONTHLY_LIMIT,
  isPaidTier,
  monthlyHardCapForTier,
} from "@/lib/plans";
import { getMonthlyScans } from "@/lib/usage";
import { getUserTier } from "@/lib/tier";
import { persistScoreEntry } from "@/lib/scores";

export const maxDuration = 60;

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

  /* ── Auth ── */
  const { userId } = await auth();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  /* ── Rate limiting (matches /api/score) ── */
  if (userId) {
    const tier = await getUserTier(userId);
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
      // Paid-tier hard ceiling at 2x the soft cap. See /api/score for
      // the rationale — keep both endpoints in lockstep so the user
      // gets identical enforcement whether they're using the SSE
      // stream or the JSON endpoint.
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
  } else {
    const anonKey = `rate:anon:${ip}`;
    const count = (await redis.get<number>(anonKey)) ?? 0;
    if (count >= ANON_LIMIT) {
      return errorResponse(
        `Sign up for free to get ${FREE_LIFETIME_LIMIT} Ladder scores.`,
        429,
        { signup: true },
      );
    }
  }

  const body = await req.json();
  const {
    image,
    source,
    isPublic,
    sessionType: rawSessionType,
  } = body;
  const sessionType: "design" | "evaluation" =
    rawSessionType === "evaluation" ? "evaluation" : "design";

  const parsed = parseImageDataUrl(image);
  if (!parsed) {
    return errorResponse("Invalid image format. Use a data URL (base64).", 400);
  }

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
        for await (const ev of scoreImageStream(parsed)) {
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
            let persistedScoreId: string | null = null;
            try {
              if (userId) {
                const thumbnail = await makeThumbnail(
                  Buffer.from(parsed.base64Data, "base64"),
                  parsed.mediaType,
                );
                const scoreId = `${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 8)}`;
                await persistScoreEntry(userId, {
                  id: scoreId,
                  score: result.score,
                  label: result.label,
                  screenName: result.screenName || source || "upload",
                  summary: result.summary,
                  next: result.next,
                  findings: result.findings,
                  rungs: result.rungs,
                  source: source || "upload",
                  thumbnail,
                  isPublic: !!isPublic,
                  timestamp: Date.now(),
                  sessionType,
                });
                persistedScoreId = scoreId;
              } else {
                const anonKey = `rate:anon:${ip}`;
                await redis.incr(anonKey);
                const ttl = await redis.ttl(anonKey);
                if (ttl < 0) await redis.expire(anonKey, 60 * 60 * 24);
              }
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
                scoreId: persistedScoreId,
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

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
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
