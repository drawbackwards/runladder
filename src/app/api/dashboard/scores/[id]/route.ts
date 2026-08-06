import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { zrangeAllChunked } from "@/lib/redis";
import { resolveScoreOwner } from "@/lib/score-access";
import { withThumbnailUrl } from "@/lib/scores";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, orgId, orgRole } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // A Team Lead can open a score belonging to a member of their team from the
  // designer detail page (#300), via `?member=<userId>`. Shared resolver keeps
  // this identical to the thumbnail route's access rules.
  const owner = await resolveScoreOwner(req, { userId, orgId, orgRole });
  if (!owner.ok) {
    return NextResponse.json({ error: owner.error }, { status: owner.status });
  }

  const scores = await zrangeAllChunked(`user:${owner.ownerId}:scores`, {
    rev: true,
  });

  for (const entry of scores as string[]) {
    try {
      const parsed = typeof entry === "string" ? JSON.parse(entry) : entry;
      if (parsed.id !== id) continue;
      // Soft-deleted scores are invisible to the owner, but a Team Lead keeps
      // the audit trail (mirrors the member-detail endpoint), so they may open
      // a deleted score's detail.
      if (parsed.deletedAt && !owner.isTeamLeadView) {
        return NextResponse.json({ error: "Score not found" }, { status: 404 });
      }
      // Externalized thumbnail (#442) → proxy URL, preserving the member param
      // for Team-Lead views so the image request authorizes the same way.
      return NextResponse.json(
        withThumbnailUrl(parsed, owner.isTeamLeadView ? owner.ownerId : null),
      );
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "Score not found" }, { status: 404 });
}
