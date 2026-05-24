"use client";

import React, { useState, useMemo, useEffect } from "react";

// Sample Articles for educational exploration
const SAMPLE_ARTICLES = {
  vector: `Understanding Vector Search and Embeddings in AI Applications

In the era of modern artificial intelligence, large language models (LLMs) have revolutionized how we interact with information. However, these models have a fundamental limitation: they can only reason over the data they were trained on, or the context provided to them in a single prompt. This is where Retrieval-Augmented Generation (RAG) comes in. RAG allows us to fetch relevant documents from an external database and feed them to the LLM to ground its response in factual, up-to-date data. But how do we find "relevant" documents in milliseconds when dealing with millions of unstructured text documents?

The answer lies in Vector Math and Embeddings. An embedding is a process that transforms unstructured data, such as a paragraph of text, an image, or an audio clip, into a list of numbers called a vector. In mathematical terms, a vector represents a coordinate in a high-dimensional space. For instance, OpenAI's text-embedding-3-small model generates vectors with 1,536 dimensions. Each dimension represents a learned semantic concept or feature of the text. Because semantically similar texts are placed close to each other in this high-dimensional space, we can use vector geometry to perform search queries.

Before we can generate embeddings, we must prepare our unstructured text using a process called chunking. Because LLMs have context limits and embedding models perform best on focused paragraphs, we split long articles into smaller chunks. The choice of chunking strategy—such as fixed-character splitting (e.g., 500 characters), word-based splitting, or token-based splitting—directly affects search quality. If chunks are too small, they lose necessary context. If they are too large, the specific details get averaged out, and the embedding becomes too general, reducing search accuracy.

Once we have chunked our document and generated embeddings for each chunk, we can perform semantic search. When a user enters a query, we transform the query into an embedding vector using the same model. We then calculate the similarity between the query vector and all document vectors in our database. The standard formula used for this is Cosine Similarity. Cosine similarity measures the cosine of the angle between two vectors in a multi-dimensional space, which determines if they are pointing in roughly the same direction. It yields a score between -1 and 1, where 1 means the vectors are identical in direction, and 0 means they are orthogonal (independent). By ranking chunks by their cosine similarity score, we can retrieve the most relevant pieces of information to construct a prompt for our LLM.`,

  space: `Space Exploration, Gravity, and Orbital Mechanics

Space exploration has entered a new era driven by commercial enterprise and deep-space missions. The study of the solar system focuses on planetary bodies, their orbits, and gravitational fields. Gravity, described by Albert Einstein's general theory of relativity as the curvature of spacetime, governs the motion of planets around stars. Large bodies like Jupiter exert massive gravitational forces that can capture passing space debris or redirect the path of spacecraft. In deep-space operations, engineers use gravitational assists—slingshotting spacecraft around planets to gain speed without consuming fuel.

This orbital mechanics dance requires extremely precise calculations, matching the spacecraft's vector trajectory with the planet's gravitational pull to achieve the desired velocity vector. Even a tiny error in the trajectory coordinate can result in a spacecraft missing its target by millions of miles or crashing into a planet.

Furthermore, search and retrieval algorithms are used to monitor telemetry data from these probes. By encoding the multi-dimensional sensor metrics (temperature, pitch, roll, speed, radiation) into vector coordinates, flight systems can detect anomalies. If a spacecraft's sensor vector suddenly drifts away from the expected cluster of nominal vectors in the high-dimensional telemetry space, an alert triggers. This is vector math protecting human-made voyagers across the cosmos.`,

  quantum: `Quantum Computing, Superposition, and Cryptography

Quantum computing leverages the mind-bending principles of quantum mechanics to process information in ways classical computers never could. At the heart of this technology is the qubit, or quantum bit. Unlike classical bits that can only exist in a state of 0 or 1, qubits can exist in a superposition of both states simultaneously. Superposition allows a quantum system to hold multiple values at once, enabling exponential computational throughput for specific algorithms.

Another key concept is quantum entanglement, a phenomenon where qubits become linked so that the state of one instantly influences the state of another, no matter how far apart they are. Albert Einstein famously called this "spooky action at a distance." Together, superposition and entanglement allow quantum computers to evaluate vast numbers of possibilities at the same time.

This capability is expected to revolutionize fields like cryptography, molecule simulation for drug discovery, and optimization problems that are computationally intractable for silicon-based computers. However, building stable quantum computers is difficult because qubits are prone to "decoherence" caused by environmental noise. Scientists use vector representation of qubit states on a sphere (known as the Bloch Sphere) to model and correct quantum errors. Qubits are represented as three-dimensional state vectors, and quantum logic gates are mathematical matrix operations that rotate these vectors across the Bloch Sphere's coordinate grid.`,
};

// Colors for chunk highlighting
const CHUNK_BORDER_COLORS = [
  "border-teal-500 bg-teal-500/5 hover:bg-teal-500/10 text-teal-400",
  "border-violet-500 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400",
  "border-pink-500 bg-pink-500/5 hover:bg-pink-500/10 text-pink-400",
  "border-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400",
  "border-amber-500 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400",
  "border-sky-500 bg-sky-500/5 hover:bg-sky-500/10 text-sky-400",
];

// Helper to calculate cosine similarity
function calculateCosineSimilarity(vecA: number[], vecB: number[]) {
  if (vecA.length !== vecB.length) {
    return { dotProduct: 0, normA: 0, normB: 0, similarity: 0 };
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const normASqrt = Math.sqrt(normA);
  const normBSqrt = Math.sqrt(normB);
  const similarity =
    normASqrt === 0 || normBSqrt === 0
      ? 0
      : dotProduct / (normASqrt * normBSqrt);
  return { dotProduct, normA: normASqrt, normB: normBSqrt, similarity };
}

// Vector Fingerprint Grid Renderer
function VectorFingerprint({ vector }: { vector: number[] }) {
  // text-embedding-3-small gives 1536 dimensions.
  // We render a dense visual fingerprint using a grid.
  // Let's render 384 dimensions (16x24 grid) or the full 1536 using tiny blocks.
  // Let's render a grid of 384 columns/blocks for efficiency and clean UI representation.
  const step = Math.floor(vector.length / 384) || 1;
  const sampleVector = useMemo(() => {
    const sampled = [];
    for (let i = 0; i < 384 && i * step < vector.length; i++) {
      sampled.push(vector[i * step]);
    }
    return sampled;
  }, [vector, step]);

  return (
    <div className="relative group/vector flex flex-col gap-1.5 p-3 rounded-lg border border-slate-800 bg-slate-950/70 select-none">
      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
        <span>VECTOR FINGERPRINT (1,536 DIM)</span>
        <span>{vector.length} FLOAT32S</span>
      </div>
      <div className="grid grid-cols-24 gap-0.5 w-full max-h-20 overflow-hidden">
        {sampleVector.map((val, idx) => {
          // OpenAI embeds are normalized, float magnitudes are usually between -0.06 and +0.06
          const intensity = Math.min(Math.abs(val) * 15, 1.0);
          const isPositive = val > 0;
          return (
            <div
              key={idx}
              className="h-2 rounded-[1px] transition-all duration-300"
              style={{
                backgroundColor: isPositive
                  ? `rgba(45, 212, 191, ${0.1 + intensity * 0.9})` // Teal
                  : `rgba(236, 72, 153, ${0.1 + intensity * 0.9})`, // Pink
              }}
              title={`Dim ${idx * step}: ${val.toFixed(6)}`}
            />
          );
        })}
      </div>
      <div className="flex gap-2 justify-end text-[9px] font-mono">
        <span className="flex items-center gap-1 text-teal-400">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" /> &gt; 0
        </span>
        <span className="flex items-center gap-1 text-pink-400">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-400" /> &lt; 0
        </span>
      </div>
    </div>
  );
}

export default function Page() {
  const [article, setArticle] = useState(SAMPLE_ARTICLES.vector);
  const [chunkSize, setChunkSize] = useState(500);
  const [embeddings, setEmbeddings] = useState<number[][]>([]);
  const [loadingEmbeddings, setLoadingEmbeddings] = useState(false);
  const [embeddingError, setEmbeddingError] = useState("");

  // Search query & results state
  const [searchQuery, setSearchQuery] = useState("");
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchResults, setSearchResults] = useState<
    {
      chunkIndex: number;
      chunkText: string;
      similarity: number;
      dotProduct: number;
      normA: number;
      normB: number;
    }[]
  >([]);

  const [expandedVectorIndex, setExpandedVectorIndex] = useState<number | null>(
    null,
  );

  // Save to DB state
  const [savingToDb, setSavingToDb] = useState(false);
  const [dbSaveResult, setDbSaveResult] = useState<{ inserted: number; sourceFile: string } | null>(null);
  const [dbSaveError, setDbSaveError] = useState("");

  // Dynamic character-based chunking
  const chunks = useMemo(() => {
    if (!article.trim()) return [];

    const list: string[] = [];
    let index = 0;
    const normalizedText = article.replace(/\s+/g, " ").trim();

    while (index < normalizedText.length) {
      let chunk = normalizedText.slice(index, index + chunkSize);

      if (index + chunkSize < normalizedText.length) {
        // Find last space to avoid cutting in the middle of words
        const lastSpace = chunk.lastIndexOf(" ");
        if (lastSpace > chunkSize * 0.8) {
          chunk = chunk.slice(0, lastSpace);
        }
      }
      list.push(chunk.trim());
      index += chunk.length + 1; // move past chunk + space
    }
    return list;
  }, [article, chunkSize]);

  // If article or chunks change, clear generated embeddings and search results
  useEffect(() => {
    // Defer setState calls to avoid synchronous cascading renders
    const timer = setTimeout(() => {
      setEmbeddings([]);
      setQueryEmbedding(null);
      setSearchResults([]);
    }, 0);

    return () => clearTimeout(timer);
  }, [article, chunkSize]);

  // Handle generating embeddings
  const handleGenerateEmbeddings = async () => {
    if (chunks.length === 0) return;
    setLoadingEmbeddings(true);
    setEmbeddingError("");
    setSearchResults([]);
    setQueryEmbedding(null);
    try {
      const response = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: chunks }),
      });

      const data = await response.json();
      if (response.ok) {
        setEmbeddings(data.embeddings);
      } else {
        setEmbeddingError(data.error || "Failed to generate embeddings.");
      }
    } catch (err: unknown) {
      setEmbeddingError((err as Error).message || "Network error occurred.");
    } finally {
      setLoadingEmbeddings(false);
    }
  };

  // Handle semantic search query
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (embeddings.length === 0) {
      setSearchError("Please generate embeddings for the chunks first.");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const response = await fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: [searchQuery.trim()] }),
      });

      const data = await response.json();
      if (response.ok && data.embeddings?.length > 0) {
        const qEmbed = data.embeddings[0];
        setQueryEmbedding(qEmbed);

        // Compute similarity against all chunks
        const results = chunks.map((chunk, idx) => {
          const chunkEmbed = embeddings[idx];
          const math = calculateCosineSimilarity(qEmbed, chunkEmbed);
          return {
            chunkIndex: idx,
            chunkText: chunk,
            similarity: math.similarity,
            dotProduct: math.dotProduct,
            normA: math.normA,
            normB: math.normB,
          };
        });

        // Sort by similarity descending
        results.sort((a, b) => b.similarity - a.similarity);
        setSearchResults(results);
      } else {
        setSearchError(data.error || "Failed to embed the search query.");
      }
    } catch (err: unknown) {
      setSearchError(
        (err as Error).message || "Network error occurred embedding the query.",
      );
    } finally {
      setSearching(false);
    }
  };

  // Select a preset article
  const selectPreset = (key: keyof typeof SAMPLE_ARTICLES) => {
    setArticle(SAMPLE_ARTICLES[key]);
    setDbSaveResult(null);
    setDbSaveError("");
  };

  // Save chunks + embeddings to vector DB
  const handleSaveToDb = async () => {
    if (chunks.length === 0) return;
    setSavingToDb(true);
    setDbSaveError("");
    setDbSaveResult(null);
    try {
      const response = await fetch("/api/chunks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: article,
          sourceFile: "browser-upload",
          chunkSize,
          mode: "chars",
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setDbSaveResult({ inserted: data.inserted, sourceFile: "browser-upload" });
      } else {
        setDbSaveError(data.error || "Failed to save to database.");
      }
    } catch (err: unknown) {
      setDbSaveError((err as Error).message || "Network error.");
    } finally {
      setSavingToDb(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-teal-500/30 selection:text-teal-200 flex flex-col">
      {/* Background glowing effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight bg-linear-to-r from-teal-300 to-violet-400 bg-clip-text text-transparent font-sans">
              Knowledge Base AI
            </span>
            <span className="text-[9px] font-mono text-slate-500 tracking-widest">
              EMBEDDINGS PLAYGROUND
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/30">
            Embeddings ✦
          </div>
          <a
            href="/db-search"
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-all"
          >
            DB Search
          </a>
          <a
            href="/rag"
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-all"
          >
            RAG Chat
          </a>
        </nav>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex flex-col gap-10 w-full flex-1">
        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-slate-800/80 pb-8">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-teal-500/10 border border-teal-500/30 rounded-full text-xs font-semibold text-teal-400 font-mono tracking-wider">
              AI SEARCH FUNDAMENTALS
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-linear-to-r from-teal-300 via-sky-400 to-violet-400 bg-clip-text text-transparent">
            Vector Math & Embeddings Playground
          </h1>
          <p className="text-slate-400 text-lg max-w-3xl">
            Understand how to transform unstructured text into mathematical
            coordinates, visualize high-dimensional vector representations, and
            query them in real-time using Cosine Similarity.
          </p>
        </header>

        {/* Conceptual Guide Banner */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-xl">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-teal-400">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-950 text-teal-400 text-sm font-mono font-bold">
                1
              </span>
              <span>Chunking Strategy</span>
            </div>
            <p className="text-sm text-slate-400">
              Long texts are split into smaller fragments. The size dictates
              performance: too small drops context, too large dilutes specific
              coordinates.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-sky-400">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-950 text-sky-400 text-sm font-mono font-bold">
                2
              </span>
              <span>Vector Coordinates</span>
            </div>
            <p className="text-sm text-slate-400">
              OpenAI&apos;s{" "}
              <code className="text-sky-300 bg-sky-950/50 px-1 py-0.5 rounded text-[11px]">
                text-embedding-3-small
              </code>{" "}
              maps each chunk into a 1536-dimensional array of coordinates.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 font-semibold text-violet-400">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-950 text-violet-400 text-sm font-mono font-bold">
                3
              </span>
              <span>Cosine Similarity</span>
            </div>
            <p className="text-sm text-slate-400">
              Instead of literal keyword matching, we calculate the angle
              (cosine similarity) between query and chunk vectors to find
              semantic relevance.
            </p>
          </div>
        </section>

        {/* Main Interface Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT SIDE: Inputs & Controls (5 columns) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Step 1: Article Input Card */}
            <div className="flex flex-col gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-200">
                  1. Input Document
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  {article.length} chars
                </span>
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => selectPreset("vector")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    article === SAMPLE_ARTICLES.vector
                      ? "bg-teal-500/10 border-teal-500/50 text-teal-400 font-semibold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  Vector Search & RAG
                </button>
                <button
                  onClick={() => selectPreset("space")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    article === SAMPLE_ARTICLES.space
                      ? "bg-teal-500/10 border-teal-500/50 text-teal-400 font-semibold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  Orbital Telemetry
                </button>
                <button
                  onClick={() => selectPreset("quantum")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    article === SAMPLE_ARTICLES.quantum
                      ? "bg-teal-500/10 border-teal-500/50 text-teal-400 font-semibold"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  Quantum States
                </button>
              </div>

              <textarea
                value={article}
                onChange={(e) => setArticle(e.target.value)}
                placeholder="Paste your long article here..."
                className="w-full h-72 p-4 bg-slate-950/80 border border-slate-850 rounded-xl text-sm text-slate-300 focus:outline-none focus:border-teal-500/60 font-sans leading-relaxed resize-y focus:ring-1 focus:ring-teal-500/30"
              />
            </div>

            {/* Step 2: Chunking Slider */}
            <div className="flex flex-col gap-5 p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-slate-200">
                    2. Chunking Customizer
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define character boundaries per split
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/30 rounded text-teal-400 font-mono text-sm font-bold">
                  {chunkSize} chars
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>100 Chars (Granular)</span>
                  <span>1000 Chars (Broad context)</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-400 border-t border-slate-800/80 pt-4">
                <span>Resulting Splits:</span>
                <span className="font-bold text-slate-200 font-mono">
                  {chunks.length} chunks
                </span>
              </div>
            </div>

            {/* Step 3: Embed Action */}
            <div className="flex flex-col gap-4 p-6 rounded-2xl border border-slate-850 bg-linear-to-b from-slate-900/40 to-slate-900/20 backdrop-blur-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

              <h2 className="text-lg font-bold text-slate-200">
                3. Generate Coordinates
              </h2>
              <p className="text-xs text-slate-400">
                Send all {chunks.length} chunks to OpenAI&apos;s{" "}
                <code className="text-teal-400 bg-teal-950/20 px-1 py-0.5 rounded font-mono text-[10px]">
                  text-embedding-3-small
                </code>{" "}
                model.
              </p>

              <button
                onClick={handleGenerateEmbeddings}
                disabled={loadingEmbeddings || chunks.length === 0}
                className={`w-full py-3.5 px-4 rounded-xl font-medium tracking-wide flex items-center justify-center gap-2 border transition-all ${
                  loadingEmbeddings
                    ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                    : embeddings.length > 0
                      ? "bg-teal-500 border-teal-400 hover:bg-teal-400 text-slate-950 font-bold hover:shadow-lg hover:shadow-teal-500/20 hover:scale-[1.01] cursor-pointer"
                      : "bg-linear-to-r from-teal-500 to-sky-500 hover:from-teal-400 hover:to-sky-400 border-transparent text-slate-950 font-bold hover:shadow-lg hover:shadow-sky-500/25 hover:scale-[1.01] cursor-pointer"
                }`}
              >
                {loadingEmbeddings ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Generating Vectors...</span>
                  </>
                ) : embeddings.length > 0 ? (
                  <>
                    <svg
                      className="w-5 h-5 text-slate-950"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Embeddings Generated Successfully!</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 text-slate-950"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span>Generate Vector Arrays</span>
                  </>
                )}
              </button>

              {embeddingError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                  {embeddingError}
                </div>
              )}
            </div>

            {/* Step 4: Save to Vector DB — only shown after embeddings exist */}
            {embeddings.length > 0 && (
              <div className="flex flex-col gap-4 p-6 rounded-2xl border border-violet-900/40 bg-violet-950/10 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />

                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-slate-200">4. Save to Database</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Persist{" "}
                      <span className="text-violet-400 font-semibold">{chunks.length} chunks</span>{" "}
                      + their 1536-dim vectors into Supabase{" "}
                      <code className="text-violet-400 bg-violet-950/40 px-1 py-0.5 rounded font-mono text-[10px]">
                        doc_chunks
                      </code>
                    </p>
                  </div>
                  {dbSaveResult && (
                    <a
                      href="/db-search"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 text-xs font-semibold hover:bg-violet-500/20 transition-all"
                    >
                      Search DB →
                    </a>
                  )}
                </div>

                {dbSaveResult ? (
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-violet-500/10 border border-violet-500/30">
                    <div className="flex items-center gap-2 text-violet-300 font-semibold text-sm">
                      <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {dbSaveResult.inserted} rows inserted into Supabase
                    </div>
                    <div className="font-mono text-[10px] text-violet-400/70 flex flex-col gap-0.5">
                      <span>table: doc_chunks</span>
                      <span>source_file: {dbSaveResult.sourceFile}</span>
                      <span>chunk_mode: chars</span>
                      <span>vector dimensions: 1536</span>
                    </div>
                    <button
                      onClick={handleSaveToDb}
                      disabled={savingToDb}
                      className="mt-1 text-xs text-slate-500 hover:text-slate-300 cursor-pointer transition-colors text-left"
                    >
                      Re-save (will add more rows) →
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSaveToDb}
                    disabled={savingToDb}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold tracking-wide flex items-center justify-center gap-2 border transition-all ${
                      savingToDb
                        ? "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed"
                        : "bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 border-transparent text-white hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.01] cursor-pointer"
                    }`}
                  >
                    {savingToDb ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Saving to Supabase...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Save {chunks.length} Chunks to Vector DB</span>
                      </>
                    )}
                  </button>
                )}

                {dbSaveError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                    {dbSaveError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Chunk Visualizer & Similarity Results (7 columns) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Chunk Visualizer Section */}
            {embeddings.length === 0 && !loadingEmbeddings && (
              <div className="flex flex-col gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/10 backdrop-blur-md">
                <h2 className="text-lg font-bold text-slate-200">
                  Text Splitting Preview
                </h2>
                <p className="text-xs text-slate-400 -mt-2">
                  Here is how the article looks when split into chunks. Click
                  &quot;Generate Vector Arrays&quot; to query OpenAI.
                </p>

                <div className="flex flex-col gap-3 max-h-125 overflow-y-auto pr-1">
                  {chunks.map((chunk, index) => {
                    const colorStyle =
                      CHUNK_BORDER_COLORS[index % CHUNK_BORDER_COLORS.length];
                    return (
                      <div
                        key={index}
                        className={`p-4 border rounded-xl transition-all duration-200 flex flex-col gap-2 relative group ${colorStyle}`}
                      >
                        <div className="flex justify-between items-center text-[10px] font-mono opacity-80">
                          <span className="font-bold">CHUNK #{index + 1}</span>
                          <span>{chunk.length} characters</span>
                        </div>
                        <p className="text-sm text-slate-200 leading-relaxed font-sans select-text">
                          {chunk}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vectors & Similarity Search Panel */}
            {embeddings.length > 0 && embeddings.length === chunks.length && (
              <div className="flex flex-col gap-6">
                {/* 4. Cosine Similarity Query Box */}
                <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md flex flex-col gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />

                  <h2 className="text-lg font-bold text-slate-200">
                    4. Run Semantic Similarity Search
                  </h2>
                  <p className="text-xs text-slate-400">
                    Querying will generate an embedding for the query text, and
                    calculate the Cosine Similarity against each chunk&apos;s
                    1536-dimensional coordinates.
                  </p>

                  <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ask a question (e.g. 'How does cosine similarity work?' or 'telemetry metrics')"
                      className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500/30 font-sans"
                    />
                    <button
                      type="submit"
                      disabled={searching || !searchQuery.trim()}
                      className={`px-6 rounded-xl font-bold transition-all border flex items-center justify-center gap-1.5 ${
                        searching || !searchQuery.trim()
                          ? "bg-slate-800 border-slate-750 text-slate-500 cursor-not-allowed"
                          : "bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20 text-teal-400 hover:border-teal-400 cursor-pointer hover:shadow-lg hover:shadow-teal-500/10"
                      }`}
                    >
                      {searching ? "Searching..." : "Search"}
                    </button>
                  </form>
                  {searchError && (
                    <p className="text-xs text-red-400 p-2 bg-red-950/20 border border-red-900/30 rounded">
                      {searchError}
                    </p>
                  )}
                </div>

                {/* Search Results Display */}
                {searchResults.length > 0 && (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center px-1">
                      <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase font-mono">
                        Vector Search Results
                      </h3>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Ranked by Cosine Similarity Score
                      </span>
                    </div>

                    <div className="flex flex-col gap-4">
                      {searchResults.map((res, rank) => {
                        const isTop = rank === 0;
                        const scorePct = Math.round(res.similarity * 100);

                        return (
                          <div
                            key={res.chunkIndex}
                            className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col gap-4 ${
                              isTop
                                ? "bg-linear-to-br from-teal-500/10 to-transparent border-teal-500/60 shadow-lg shadow-teal-500/5 relative"
                                : "bg-slate-900/20 border-slate-850 hover:border-slate-800"
                            }`}
                          >
                            {isTop && (
                              <div className="absolute -top-2.5 left-5 bg-teal-500 text-slate-950 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Top Semantic Match
                              </div>
                            )}

                            <div className="flex flex-wrap justify-between items-center gap-3">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-bold text-slate-400">
                                  RANK #{rank + 1} (CHUNK #{res.chunkIndex + 1})
                                </span>
                              </div>
                              <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                                <div className="text-xs font-mono font-bold text-slate-400">
                                  Similarity Score:
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        isTop ? "bg-teal-400" : "bg-sky-400"
                                      }`}
                                      style={{
                                        width: `${Math.max(scorePct, 5)}%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`font-mono text-xs font-bold ${
                                      isTop ? "text-teal-400" : "text-sky-400"
                                    }`}
                                  >
                                    {res.similarity.toFixed(4)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <p className="text-sm text-slate-200 leading-relaxed font-sans">
                              &quot;{res.chunkText}&quot;
                            </p>

                            {/* Math breakdown for the top match */}
                            {isTop && (
                              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-850 flex flex-col gap-3">
                                <div className="flex justify-between items-center text-[10px] text-teal-400 font-mono tracking-wider">
                                  <span>SIMILARITY MATH BREAKDOWN</span>
                                  <span>COSINE FORMULA</span>
                                </div>
                                <div className="font-mono text-[11px] text-slate-400 leading-relaxed flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                    <span>Formula:</span>
                                    <span className="text-slate-200">
                                      Similarity = (U · V) / (||U|| * ||V||)
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Dot Product (U · V):</span>
                                    <span className="text-slate-200">
                                      {res.dotProduct.toFixed(6)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Query Vector Norm (||U||):</span>
                                    <span className="text-slate-200">
                                      {res.normA.toFixed(6)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Chunk Vector Norm (||V||):</span>
                                    <span className="text-slate-200">
                                      {res.normB.toFixed(6)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between pt-1.5 border-t border-slate-800 text-teal-400 font-bold">
                                    <span>Calculation:</span>
                                    <span>
                                      {res.dotProduct.toFixed(6)} / (
                                      {res.normA.toFixed(4)} *{" "}
                                      {res.normB.toFixed(4)}) ={" "}
                                      {res.similarity.toFixed(6)}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-500 italic font-sans leading-snug">
                                  Note: Since OpenAI embeddings are
                                  pre-normalized to a length (norm) of 1.0, the
                                  calculation simplifies to just the Dot
                                  Product, meaning vector length division has no
                                  scaling effect!
                                </p>
                              </div>
                            )}

                            {/* Render the mini fingerprint grid */}
                            <VectorFingerprint
                              vector={embeddings[res.chunkIndex]}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* List of generated chunk coordinates (Inspector View) */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase font-mono">
                      All Document Embeddings ({embeddings.length})
                    </h3>
                    <p className="text-xs text-slate-500 font-sans">
                      Click coordinate grid to inspect floats
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {embeddings.map((vector, index) => {
                      const isExpanded = expandedVectorIndex === index;
                      return (
                        <div
                          key={index}
                          className="p-4 rounded-xl border border-slate-850 bg-slate-900/10 flex flex-col gap-3 transition-all hover:border-slate-800"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-xs font-bold text-slate-300">
                              Chunk #{index + 1}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {chunks[index].length} chars
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 line-clamp-2">
                            &quot;{chunks[index]}&quot;
                          </p>

                          <div
                            onClick={() =>
                              setExpandedVectorIndex(isExpanded ? null : index)
                            }
                            className="cursor-pointer transition-transform hover:scale-[1.005]"
                          >
                            <VectorFingerprint vector={vector} />
                          </div>

                          {isExpanded && (
                            <div className="mt-2 p-3 bg-slate-950 border border-slate-850 rounded-lg flex flex-col gap-2">
                              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                                <span>RAW COORDINATES (FIRST 20 OF 1536)</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(
                                      JSON.stringify(vector),
                                    );
                                  }}
                                  className="text-teal-400 hover:text-teal-300 cursor-pointer"
                                >
                                  Copy All
                                </button>
                              </div>
                              <div className="font-mono text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-25 overflow-y-auto">
                                [{" "}
                                {vector
                                  .slice(0, 20)
                                  .map((n) => n.toFixed(6))
                                  .join(", ")}
                                , ... ]
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Math & Concept explanation drawer (Educational footer) */}
        <footer className="mt-12 border-t border-slate-850 pt-10 flex flex-col gap-8">
          <h2 className="text-xl font-bold bg-linear-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
            Understanding the Underlying Science
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl border border-slate-850 bg-slate-900/5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                1. Vector Dimensions
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A standard 3D space uses coordinates{" "}
                <code className="text-slate-300 bg-slate-800 px-1 py-0.5 rounded font-mono">
                  (x, y, z)
                </code>
                {`. An embedding vector uses a 1,536-dimensional space. Each axis representing an abstract concept derived by the neural network during training, like "gravity", "algorithm", or "quantum state".`}
              </p>
            </div>
            <div className="p-5 rounded-xl border border-slate-850 bg-slate-900/5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                2. Tokenization & Chunking
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When you split text, you must choose a chunk boundary. If a
                chunk splits a paragraph at 500 characters, it can split words
                or sentences in half, decreasing search accuracy. An advanced
                chunker uses overlapping windows or sentence boundaries to
                preserve local semantic content.
              </p>
            </div>
            <div className="p-5 rounded-xl border border-slate-850 bg-slate-900/5 flex flex-col gap-3">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                3. Orthogonality & Magnitude
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If two chunks are totally unrelated, their vectors point at
                $90^\circ$ angles, yielding a Cosine Similarity score of 0. If
                they are opposite (e.g. opposing concepts), they point in
                opposite directions, score closer to -1. Overlapping topics
                cluster in coordinates, score closer to 1.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
