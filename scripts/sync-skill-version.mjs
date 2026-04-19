#!/usr/bin/env node
/**
 * Builds the versioned Ladder Skill zip from the skill/ directory.
 *
 *  1. Reads CURRENT_SKILL_VERSION from src/lib/skill-version.ts
 *  2. Writes that version into skill/VERSION (shipped inside the zip)
 *  3. Removes any stale ladder-skill*.zip from public/downloads/
 *  4. Creates public/downloads/ladder-skill-v{VERSION}.zip
 *
 * Runs as the prebuild step so the artifact is always in sync with the
 * web app's view of the current version.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

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
execSync("rm -f public/downloads/ladder-skill*.zip");
execSync(
  `cd skill && zip -rq ../${outFile} . -x '*.DS_Store' '*/__pycache__/*'`
);
console.log(`${outFile}`);
