import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import type { ProtocolDocument } from "@clinibox/shared";

/**
 * Builds the offline knowledge index from every /data/*.json protocol:
 *  - data/protocols.db  — SQLite with an FTS5 full-text index over
 *    per-section chunks (the retrieval layer for the offline chat)
 *  - knowledge_base/    — one clean markdown file per protocol with
 *    license/source front matter (human-readable, diffable)
 *
 * Rebuildable at any time: pnpm --filter @clinibox/ingest build-db
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const dataDir = resolve(root, "data");
const kbDir = resolve(root, "knowledge_base");
const dbFile = resolve(dataDir, "protocols.db");

const docs: ProtocolDocument[] = readdirSync(dataDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(readFileSync(resolve(dataDir, f), "utf8")) as ProtocolDocument);

if (docs.length === 0) {
  console.error("No protocol JSON files in /data — run the connectors first.");
  process.exit(1);
}

function toMarkdown(doc: ProtocolDocument): string {
  const lines: string[] = [
    "---",
    `id: ${doc.id}`,
    `title: "${doc.title}"`,
    `lang: ${doc.lang}`,
    `category: ${doc.category}`,
    `source: "${doc.source.name}"`,
    `source_url: ${doc.source.url}`,
    `license: "${doc.source.license}"`,
    "---",
    "",
    `# ${doc.title}`,
    "",
  ];
  for (const s of doc.sections) {
    lines.push(`${"#".repeat(Math.min(s.level + 1, 6))} ${s.heading}`, "");
    for (const p of s.paragraphs) lines.push(p, "");
    for (const step of s.steps) lines.push(`- ${step}`);
    if (s.steps.length) lines.push("");
  }
  if (doc.contraindications?.length) {
    lines.push("## Contraindications / cautions", "");
    for (const c of doc.contraindications) lines.push(`- ${c}`);
    lines.push("");
  }
  lines.push(`> Source: ${doc.source.name} — ${doc.source.url} (${doc.source.license})`, "");
  return lines.join("\n");
}

rmSync(dbFile, { force: true });
const db = new DatabaseSync(dbFile);

db.exec(`
  CREATE TABLE protocols (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    lang TEXT NOT NULL,
    severity_tier INTEGER,
    triggers_json TEXT NOT NULL,
    steps_json TEXT NOT NULL,
    contraindications_json TEXT NOT NULL,
    full_markdown TEXT NOT NULL,
    source_json TEXT NOT NULL
  );
  CREATE VIRTUAL TABLE chunks_fts USING fts5(
    protocol_id UNINDEXED,
    title,
    heading,
    content
  );
`);

const insertProtocol = db.prepare(
  `INSERT INTO protocols VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
);
const insertChunk = db.prepare(
  `INSERT INTO chunks_fts (protocol_id, title, heading, content) VALUES (?, ?, ?, ?)`,
);

mkdirSync(kbDir, { recursive: true });
let chunkCount = 0;

for (const doc of docs) {
  const markdown = toMarkdown(doc);
  insertProtocol.run(
    doc.id,
    doc.category,
    doc.title,
    doc.lang,
    doc.severityTier ?? null,
    JSON.stringify(doc.triggers ?? []),
    JSON.stringify(doc.sections),
    JSON.stringify(doc.contraindications ?? []),
    markdown,
    JSON.stringify(doc.source),
  );
  for (const s of doc.sections) {
    const content = [...s.paragraphs, ...s.steps].join("\n");
    if (!content.trim()) continue;
    insertChunk.run(doc.id, doc.title, s.heading, content);
    chunkCount++;
  }
  writeFileSync(resolve(kbDir, `${doc.id}.md`), markdown, "utf8");
}

db.close();
console.log(
  `Indexed ${docs.length} protocols, ${chunkCount} FTS chunks -> ${dbFile}\nMarkdown -> ${kbDir}`,
);
