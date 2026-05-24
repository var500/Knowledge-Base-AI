import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { docChunks } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { asc } from "drizzle-orm";

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

function getDb() {
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  return { db: drizzle(client, { schema: { docChunks } }), client };
}

// ─── POST /api/chunks ────────────────────────────────────────────────────────
// Body: { text: string, sourceFile?: string, chunkSize?: number, mode?: "chars"|"tokens" }
// Chunks the text, generates embeddings, inserts all rows into doc_chunks.
// Returns: { inserted: number, rows: [{ id, chunkIndex, chunkMode, content }] }
export async function POST(request: Request) {
  try {
    const {
      text,
      sourceFile = "browser-upload",
      chunkSize = 500,
      mode = "chars",
    }: {
      text: string;
      sourceFile?: string;
      chunkSize?: number;
      mode?: "chars" | "tokens";
    } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return Response.json(
        { error: "Must provide a non-empty 'text' string." },
        { status: 400 }
      );
    }

    // ── Chunk ────────────────────────────────────────────────────────────────
    const chunks = chunkText(text.trim(), chunkSize, mode);

    if (chunks.length === 0) {
      return Response.json({ error: "Text produced no chunks." }, { status: 400 });
    }

    // ── Embed ────────────────────────────────────────────────────────────────
    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: chunks,
    });

    // ── Insert ───────────────────────────────────────────────────────────────
    const rows = chunks.map((content, i) => ({
      sourceFile,
      chunkIndex: i,
      chunkMode: mode,
      content,
      embedding: embeddings[i],
    }));

    const { db, client } = getDb();
    const inserted = await db
      .insert(docChunks)
      .values(rows)
      .returning({
        id: docChunks.id,
        chunkIndex: docChunks.chunkIndex,
        chunkMode: docChunks.chunkMode,
        content: docChunks.content,
        sourceFile: docChunks.sourceFile,
      });

    await client.end();

    return Response.json({ inserted: inserted.length, rows: inserted });
  } catch (error) {
    console.error("[POST /api/chunks]", error);
    return Response.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── GET /api/chunks ─────────────────────────────────────────────────────────
// Returns all stored chunks without embedding data (too large for display).
// Optional query param: ?source=filename  to filter by source file.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");

    const { db, client } = getDb();

    const rows = await db
      .select({
        id: docChunks.id,
        sourceFile: docChunks.sourceFile,
        chunkIndex: docChunks.chunkIndex,
        chunkMode: docChunks.chunkMode,
        content: docChunks.content,
        createdAt: docChunks.createdAt,
      })
      .from(docChunks)
      .where(source ? eq(docChunks.sourceFile, source) : undefined)
      .orderBy(asc(docChunks.createdAt), asc(docChunks.chunkIndex));

    await client.end();

    return Response.json({ total: rows.length, rows });
  } catch (error) {
    console.error("[GET /api/chunks]", error);
    return Response.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/chunks ───────────────────────────────────────────────────────
// Clears all rows from doc_chunks.
// Optional query param: ?source=filename  to delete only rows from that source.
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source");

    const { db, client } = getDb();

    const deleted = await db
      .delete(docChunks)
      .where(source ? eq(docChunks.sourceFile, source) : undefined)
      .returning({ id: docChunks.id });

    await client.end();

    return Response.json({ deleted: deleted.length });
  } catch (error) {
    console.error("[DELETE /api/chunks]", error);
    return Response.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── Chunking helpers ─────────────────────────────────────────────────────────

function chunkText(text: string, chunkSize: number, mode: "chars" | "tokens"): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (mode === "tokens") return chunkByTokens(normalized, chunkSize);
  return chunkByChars(normalized, chunkSize);
}

function chunkByChars(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    let chunk = text.slice(index, index + chunkSize);
    if (index + chunkSize < text.length) {
      const lastSpace = chunk.lastIndexOf(" ");
      if (lastSpace > chunkSize * 0.8) chunk = chunk.slice(0, lastSpace);
    }
    chunks.push(chunk.trim());
    index += chunk.length + 1;
  }
  return chunks;
}

function chunkByTokens(text: string, maxTokens: number): string[] {
  // Dynamic import to avoid loading WASM unless needed
  // For simplicity in the API route we fall back to character chunking
  // with a rough token conversion (1 token ≈ 4 chars)
  return chunkByChars(text, maxTokens * 4);
}
