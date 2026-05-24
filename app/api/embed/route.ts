import { createOpenAI } from "@ai-sdk/openai";
import { embedMany } from "ai";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { values } = await request.json();

    if (!values || !Array.isArray(values)) {
      return Response.json(
        {
          error:
            "Invalid request. Must provide an array of strings in the 'values' field.",
        },
        { status: 400 },
      );
    }

    if (values.length === 0) {
      return Response.json({ embeddings: [] });
    }

    // Call OpenAI text-embedding-3-small model using Vercel AI SDK
    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values,
    });

    return Response.json({ embeddings });
  } catch (error) {
    console.error("Error generating embeddings via API:", error);
    return Response.json(
      {
        error:
          (error as Error).message ||
          "An unexpected error occurred while generating embeddings.",
      },
      { status: 500 },
    );
  }
}
