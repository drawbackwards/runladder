import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getScoreAnnotations,
  setScoreAnnotations,
} from "@/lib/score-annotations";
import type { AnnotationFinding } from "@/lib/evaluation";

/**
 * Score-level redline annotations.
 *
 *   GET /api/dashboard/scores/:id/annotations
 *     -> { findings: AnnotationFinding[], updatedAt: number | null }
 *
 *   PUT /api/dashboard/scores/:id/annotations  body: { findings }
 *     -> { ok: true, updatedAt: number }
 *
 * Auth: Clerk session. Each user's annotations live under their own
 * userId; cross-user access is impossible at the storage level.
 *
 * The client sends the entire findings array on every save (PUT, not
 * PATCH) and debounces. Trade simplicity for write amplification —
 * acceptable while annotation volume per score is small.
 */

function isAnnotationFinding(x: unknown): x is AnnotationFinding {
  if (!x || typeof x !== "object") return false;
  const f = x as Record<string, unknown>;
  return (
    typeof f.id === "string" &&
    typeof f.title === "string" &&
    typeof f.issue === "string" &&
    typeof f.fix === "string" &&
    typeof f.category === "string" &&
    typeof f.humanNote === "string" &&
    typeof f.xPercent === "number" &&
    typeof f.yPercent === "number" &&
    (f.severity === "high" || f.severity === "medium" || f.severity === "low")
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const annotations = await getScoreAnnotations(userId, id);
  return NextResponse.json({
    findings: annotations?.findings ?? [],
    updatedAt: annotations?.updatedAt ?? null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incoming =
    body && typeof body === "object" && "findings" in body
      ? (body as { findings: unknown }).findings
      : null;
  if (!Array.isArray(incoming)) {
    return NextResponse.json(
      { error: "findings must be an array" },
      { status: 400 },
    );
  }

  const findings = incoming.filter(isAnnotationFinding);
  const stored = await setScoreAnnotations(userId, id, findings);
  return NextResponse.json({ ok: true, updatedAt: stored.updatedAt });
}
