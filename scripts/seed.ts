import * as fs from "fs";
import * as path from "path";
import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { getEncoding } from "js-tiktoken";
import { db } from "../db/index.ts";
import { docChunks } from "../db/schema.ts";

// ─── Chunking helpers (same logic as scripts/embed.ts) ─────────────────────

function chunkTextByChars(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let index = 0;
  const normalizedText = text.replace(/\s+/g, " ").trim();
  while (index < normalizedText.length) {
    let chunk = normalizedText.slice(index, index + chunkSize);
    if (index + chunkSize < normalizedText.length) {
      const lastSpace = chunk.lastIndexOf(" ");
      if (lastSpace > chunkSize * 0.8) chunk = chunk.slice(0, lastSpace);
    }
    chunks.push(chunk.trim());
    index += chunk.length + 1;
  }
  return chunks;
}

function chunkTextByTokens(text: string, maxTokens: number): string[] {
  const enc = getEncoding("cl100k_base");
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const allTokens = enc.encode(normalizedText);
  const chunks: string[] = [];
  let start = 0;
  while (start < allTokens.length) {
    const tokenSlice = allTokens.slice(start, start + maxTokens);
    const chunkText = (enc.decode(tokenSlice) as unknown as string).trim();
    if (chunkText.length > 0) chunks.push(chunkText);
    start += maxTokens;
  }
  return chunks;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const filePath = path.join(process.cwd(), "scripts", "sample-article.txt");
  const sourceFile = path.basename(filePath);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  const articleText = fs.readFileSync(filePath, "utf-8");
  console.log(`\n[SEED] Source: ${sourceFile} (${articleText.length} chars)\n`);

  // Generate both chunk sets so the DB has examples of both strategies
  const charChunks = chunkTextByChars(articleText, 500);
  const tokenChunks = chunkTextByTokens(articleText, 125); // ~500 chars worth of tokens

  console.log(`[SEED] Character-based chunks: ${charChunks.length}`);
  console.log(`[SEED] Token-based chunks:     ${tokenChunks.length}`);

  // ── Generate embeddings ──────────────────────────────────────────────────
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const model = openai.embedding("text-embedding-3-small");

  console.log(`\n[API]  Embedding ${charChunks.length + tokenChunks.length} chunks via text-embedding-3-small...`);

  const [charResult, tokenResult] = await Promise.all([
    embedMany({ model, values: charChunks }),
    embedMany({ model, values: tokenChunks }),
  ]);

  console.log(`[API]  Done. Each vector has ${charResult.embeddings[0].length} dimensions.\n`);

  // ── Build insert rows ────────────────────────────────────────────────────
  const rows = [
    ...charChunks.map((content, i) => ({
      sourceFile,
      chunkIndex: i,
      chunkMode: "chars" as const,
      content,
      embedding: charResult.embeddings[i],
    })),
    ...tokenChunks.map((content, i) => ({
      sourceFile,
      chunkIndex: i,
      chunkMode: "tokens" as const,
      content,
      embedding: tokenResult.embeddings[i],
    })),
  ];

  // ── Insert into Supabase via Drizzle ─────────────────────────────────────
  console.log(`[DB]   Inserting ${rows.length} rows into doc_chunks...`);

  // Clear existing rows for this source file first to allow re-seeding cleanly
  await db.delete(docChunks);
  console.log("[DB]   Cleared existing rows.");

  const inserted = await db.insert(docChunks).values(rows).returning({ id: docChunks.id });

  console.log(`[DB]   ✓ Inserted ${inserted.length} rows.`);
  console.log(`       IDs: ${inserted.map((r) => r.id).join(", ")}`);
  console.log("\n[DONE] Database seeded successfully!\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("[ERROR]", err);
  process.exit(1);
});
