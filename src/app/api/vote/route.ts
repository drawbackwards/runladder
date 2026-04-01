import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";

// GET /api/vote?slug=linear
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const [total, count] = await Promise.all([
    redis.hget<number>(`votes:${slug}`, "total"),
    redis.hget<number>(`votes:${slug}`, "count"),
  ]);

  if (!count) {
    return NextResponse.json({ average: null, count: 0 });
  }

  return NextResponse.json({
    average: Math.round(((total ?? 0) / count) * 10) / 10,
    count,
  });
}

// POST /api/vote { slug, score }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, score } = body;

  if (!slug || typeof score !== "number" || score < 1 || score > 5) {
    return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
  }

  // Round to nearest 0.5
  const rounded = Math.round(score * 2) / 2;
  const key = `votes:${slug}`;

  await Promise.all([
    redis.hincrbyfloat(key, "total", rounded),
    redis.hincrby(key, "count", 1),
  ]);

  const [total, count] = await Promise.all([
    redis.hget<number>(key, "total"),
    redis.hget<number>(key, "count"),
  ]);

  return NextResponse.json({
    average: Math.round(((total ?? 0) / (count ?? 1)) * 10) / 10,
    count: count ?? 1,
  });
}
