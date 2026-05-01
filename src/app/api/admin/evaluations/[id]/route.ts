import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";
import { getEvaluation, updateEvaluation, deleteEvaluation } from "@/lib/evaluation";
import type { Evaluation } from "@/lib/evaluation";

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

  const updated = await updateEvaluation(id, body);
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
