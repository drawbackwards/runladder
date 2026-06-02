import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const file = readFileSync(resolve("public/downloads/SKILL.md"), "utf8");
  return new NextResponse(file, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="SKILL.md"',
    },
  });
}
