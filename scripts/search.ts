import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";
import postgres from "postgres";

/**
 * scripts/search.ts
 *
 * Demonstrates the Week 3 core SQL concept:
 * Searching for the most relevant chunks using pgvector's <=> operator.
 *
 * The <=> operator computes COSINE DISTANCE (not similarity).
 *   cosine_distance = 1 − cosine_similarity
 *   So:  distance close to 0  → very similar
 *        distance close to 1  → unrelated
 *        distance close to 2  → opposite meaning
 *
 * We convert back to similarity with:  1 - (embedding <=> query_vector)
 */

async function main() {
  const args = process.argv.slice(2);
  let query = "How does cosine similarity work?";
  let mode: "chars" | "tokens" | "all" = "all";
  let topK = 3;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--query" || args[i] === "-q") query = args[++i];
    if (args[i] === "--mode"  || args[i] === "-m") mode  = args[++i] as typeof mode;
    if (args[i] === "--top"   || args[i] === "-t") topK  = parseInt(args[++i], 10);
  }

  console.log("\n==========================================");
  console.log("  pgvector Semantic Search (Week 3)");
  console.log("==========================================\n");
  console.log(`Query:  "${query}"`);
  console.log(`Mode:   ${mode === "all" ? "chars + tokens" : mode}`);
  console.log(`Top-K:  ${topK}\n`);

  // ── 1. Embed the query (same model as was used when seeding) ─────────────
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  process.stdout.write("[API]  Embedding query... ");
  const { embedding: queryEmbedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: query,
  });
  console.log("done.\n");

  // Format as a pgvector literal string: '[0.1, -0.2, ...]'
  const vectorLiteral = `[${queryEmbedding.join(",")}]`;

  // ── 2. Connect and run raw SQL ────────────────────────────────────────────
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  // ─────────────────────────────────────────────────────────────────────────
  // THE KEY QUERY — this is what Week 3 is all about:
  //
  //   embedding <=> $1::vector
  //     ↑ pgvector cosine DISTANCE operator
  //     ↑ lower = more similar
  //
  //   1 - (embedding <=> $1::vector)
  //     ↑ converts distance → similarity score (0 to 1)
  //
  //   ORDER BY embedding <=> $1::vector
  //     ↑ smallest distance = most similar = first result
  //
  //   LIMIT 3
  //     ↑ top-K results
  // ─────────────────────────────────────────────────────────────────────────
  const modeFilter = mode === "all" ? sql`` : sql`WHERE chunk_mode = ${mode}`;

  const rawSQLQuery = `
SELECT
  id,
  source_file,
  chunk_index,
  chunk_mode,
  content,
  1 - (embedding <=> '${vectorLiteral}'::vector) AS cosine_similarity
FROM doc_chunks
${mode !== "all" ? `WHERE chunk_mode = '${mode}'` : ""}
ORDER BY embedding <=> '${vectorLiteral}'::vector
LIMIT ${topK};`;

  console.log("[SQL]  Executing raw pgvector query:");
  console.log("─".repeat(50));
  console.log(`SELECT id, source_file, chunk_index, chunk_mode, content,`);
  console.log(`       1 - (embedding <=> $1::vector) AS cosine_similarity`);
  console.log(`FROM doc_chunks`);
  if (mode !== "all") console.log(`WHERE chunk_mode = '${mode}'`);
  console.log(`ORDER BY embedding <=> $1::vector`);
  console.log(`LIMIT ${topK};`);
  console.log("─".repeat(50));
  console.log();

  type ResultRow = {
    id: number;
    source_file: string;
    chunk_index: number;
    chunk_mode: string;
    content: string;
    cosine_similarity: string;
  };

  const results: ResultRow[] = await sql`
    SELECT
      id,
      source_file,
      chunk_index,
      chunk_mode,
      content,
      1 - (embedding <=> ${vectorLiteral}::vector) AS cosine_similarity
    FROM doc_chunks
    ${modeFilter}
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${topK}
  `;

  if (results.length === 0) {
    console.log("[WARN] No results found. Have you run the seed script yet?");
    console.log("       node --env-file=.env --experimental-strip-types scripts/seed.ts\n");
  } else {
    console.log(`[RESULTS] Top ${results.length} matches:\n`);
    results.forEach((row, rank) => {
      console.log(`  Rank #${rank + 1} — ID: ${row.id} | Mode: ${row.chunk_mode} | Chunk #${row.chunk_index + 1}`);
      console.log(`  Cosine Similarity: ${parseFloat(row.cosine_similarity).toFixed(4)}`);
      console.log(`  "${row.content.slice(0, 120)}..."`);
      console.log();
    });
  }

  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("[ERROR]", err.message || err);
  process.exit(1);
});
