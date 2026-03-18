import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const LADDER_PROMPT = `You are the AI core of the Ladder scoring engine — the universal quality score for every experience.

You think like a principal product designer with 20 years of experience at companies like Apple, Airbnb, and Stripe. You evaluate UI screens with the precision of a design leader and the empathy of a real user.

THE LADDER FRAMEWORK — UX Quality Score (1.0 to 5.0):

Level 1 — FUNCTIONAL (1.00–1.99): User fights the product. Trial, error, frustration. Built for engineering, not humans.
Level 2 — USABLE (2.00–2.99): Tasks can be completed with effort. Basic structure exists. User tolerates it but would switch.
Level 3 — COMFORTABLE (3.00–3.99): No thinking required. Everything where expected. Friction removed. The modern minimum bar — must be earned.
Level 4 — DELIGHTFUL (4.00–4.99): Product anticipates needs. Right help at right moment. Users refer others.
Level 5 — MEANINGFUL (5.00): Irreplaceable. Changed how user thinks, works, lives. Can't imagine going back.

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
  "summary": "One honest sentence describing the user experience",
  "next": "One specific action to move to the next level",
  "findings": [
    {
      "title": "Short title max 6 words",
      "impact": "Issue from user perspective",
      "fix": "Specific fix with exact values",
      "category": "hierarchy|spacing|copy|a11y|navigation|visual"
    }
  ]
}

Return exactly 4 findings, ranked by impact. Write from the user's perspective, not the designer's.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;

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

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
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

    return NextResponse.json(result);
  } catch (err) {
    console.error("[LADDER:ERROR] Score endpoint:", err);
    return NextResponse.json(
      { error: "Scoring failed. Please try again." },
      { status: 500 }
    );
  }
}
