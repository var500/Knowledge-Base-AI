import * as fs from "fs";
import * as path from "path";
import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";
import { getEncoding } from "js-tiktoken";

// 1. Helper function to split text into chunks of specified character size
function chunkTextByChars(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let index = 0;

  // Clean up whitespace transitions but keep paragraph structure readable
  const normalizedText = text.replace(/\s+/g, " ").trim();

  while (index < normalizedText.length) {
    // Extract a chunk of chunkSize characters
    let chunk = normalizedText.slice(index, index + chunkSize);

    // To make chunks cleaner, let's try not to split words in half if possible
    if (index + chunkSize < normalizedText.length) {
      const lastSpace = chunk.lastIndexOf(" ");
      if (lastSpace > chunkSize * 0.8) {
        chunk = chunk.slice(0, lastSpace);
      }
    }

    chunks.push(chunk.trim());
    index += chunk.length + 1; // move past this chunk and the space
  }

  return chunks;
}

// 1b. Token-based chunking using the cl100k_base tokenizer
// This is the same tokenizer used by text-embedding-3-small.
// A token ≈ 4 characters on average, but punctuation/spaces/non-English text
// can vary significantly. Splitting by tokens gives the model a more
// meaningful and consistent context window per chunk.
function chunkTextByTokens(text: string, maxTokens: number): string[] {
  const enc = getEncoding("cl100k_base"); // tokenizer used by embedding models
  const normalizedText = text.replace(/\s+/g, " ").trim();

  // Encode the entire text into an array of token integers
  const allTokens = enc.encode(normalizedText);
  const chunks: string[] = [];

  let start = 0;
  while (start < allTokens.length) {
    // Slice out up to maxTokens token IDs
    const tokenSlice = allTokens.slice(start, start + maxTokens);

    // enc.decode() returns a plain string directly in js-tiktoken
    const chunkText = (enc.decode(tokenSlice) as unknown as string).trim();
    if (chunkText.length > 0) {
      chunks.push(chunkText);
    }
    start += maxTokens;
  }

  return chunks;
}

// 2. Cosine similarity function
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 3. Main execution function
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let filePath = path.join(process.cwd(), "scripts", "sample-article.txt");
  let query = "vector space cosine similarity";
  let chunkSize = 500;
  let mode: "chars" | "tokens" = "chars"; // default to character-based

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" || args[i] === "-f") {
      filePath = args[++i];
    } else if (args[i] === "--query" || args[i] === "-q") {
      query = args[++i];
    } else if (args[i] === "--size" || args[i] === "-s") {
      chunkSize = parseInt(args[++i], 10);
    } else if (args[i] === "--mode" || args[i] === "-m") {
      const val = args[++i];
      if (val === "tokens" || val === "chars") mode = val;
    }
  }

  console.log("==========================================");
  console.log("Vector Math & Embeddings Explorer CLI Tool");
  console.log("==========================================\n");

  // Read the article
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  const articleText = fs.readFileSync(filePath, "utf-8");
  console.log(
    `[INFO] Loaded article from: ${path.basename(filePath)} (${articleText.length} characters)`,
  );
  const isTokenMode = mode === "tokens";
  console.log(
    isTokenMode
      ? `[INFO] Chunking strategy: Token-based, max ${chunkSize} tokens/chunk (cl100k_base tokenizer).\n`
      : `[INFO] Chunking strategy: Character-based, approx. ${chunkSize} chars/chunk.\n`,
  );

  // --- Side-by-side comparison (always shown for learning) ---
  const charChunks = chunkTextByChars(articleText, chunkSize);
  const tokenChunks = chunkTextByTokens(articleText, Math.round(chunkSize / 4)); // ~4 chars/token
  console.log("[COMPARE] Chunking strategy comparison:");
  console.log(`  Character-based (${chunkSize} chars/chunk): ${charChunks.length} chunks`);
  console.log(`  Token-based     (~${Math.round(chunkSize / 4)} tokens/chunk): ${tokenChunks.length} chunks`);
  console.log(`  Ratio: ~${(articleText.length / charChunks.length).toFixed(0)} chars/chunk vs ~${(articleText.length / tokenChunks.length).toFixed(0)} chars/chunk\n`);

  // Use the chosen strategy for the actual embedding run
  const chunks = isTokenMode ? tokenChunks : charChunks;
  console.log(`[SUCCESS] Using ${isTokenMode ? "token" : "character"}-based chunks: ${chunks.length} total`);
  chunks.forEach((chunk, idx) => {
    console.log(
      `  Chunk #${idx + 1}: ${chunk.length} chars | "${chunk.slice(0, 60)}..."`,
    );
  });
  console.log();

  // Validate OpenAI API Key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "Error: OPENAI_API_KEY is not defined in the environment or .env file.",
    );
    console.error(
      "Please run the script with environment variables loaded, e.g.:",
    );
    console.error("  npx tsx scripts/embed.ts");
    process.exit(1);
  }

  // Initialize OpenAI AI SDK provider
  const openai = createOpenAI({ apiKey });
  const embeddingModel = openai.embedding("text-embedding-3-small");

  console.log(
    `[API] Generating 1536-dimensional embeddings using text-embedding-3-small...`,
  );

  try {
    // Generate embeddings for all chunks in parallel
    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks,
    });

    console.log(`[SUCCESS] Generated ${embeddings.length} embeddings vectors.`);
    console.log(`  Vector dimension: ${embeddings[0].length}`);
    console.log(`  Sample coordinates (first 5 dimensions of Chunk #1):`);
    console.log(
      `  [ ${embeddings[0]
        .slice(0, 5)
        .map((n) => n.toFixed(6))
        .join(", ")}, ... ]\n`,
    );

    // Embed the query
    console.log(`[API] Generating embedding for query: "${query}"`);
    const { embedding: queryEmbedding } = await embed({
      model: embeddingModel,
      value: query,
    });
    console.log(`[SUCCESS] Query embedded successfully.\n`);

    // Calculate Cosine Similarity
    console.log(
      `[MATH] Calculating Cosine Similarity between query and chunks...`,
    );
    const searchResults = chunks.map((chunk, idx) => {
      const chunkEmbedding = embeddings[idx];
      const similarity = calculateCosineSimilarity(
        queryEmbedding,
        chunkEmbedding,
      );
      return {
        index: idx + 1,
        chunk,
        similarity,
      };
    });

    // Sort by similarity score descending
    searchResults.sort((a, b) => b.similarity - a.similarity);

    console.log("==========================================");
    console.log(`SEARCH RESULTS FOR QUERY: "${query}"`);
    console.log("==========================================");
    searchResults.forEach((res, rank) => {
      console.log(
        `\nRank #${rank + 1} | Chunk #${res.index} | Cosine Similarity: ${res.similarity.toFixed(4)}`,
      );
      console.log(`------------------------------------------`);
      console.log(`"${res.chunk}"`);
    });
    console.log("\n==========================================");
  } catch (error) {
    console.error(
      "Error communicating with OpenAI API:",
      (error as Error).message || error,
    );
    process.exit(1);
  }
}

main();
