import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TRIAGE_SEEDS } from "./seeds/triage.ts";

/** Writes the deterministic triage seed protocols into /data as JSON. */

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../data");
mkdirSync(outDir, { recursive: true });

for (const doc of TRIAGE_SEEDS) {
  const file = resolve(outDir, `${doc.id}.json`);
  writeFileSync(file, JSON.stringify(doc, null, 2), "utf8");
  console.log(`seeded ${doc.id} (${doc.triggers?.length ?? 0} triggers)`);
}
console.log(`Done -> ${outDir}`);
