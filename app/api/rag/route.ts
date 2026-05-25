import { createOpenAI } from "@ai-sdk/openai";
import {
  embed,
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
  generateId,
  UIMessage,
} from "ai";
import postgres from "postgres";

/**
 * POST /api/rag
 *
 * The full RAG pipeline in one endpoint:
 *  1. Embed user query      → text-embedding-3-small  → 1536-dim vector
 *  2. Search pgvector       → <=> cosine distance     → top-5 relevant chunks
 *  3. Inject into prompt    → system message          → grounded context
 *  4. Stream answer         → gpt-4o-mini             → streamed response
 *
 * Body: { messages: UIMessage[], sourceFile?: string }
 * Returns: AI SDK UI message stream (consumed by useChat on the client)
 */
interface InputMessage extends Omit<UIMessage, "parts"> {
  content?: string;
  parts?: UIMessage["parts"];
}

export async function POST(request: Request) {
  try {
    const {
      messages,
      sourceFile,
    }: { messages: InputMessage[]; sourceFile?: string } = await request.json();

    if (!messages?.length) {
      return Response.json({ error: "No messages provided." }, { status: 400 });
    }

    // Ensure all messages have a parts array as required by AI SDK v6 convertToModelMessages
    const normalizedMessages: UIMessage[] = messages.map((m) => {
      if (!m.parts && typeof m.content === "string") {
        return {
          id: m.id,
          role: m.role,
          parts: [{ type: "text", text: m.content }],
          ...(m.metadata ? { metadata: m.metadata } : {}),
        } as UIMessage;
      }
      return {
        id: m.id,
        role: m.role,
        parts: m.parts ?? [],
        ...(m.metadata ? { metadata: m.metadata } : {}),
      } as UIMessage;
    });

    const modelMessages = await convertToModelMessages(normalizedMessages);
    const lastMessage = modelMessages[modelMessages.length - 1];
    let query = "";
    if (typeof lastMessage.content === "string") {
      query = lastMessage.content;
    } else if (Array.isArray(lastMessage.content)) {
      const textPart = lastMessage.content.find((part) => part.type === "text") as { text: string } | undefined;
      query = textPart?.text ?? "";
    }

    if (!query) {
      return Response.json({ error: "No user query found." }, { status: 400 });
    }

    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const responseId = generateId();
    const idGenerator = () => responseId;

    const stream = createUIMessageStream({
      originalMessages: normalizedMessages,
      generateId: idGenerator,
      execute: async ({ writer }) => {
        writer.write({
          type: "start",
          messageId: responseId,
        });

        // ── Step 0: Embed the user query ───────────────────────────────────────
        writer.write({
          type: "data-step",
          data: { step: 0 },
          transient: true,
        });

        const { embedding } = await embed({
          model: openai.embedding("text-embedding-3-small"),
          value: query,
        });

        const vectorLiteral = `[${embedding.join(",")}]`;

        // ── Step 1: Search pgvector ────────────────────────────────────────────
        writer.write({
          type: "data-step",
          data: { step: 1 },
          transient: true,
        });

        const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
        const modeFilter = sourceFile ? sql`WHERE source_file = ${sourceFile}` : sql``;

        const retrieved = await sql`
          SELECT
            content,
            source_file,
            chunk_index,
            chunk_mode,
            1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
          FROM doc_chunks
          ${modeFilter}
          ORDER BY embedding <=> ${vectorLiteral}::vector
          LIMIT 5
        `;

        await sql.end();

        const sources = retrieved.map((r) => ({
          sourceFile: r.source_file as string,
          chunkIndex: r.chunk_index as number,
          chunkMode: r.chunk_mode as string,
          similarity: parseFloat(r.similarity as string),
          content: r.content as string,
        }));

        // Write sources using the standard source-document chunk format
        for (let i = 0; i < sources.length; i++) {
          const s = sources[i];
          writer.write({
            type: "source-document",
            sourceId: `src-${i}`,
            mediaType: "text/markdown",
            title: s.sourceFile,
            filename: s.sourceFile,
            providerMetadata: {
              rag: {
                content: s.content,
                chunkIndex: s.chunkIndex,
                chunkMode: s.chunkMode,
                similarity: s.similarity,
              },
            },
          });
        }

        // ── Step 2: Inject Context ─────────────────────────────────────────────
        writer.write({
          type: "data-step",
          data: { step: 2 },
          transient: true,
        });

        const contextBlock =
          sources.length > 0
            ? sources
                .map(
                  (s, i) =>
                    `[Source ${i + 1} — ${s.sourceFile}, chunk #${s.chunkIndex + 1}, relevance: ${(s.similarity * 100).toFixed(1)}%]\n${s.content}`
                )
                .join("\n\n---\n\n")
            : "No relevant documents found in the knowledge base.";

        const systemPrompt = `You are a precise Knowledge Base AI. Answer questions ONLY using the document context below.

STRICT RULES:
1. Base every answer exclusively on the CONTEXT section. Do not use outside knowledge.
2. If the answer is not in the context, respond exactly: "I couldn't find that information in the uploaded documents."
3. Cite your source by file name (e.g. "According to [filename]...").
4. Be concise, accurate, and well-structured. Use bullet points when listing facts.

=== DOCUMENT CONTEXT ===
${contextBlock}
=== END CONTEXT ===`;

        // ── Step 3: Stream Answer ──────────────────────────────────────────────
        writer.write({
          type: "data-step",
          data: { step: 3 },
          transient: true,
        });

        const result = streamText({
          model: openai("gpt-4o-mini"),
          system: systemPrompt,
          messages: modelMessages,
        });

        writer.merge(
          result.toUIMessageStream({
            originalMessages: normalizedMessages,
            generateMessageId: idGenerator,
          })
        );
      },
      onError: (error) =>
        `Stream error: ${(error as Error).message ?? "Unknown error"}`,
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("[POST /api/rag]", error);
    return Response.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}
