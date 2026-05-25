import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";
import postgres from "postgres";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: Request) {
  try {
    const { query, mode = "all", topK = 3 } = await request.json();

    if (!query || typeof query !== "string") {
      return Response.json({ error: "Must provide a 'query' string." }, { status: 400 });
    }

    // 1. Embed the query using the same model used at seed time
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    });

    const vectorLiteral = `[${embedding.join(",")}]`;

    // 2. Run the raw SQL cosine distance query against pgvector
    //    <=> is the pgvector cosine distance operator
    //    1 - distance = cosine similarity
    const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

    const modeFilter = mode === "all" ? sql`` : sql`WHERE chunk_mode = ${mode}`;

    const results = await sql`
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

    await sql.end();

    return Response.json({
      results: results.map((r) => ({
        id: r.id,
        sourceFile: r.source_file,
        chunkIndex: r.chunk_index,
        chunkMode: r.chunk_mode,
        content: r.content,
        similarity: parseFloat(r.cosine_similarity),
      })),
      sqlQuery: `SELECT id, source_file, chunk_index, chunk_mode, content,\n       1 - (embedding <=> $1::vector) AS cosine_similarity\nFROM doc_chunks${mode !== "all" ? `\nWHERE chunk_mode = '${mode}'` : ""}\nORDER BY embedding <=> $1::vector\nLIMIT ${topK};`,
    });
  } catch (error) {
    console.error("[/api/search]", error);
    return Response.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
