#!/usr/bin/env node
/**
 * Builds the versioned Ladder Skill zip from the skill/ directory.
 *
 *  1. Reads CURRENT_SKILL_VERSION from src/lib/skill-version.ts
 *  2. Writes that version into skill/VERSION (shipped inside the zip)
 *  3. Stages the bundle under a top-level `ladder-quality-score/` folder
 *     so `unzip -d ~/.claude/skills/` expands to the right target path
 *     for Claude Code installs
 *  4. Removes any stale ladder-skill*.zip from public/downloads/
 *  5. Creates public/downloads/ladder-skill-v{VERSION}.zip
 *
 * Runs as the prebuild step so the artifact is always in sync with the
 * web app's view of the current version.
 */
import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SKILL_DIR_NAME = "ladder-quality-score";

const source = readFileSync("src/lib/skill-version.ts", "utf8");
const match = source.match(/CURRENT_SKILL_VERSION\s*=\s*"([^"]+)"/);
if (!match) {
  console.error("Could not parse CURRENT_SKILL_VERSION from src/lib/skill-version.ts");
  process.exit(1);
}
const version = match[1];

writeFileSync("skill/VERSION", version + "\n");
console.log(`skill/VERSION → ${version}`);

const outFile = `public/downloads/ladder-skill-v${version}.zip`;
const outAbs = resolve(outFile);

execSync("rm -f public/downloads/ladder-skill*.zip");

const stage = mkdtempSync(join(tmpdir(), "ladder-skill-"));
try {
  cpSync("skill", join(stage, SKILL_DIR_NAME), { recursive: true });
  execSync(
    `find ${JSON.stringify(stage)} \\( -name '__pycache__' -type d -o -name '.DS_Store' \\) -exec rm -rf {} + 2>/dev/null || true`
  );
  execSync(
    `cd ${JSON.stringify(stage)} && zip -rq ${JSON.stringify(outAbs)} ${SKILL_DIR_NAME}`
  );
} finally {
  rmSync(stage, { recursive: true, force: true });
}

console.log(`${outFile}`);
