import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";
import { getEvaluation, updateEvaluation, deleteEvaluation } from "@/lib/evaluation";
import type { Evaluation, EvaluationScreen } from "@/lib/evaluation";
import { appendLearningEvents } from "@/lib/evaluation-learning";
import type { LearningEvent } from "@/lib/evaluation-learning";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminEmail();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const evaluation = await getEvaluation(id);
  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ evaluation });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminEmail();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  let body: Partial<Omit<Evaluation, "id" | "createdAt">> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Diff findings before saving to capture learning signals
  const existing = await getEvaluation(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const learningEvents: LearningEvent[] = [];
  const now = Date.now();

  if (body.screens) {
    for (const incoming of body.screens as EvaluationScreen[]) {
      const prior = existing.screens.find((s) => s.id === incoming.id);
      if (!prior) continue;

      for (const incomingFinding of incoming.findings) {
        const priorFinding = prior.findings.find((f) => f.id === incomingFinding.id);
        if (!priorFinding) continue;

        // Pin position correction
        const dX = Math.abs(incomingFinding.xPercent - priorFinding.xPercent);
        const dY = Math.abs(incomingFinding.yPercent - priorFinding.yPercent);
        if (dX > 0.005 || dY > 0.005) {
          learningEvents.push({
            type: "pin_moved",
            ts: now,
            evaluationId: id,
            screenId: incoming.id,
            findingId: incomingFinding.id,
            title: incomingFinding.title,
            category: incomingFinding.category,
            severity: incomingFinding.severity,
            origX: priorFinding.xPercent,
            origY: priorFinding.yPercent,
            corrX: incomingFinding.xPercent,
            corrY: incomingFinding.yPercent,
          });
        }

        // Text field edits
        for (const field of ["issue", "fix"] as const) {
          const before = priorFinding[field] ?? "";
          const after = incomingFinding[field] ?? "";
          if (after !== before && after.length >= 15) {
            learningEvents.push({
              type: "insight_edited",
              ts: now,
              evaluationId: id,
              screenId: incoming.id,
              findingId: incomingFinding.id,
              title: incomingFinding.title,
              category: incomingFinding.category,
              severity: incomingFinding.severity,
              field,
              before,
              after,
            });
          }
        }
      }
    }
  }

  const [updated] = await Promise.all([
    updateEvaluation(id, body),
    learningEvents.length ? appendLearningEvents(learningEvents) : Promise.resolve(),
  ]);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ evaluation: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminEmail();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const existing = await getEvaluation(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteEvaluation(id);
  return NextResponse.json({ ok: true });
}
