#!/usr/bin/env node
/**
 * Publishes the Ladder Skill to public/downloads/.
 *
 * 1. Reads CURRENT_SKILL_VERSION from src/lib/skill-version.ts
 * 2. Writes that version into skill/VERSION
 * 3. Builds a versioned zip at public/downloads/ladder-skill-v{version}.zip
 * 4. Copies skill/SKILL.md to public/downloads/SKILL.md
 *
 * Runs as the prebuild step so the artifacts are always in sync with the
 * web app's view of the current version.
 */
import { readFileSync, writeFileSync, copyFileSync, rmSync, readdirSync, mkdtempSync, cpSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

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

// Build the versioned zip
const tmpDir = mkdtempSync(resolve(tmpdir(), "ladder-skill-"));
cpSync(resolve("skill"), resolve(tmpDir, "ladder-quality-score"), { recursive: true });
const zipName = `ladder-skill-v${version}.zip`;
const zipDest = resolve(downloadsDir, zipName);
execSync(`zip -r "${zipDest}" ladder-quality-score`, { cwd: tmpDir, stdio: "inherit" });
rmSync(tmpDir, { recursive: true, force: true });
console.log(`public/downloads/${zipName}`);

// Publish the raw SKILL.md
copyFileSync(resolve("skill/SKILL.md"), resolve("public/downloads/SKILL.md"));
console.log(`public/downloads/SKILL.md`);
