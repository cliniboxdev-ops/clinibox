import axios from "axios";
import * as cheerio from "cheerio";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * WikEM ingestion — ACLS resuscitation protocol.
 *
 * Pulls the "Advanced Cardiac Life Support" page from the WikEM MediaWiki
 * API, strips the HTML into a structured section/step tree, and writes it
 * to /data at the repo root for offline use in the app.
 *
 * WikEM content is CC BY-SA (https://wikem.org/wiki/WikEM:Copyrights):
 * source, license, and revision metadata are embedded in the output and
 * MUST be displayed wherever this content is shown.
 *
 * Run: pnpm --filter @clinibox/ingest wikem
 */

const API_URL = "https://wikem.org/w/api.php";

const PAGES: { title: string; id: string; lang: "en" | "es" }[] = [
  { title: "ACLS (main)", id: "wikem-acls-main", lang: "en" },
  { title: "ACLS: bradycardia", id: "wikem-acls-bradycardia", lang: "en" },
  { title: "ACLS: tachycardia", id: "wikem-acls-tachycardia", lang: "en" },
  { title: "ACLS (main)/es", id: "wikem-acls-main.es", lang: "es" },
];

import type { ProtocolDocument, ProtocolSection } from "@clinibox/shared";

function cleanText(text: string): string {
  return text.replace(/\[\s*edit\s*\]/gi, "").replace(/\s+/g, " ").trim();
}

function parseSections(html: string): ProtocolSection[] {
  const $ = cheerio.load(html);
  const sections: ProtocolSection[] = [];
  let current: ProtocolSection = {
    heading: "Overview",
    level: 1,
    paragraphs: [],
    steps: [],
  };

  const flush = () => {
    if (current.paragraphs.length || current.steps.length) sections.push(current);
  };

  const container = $(".mw-parser-output").length ? $(".mw-parser-output") : $("body");
  container
    .children()
    .each((_, el) => {
      const tag = el.tagName?.toLowerCase();
      const node = $(el);
      if (tag && /^h[1-4]$/.test(tag)) {
        flush();
        current = {
          heading: cleanText(node.text()) || "Untitled",
          level: Number(tag[1]),
          paragraphs: [],
          steps: [],
        };
      } else if (tag === "p") {
        const text = cleanText(node.text());
        if (text) current.paragraphs.push(text);
      } else if (tag === "ul" || tag === "ol") {
        node.find("li").each((_i, li) => {
          const text = cleanText($(li).clone().children("ul,ol").remove().end().text());
          if (text) current.steps.push(text);
        });
      }
    });
  flush();
  return sections;
}

async function fetchPage(spec: (typeof PAGES)[number], outDir: string): Promise<string> {
  // WikEM lacks the TextExtracts extension, so use core action=parse
  const { data } = await axios.get(API_URL, {
    params: {
      action: "parse",
      page: spec.title,
      prop: "text|revid",
      format: "json",
      redirects: 1,
    },
    headers: { "User-Agent": "Clinibox-Ingest/0.1 (offline clinical reference)" },
    timeout: 30_000,
  });

  if (data?.error) throw new Error(`API error for "${spec.title}": ${data.error.info}`);
  const html: string | undefined = data?.parse?.text?.["*"];
  if (!html) throw new Error(`No parsed text for: ${spec.title}`);

  const page = { title: data.parse.title as string, revid: data.parse.revid as number };
  const sections = parseSections(html);
  const doc: ProtocolDocument = {
    id: spec.id,
    title: page.title ?? spec.title,
    lang: spec.lang,
    category: "resuscitation",
    severityTier: 1,
    source: {
      name: "WikEM",
      url: `https://wikem.org/wiki/${encodeURIComponent(spec.title.replace(/ /g, "_"))}`,
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      revisionId: page.revid ?? null,
      fetchedAt: new Date().toISOString(),
    },
    sections,
  };

  const outFile = resolve(outDir, `${spec.id}.json`);
  writeFileSync(outFile, JSON.stringify(doc, null, 2), "utf8");
  const stepCount = sections.reduce((n, s) => n + s.steps.length, 0);
  return `${spec.id}: ${sections.length} sections, ${stepCount} steps (rev ${doc.source.revisionId})`;
}

async function main(): Promise<void> {
  const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../../data");
  mkdirSync(outDir, { recursive: true });

  for (const spec of PAGES) {
    console.log(`Fetching "${spec.title}" from WikEM…`);
    console.log("  " + (await fetchPage(spec, outDir)));
    // polite rate limiting between requests
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`Done -> ${outDir}`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
