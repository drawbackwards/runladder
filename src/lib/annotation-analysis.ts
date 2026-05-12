/**
 * Annotation analysis — PROTECTED IP.
 *
 * Generates Ladder-scored findings with precise screen coordinates for
 * the Drawbackwards evaluation report tool. Separate from the main
 * scoring engine so the report pipeline can iterate independently.
 *
 * MUST stay server-side. Never import from client components.
 * Never log prompt text or echo findings in error messages.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { MediaType } from "./scoring";
import { getLearningContext } from "./evaluation-learning";
import type { LearningContext } from "./evaluation-learning";

export type AnnotationResult = {
  screenName: string;
  score: number;
  label: string;
  summary: string;
  findings: Array<{
    id: string;
    title: string;
    issue: string;
    fix: string;
    severity: "high" | "medium" | "low";
    xPercent: number;
    yPercent: number;
    category: string;
  }>;
};

const SAMPLE_FINDING_COUNT = "3 to 5";
const AUDIT_FINDING_COUNT = "4 to 8";

function buildAnalysisPrompt(mode: "sample" | "audit", ctx?: LearningContext): string {
  const count = mode === "sample" ? SAMPLE_FINDING_COUNT : AUDIT_FINDING_COUNT;

  let calibrationSection = "";
  if (ctx && ctx.pinCalibration.length > 0) {
    const hints = ctx.pinCalibration
      .map(
        (c) =>
          `  - ${c.category}: shift x by ${c.avgDeltaX > 0 ? "+" : ""}${c.avgDeltaX.toFixed(3)}, y by ${c.avgDeltaY > 0 ? "+" : ""}${c.avgDeltaY.toFixed(3)} (from ${c.count} corrections)`,
      )
      .join("\n");
    calibrationSection = `\n\nCoordinate calibration (apply these learned offsets to xPercent/yPercent for these categories):\n${hints}`;
  }

  let exemplarsSection = "";
  if (ctx && ctx.exemplaryFindings.length > 0) {
    const examples = ctx.exemplaryFindings
      .map(
        (f) =>
          `  - [${f.category}/${f.severity}] "${f.title}"\n    issue: "${f.issue}"${f.fix ? `\n    fix: "${f.fix}"` : ""}`,
      )
      .join("\n");
    exemplarsSection = `\n\nHuman-validated finding examples (match this quality of specificity and directness):\n${examples}`;
  }

  return `You are a principal product designer with 20 years of experience at companies like Apple, Airbnb, and Stripe. You are conducting a Drawbackwards design audit.

Evaluate this UI screen and identify the ${count} most important UX issues. For each finding, pinpoint the exact location of the problem on screen using x/y percentages (0.0 = left/top edge, 1.0 = right/bottom edge). Point to the specific UI element causing the issue — a button, text field, icon, heading — not a general region.

Score against the Ladder framework:
- Functional (1.0–1.99): User fights the product
- Usable (2.0–2.99): Tasks complete with effort
- Comfortable (3.0–3.99): No thinking required
- Delightful (4.0–4.99): Anticipates needs
- Meaningful (5.0): Irreplaceable

Return ONLY valid JSON, no markdown:
{
  "screenName": "Product — Screen Type",
  "score": 2.4,
  "label": "Usable",
  "summary": "One honest sentence describing the user experience from the user's perspective",
  "findings": [
    {
      "id": "f1",
      "title": "Short title, max 5 words",
      "issue": "The specific problem this creates for the user",
      "fix": "Concrete, actionable fix with specific guidance",
      "severity": "high",
      "xPercent": 0.45,
      "yPercent": 0.23,
      "category": "hierarchy"
    }
  ]
}

Rules:
- xPercent and yPercent point to the CENTER of the problematic element
- severity: high = blocks task or causes abandonment, medium = causes confusion or extra steps, low = polish opportunity
- category must be one of: hierarchy, spacing, copy, a11y, navigation, visual, interaction, feedback
- Order findings by severity (high first), then by uplift potential
- screenName format: "Product Name — Screen Type" using an em dash
- Be direct and specific — vague findings are worthless${calibrationSection}${exemplarsSection}`;
}

const client = new Anthropic();

export async function analyzeScreenForReport(
  { mediaType, base64Data }: { mediaType: MediaType; base64Data: string },
  mode: "sample" | "audit" = "sample",
): Promise<AnnotationResult | { error: string }> {
  if (base64Data.length > 7_000_000) {
    return { error: "Image too large. Please use an image under 5MB." };
  }

  // Load accumulated human corrections to calibrate coordinate estimates and set quality bar
  let learningCtx: LearningContext | undefined;
  try {
    learningCtx = await getLearningContext();
  } catch {
    // Non-fatal — proceed with base prompt if learning context unavailable
  }

  try {
    // Sonnet 4.6 with adaptive thinking + effort:high. Annotation
    // analysis pins findings to specific regions of the screen, which
    // needs careful visual reasoning — exactly the kind of work
    // adaptive thinking is designed for. max_tokens bumped to give
    // the thinking budget room ahead of the JSON output.
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      system: buildAnalysisPrompt(mode, learningCtx),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Data },
            },
            {
              type: "text",
              text: "Analyze this screen. Be honest and specific.",
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "No response from analysis engine" };
    }

    const clean = textBlock.text.replace(/```json|```/g, "").trim();
    let result: AnnotationResult;
    try {
      result = JSON.parse(clean);
    } catch {
      return { error: "Failed to parse analysis response" };
    }

    if (!result.screenName || typeof result.score !== "number" || !Array.isArray(result.findings)) {
      return { error: "Invalid analysis response shape" };
    }

    // Clamp coordinates to valid range and ensure IDs
    result.findings = result.findings.map((f, i) => ({
      ...f,
      id: f.id || `f${i + 1}`,
      xPercent: Math.max(0, Math.min(1, f.xPercent ?? 0.5)),
      yPercent: Math.max(0, Math.min(1, f.yPercent ?? 0.5)),
    }));

    return result;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[ANNOTATION:ERROR]", msg);
    return { error: "Analysis failed" };
  }
}
