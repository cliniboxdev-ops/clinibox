import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

/**
 * Offline verification: opens data/protocols.db with no network access,
 * prints the inventory, a sample triage protocol with its vital triggers,
 * and runs full-text searches the way the offline chat will.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const db = new DatabaseSync(resolve(root, "data", "protocols.db"), { readOnly: true });

console.log("=== Inventory ===");
const rows = db
  .prepare("SELECT id, category, lang, title FROM protocols ORDER BY category, id")
  .all() as { id: string; category: string; lang: string; title: string }[];
for (const r of rows) console.log(`  [${r.category}/${r.lang}] ${r.id} — ${r.title}`);

console.log("\n=== Sample: START adult triage with vital triggers ===");
const start = db
  .prepare("SELECT title, triggers_json, steps_json FROM protocols WHERE id = ?")
  .get("seed-start-adult") as
  | { title: string; triggers_json: string; steps_json: string }
  | undefined;
if (!start) throw new Error("seed-start-adult missing from DB");
console.log(start.title);
for (const t of JSON.parse(start.triggers_json) as { description: string }[]) {
  console.log(`  trigger: ${t.description}`);
}
const algorithm = (
  JSON.parse(start.steps_json) as { heading: string; steps: string[] }[]
).find((s) => s.heading === "Algorithm");
for (const step of algorithm?.steps ?? []) console.log(`  ${step}`);

console.log("\n=== FTS queries (offline retrieval) ===");
const search = db.prepare(
  `SELECT protocol_id, heading, snippet(chunks_fts, 3, '[', ']', '…', 12) AS snip
   FROM chunks_fts WHERE chunks_fts MATCH ? ORDER BY rank LIMIT 3`,
);
for (const q of ["tourniquet", "capillary refill", "epinephrine"]) {
  console.log(`query: "${q}"`);
  const hits = search.all(q) as { protocol_id: string; heading: string; snip: string }[];
  if (hits.length === 0) console.log("  (no hits)");
  for (const h of hits) console.log(`  ${h.protocol_id} :: ${h.heading} :: ${h.snip}`);
}

db.close();
console.log("\nOffline verification OK");
