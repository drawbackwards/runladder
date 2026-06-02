#!/usr/bin/env node
/**
 * Publishes the Ladder Skill SKILL.md to public/downloads/SKILL.md.
 *
 * 1. Reads CURRENT_SKILL_VERSION from src/lib/skill-version.ts
 * 2. Writes that version into skill/VERSION
 * 3. Copies skill/SKILL.md to public/downloads/SKILL.md
 *
 * Runs as the prebuild step so the artifact is always in sync with the
 * web app's view of the current version.
 */
import { readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync("src/lib/skill-version.ts", "utf8");
const match = source.match(/CURRENT_SKILL_VERSION\s*=\s*"([^"]+)"/);
if (!match) {
  console.error("Could not parse CURRENT_SKILL_VERSION from src/lib/skill-version.ts");
  process.exit(1);
}
const version = match[1];

writeFileSync("skill/VERSION", version + "\n");
console.log(`skill/VERSION → ${version}`);

// Remove any stale zip files from previous builds
const downloadsDir = resolve("public/downloads");
for (const f of readdirSync(downloadsDir)) {
  if (f.endsWith(".zip")) {
    rmSync(resolve(downloadsDir, f));
    console.log(`Removed ${f}`);
  }
}

// Publish the raw SKILL.md as the sole download artifact
copyFileSync(resolve("skill/SKILL.md"), resolve("public/downloads/SKILL.md"));
console.log(`public/downloads/SKILL.md`);
