import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";
import { getEvaluation, updateEvaluation } from "@/lib/evaluation";
import type { EvaluationScreen, AnnotationFinding } from "@/lib/evaluation";
import { analyzeScreenForReport } from "@/lib/annotation-analysis";
import { parseImageDataUrl } from "@/lib/scoring";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdminEmail();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  const evaluation = await getEvaluation(id);
  if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { screenId?: string } = {};
  try {
    body = await req.json();
  } catch {}

  // Analyze either a single screen or all screens
  const screensToAnalyze = body.screenId
    ? evaluation.screens.filter((s) => s.id === body.screenId)
    : evaluation.screens;

  if (!screensToAnalyze.length) {
    return NextResponse.json({ error: "No matching screens" }, { status: 400 });
  }

  // Mark as analyzing
  await updateEvaluation(id, { status: "analyzing" });

  const updatedScreens: EvaluationScreen[] = [...evaluation.screens];

  for (const screen of screensToAnalyze) {
    const parsed = parseImageDataUrl(screen.imageData);
    if (!parsed) continue;

    const result = await analyzeScreenForReport(parsed, evaluation.mode);
    const idx = updatedScreens.findIndex((s) => s.id === screen.id);
    if (idx === -1) continue;

    if ("error" in result) {
      // Leave screen as-is, continue with others
      continue;
    }

    updatedScreens[idx] = {
      ...updatedScreens[idx],
      screenName: result.screenName,
      score: result.score,
      label: result.label,
      summary: result.summary,
      findings: result.findings.map((f) => ({
        id: f.id,
        title: f.title,
        issue: f.issue,
        fix: f.fix,
        severity: f.severity,
        xPercent: f.xPercent,
        yPercent: f.yPercent,
        category: f.category,
        humanNote: "",
      } satisfies AnnotationFinding)),
      analyzedAt: new Date().toISOString(),
    };
  }

  // Compute overall score as average of analyzed screens
  const scoredScreens = updatedScreens.filter((s) => s.score !== null);
  const overallScore =
    scoredScreens.length > 0
      ? Math.round((scoredScreens.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredScreens.length) * 10) / 10
      : null;

  const updated = await updateEvaluation(id, {
    screens: updatedScreens,
    overallScore,
    status: "review",
  });

  return NextResponse.json({ evaluation: updated });
}
