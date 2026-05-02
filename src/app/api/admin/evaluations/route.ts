import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";
import { listEvaluations, createEvaluation } from "@/lib/evaluation";
import type { EvaluationMode } from "@/lib/evaluation";
import { parseImageDataUrl } from "@/lib/scoring";

export async function GET() {
  const admin = await getAdminEmail();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const evaluations = await listEvaluations();
  return NextResponse.json({ evaluations });
}

export async function POST(req: NextRequest) {
  const admin = await getAdminEmail();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  let body: {
    clientName?: string;
    projectName?: string;
    auditorName?: string;
    mode?: EvaluationMode;
    images?: string[];
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.clientName?.trim()) {
    return NextResponse.json({ error: "clientName required" }, { status: 400 });
  }
  if (!body.projectName?.trim()) {
    return NextResponse.json({ error: "projectName required" }, { status: 400 });
  }
  if (!body.images?.length) {
    return NextResponse.json({ error: "At least one image required" }, { status: 400 });
  }
  if (body.mode !== "sample" && body.mode !== "audit") {
    return NextResponse.json({ error: "mode must be 'sample' or 'audit'" }, { status: 400 });
  }

  const screens = body.images.map((img) => {
    const parsed = parseImageDataUrl(img);
    if (!parsed) throw new Error("Invalid image data URL");
    return { imageData: img };
  });

  const evaluation = await createEvaluation({
    clientName: body.clientName.trim(),
    projectName: body.projectName.trim(),
    auditorName: body.auditorName?.trim(),
    mode: body.mode,
    screens,
  });

  return NextResponse.json({ evaluation }, { status: 201 });
}
