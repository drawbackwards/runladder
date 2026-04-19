#!/usr/bin/env node
/**
 * Syncs skill/VERSION with the CURRENT_SKILL_VERSION constant exported by
 * src/lib/skill-version.ts. Runs as part of build:skill so the VERSION file
 * shipped inside ladder-skill.zip always matches the web app's view of what
 * the current version is.
 */
import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync("src/lib/skill-version.ts", "utf8");
const match = source.match(/CURRENT_SKILL_VERSION\s*=\s*"([^"]+)"/);
if (!match) {
  console.error("Could not parse CURRENT_SKILL_VERSION from src/lib/skill-version.ts");
  process.exit(1);
}

writeFileSync("skill/VERSION", match[1] + "\n");
console.log(`skill/VERSION → ${match[1]}`);
