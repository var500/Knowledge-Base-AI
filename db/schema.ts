import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";

/**
 * doc_chunks — stores every text chunk alongside its 1536-dimensional embedding.
 *
 * The `embedding` column uses the pgvector `vector(1536)` type.
 * pgvector must be enabled first: CREATE EXTENSION IF NOT EXISTS vector;
 *
 * Key SQL operator: `<=>` computes cosine distance (not similarity).
 *   cosine_distance = 1 − cosine_similarity
 *   So ORDER BY embedding <=> query_vec  →  closest match first
 */
export const docChunks = pgTable("doc_chunks", {
  id:         serial("id").primaryKey(),
  sourceFile: text("source_file").notNull(),    // e.g. "sample-article.txt"
  chunkIndex: integer("chunk_index").notNull(), // 0-based position in the document
  chunkMode:  text("chunk_mode").notNull(),     // "chars" | "tokens"
  content:    text("content").notNull(),         // raw text of this chunk
  embedding:  vector("embedding", { dimensions: 1536 }), // the vector column
  createdAt:  timestamp("created_at").defaultNow(),
});

export type DocChunk = typeof docChunks.$inferSelect;
export type NewDocChunk = typeof docChunks.$inferInsert;
