import { NextRequest, NextResponse } from "next/server";
import {
  recordTokenCost,
  COST_CATEGORIES,
  type CostCategory,
} from "@/lib/token-cost";

/**
 * POST /api/plugin/record-cost — plugin-side COGS ingest (#406).
 *
 * The Figma plugin runs some Anthropic calls directly (Fix Accessibility, chat,
 * feedback) and lives on a SEPARATE Upstash instance from runladder, so it
 * can't write cost to runladder's KV directly. It POSTs here instead; we record
 * into runladder's canonical `usage:cost:*` hash so the admin Team Detail COGS
 * view sees plugin spend too. Service-token auth, mirroring /api/plugin/analyze.
 *
 * Body: { userId, category, model, usage: {input_tokens, output_tokens, ...} }
 */
export async function POST(req: NextRequest) {
  const serviceToken = req.headers.get("x-ladder-service-token") ?? "";
  const expected = process.env.LADDER_SERVICE_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Service not configured." }, { status: 503 });
  }
  if (!serviceToken || serviceToken !== expected) {
    return NextResponse.json({ error: "Invalid service token" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : null;
  const category = body.category as CostCategory;
  const model = typeof body.model === "string" ? body.model : "";
  const usage = body.usage;

  if (!userId || !COST_CATEGORIES.includes(category) || !model) {
    return NextResponse.json(
      { error: "Body must include userId, a known category, and model." },
      { status: 400 },
    );
  }

  await recordTokenCost({ userId, category, model, usage });
  return NextResponse.json({ ok: true });
}
