import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".data");
const VOTES_FILE = join(DATA_DIR, "votes.json");

type VoteData = Record<string, { total: number; count: number }>;

async function getVotes(): Promise<VoteData> {
  try {
    const raw = await readFile(VOTES_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveVotes(votes: VoteData): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(VOTES_FILE, JSON.stringify(votes, null, 2));
}

// GET /api/vote?slug=linear
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const votes = await getVotes();
  const data = votes[slug];

  if (!data || data.count === 0) {
    return NextResponse.json({ average: null, count: 0 });
  }

  return NextResponse.json({
    average: Math.round((data.total / data.count) * 10) / 10,
    count: data.count,
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

  const votes = await getVotes();
  if (!votes[slug]) {
    votes[slug] = { total: 0, count: 0 };
  }
  votes[slug].total += rounded;
  votes[slug].count += 1;

  await saveVotes(votes);

  return NextResponse.json({
    average: Math.round((votes[slug].total / votes[slug].count) * 10) / 10,
    count: votes[slug].count,
  });
}
