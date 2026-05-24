"use client";

import React, { useState } from "react";

type SearchResult = {
  id: number;
  sourceFile: string;
  chunkIndex: number;
  chunkMode: string;
  content: string;
  similarity: number;
};

const SAMPLE_QUERIES = [
  "How does cosine similarity measure relevance?",
  "What is text chunking and why does it matter?",
  "How do LLMs retrieve documents from a database?",
  "Explain vector embeddings in simple terms",
];

export default function DBSearchPage() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"all" | "chars" | "tokens">("all");
  const [topK] = useState(3);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sqlQuery, setSqlQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent | null, overrideQuery?: string) => {
    e?.preventDefault();
    const finalQuery = overrideQuery ?? query;
    if (!finalQuery.trim()) return;

    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: finalQuery, mode, topK }),
      });

      const data = await response.json();
      if (response.ok) {
        setResults(data.results);
        setSqlQuery(data.sqlQuery);
      } else {
        setError(data.error || "Search failed.");
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSampleQuery = (q: string) => {
    setQuery(q);
    handleSearch(null, q);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans flex flex-col">
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-teal-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight bg-gradient-to-r from-violet-300 to-teal-400 bg-clip-text text-transparent font-sans">
              Knowledge Base AI
            </span>
            <span className="text-[9px] font-mono text-slate-500 tracking-widest">
              VECTOR DATABASE SEARCH
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <a
            href="/"
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-all"
          >
            Embeddings
          </a>
          <div className="px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/30">
            DB Search ✦
          </div>
          <a
            href="/rag"
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-all"
          >
            RAG Chat
          </a>
        </nav>
      </header>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10 w-full flex-1">

        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-slate-800/80 pb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="px-3 py-1 bg-violet-500/10 border border-violet-500/30 rounded-full text-xs font-semibold text-violet-400 font-mono tracking-wider">
              WEEK 3
            </div>
            <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs font-semibold text-slate-400 font-mono tracking-wider">
              pgvector + Supabase + Drizzle
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-violet-300 via-sky-400 to-teal-400 bg-clip-text text-transparent">
            Vector Database Search
          </h1>
          <p className="text-slate-400 text-lg max-w-3xl">
            Queries stored embeddings inside Supabase PostgreSQL using the{" "}
            <code className="text-violet-300 bg-violet-950/30 px-1.5 py-0.5 rounded font-mono text-sm">
              &lt;=&gt;
            </code>{" "}
            cosine distance operator from the{" "}
            <code className="text-violet-300 bg-violet-950/30 px-1.5 py-0.5 rounded font-mono text-sm">
              pgvector
            </code>{" "}
            extension — no in-memory math, real database I/O.
          </p>
        </header>

        {/* Concept Banner */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-xl">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono font-bold text-violet-400 tracking-wider">OPERATOR</span>
            <code className="text-slate-200 font-mono text-sm bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              embedding &lt;=&gt; query::vector
            </code>
            <p className="text-xs text-slate-500">pgvector cosine distance (lower = more similar)</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono font-bold text-sky-400 tracking-wider">COLUMN TYPE</span>
            <code className="text-slate-200 font-mono text-sm bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              vector(1536)
            </code>
            <p className="text-xs text-slate-500">PostgreSQL column storing 1536 floats per row</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono font-bold text-teal-400 tracking-wider">SIMILARITY</span>
            <code className="text-slate-200 font-mono text-sm bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              1 - (embedding &lt;=&gt; q)
            </code>
            <p className="text-xs text-slate-500">Convert distance → similarity (0 to 1)</p>
          </div>
        </section>

        {/* Search Interface */}
        <div className="flex flex-col gap-5 p-6 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-200">Query the Vector Database</h2>
            {/* Mode selector */}
            <div className="flex gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
              {(["all", "chars", "tokens"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition-all cursor-pointer ${
                    mode === m
                      ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Sample queries */}
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => handleSampleQuery(q)}
                className="px-3 py-1.5 rounded-lg text-xs border border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about the stored documents..."
              className="flex-1 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-violet-500 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 font-sans"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className={`px-6 py-3 rounded-xl font-bold transition-all border text-sm flex items-center gap-2 ${
                loading || !query.trim()
                  ? "bg-slate-800 border-slate-750 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-violet-500 to-sky-500 hover:from-violet-400 hover:to-sky-400 border-transparent text-white cursor-pointer hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02]"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Searching DB...
                </>
              ) : (
                "Search"
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* SQL Query Display */}
        {sqlQuery && (
          <div className="flex flex-col gap-3 p-5 rounded-2xl border border-slate-800 bg-slate-950/70 backdrop-blur-md">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono font-bold text-violet-400 tracking-wider">
                SQL EXECUTED AGAINST SUPABASE
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(sqlQuery)}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer font-mono transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="font-mono text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap overflow-x-auto">
              <span className="text-sky-400">SELECT</span>{" "}
              <span className="text-slate-300">id, source_file, chunk_index, chunk_mode, content,</span>
              {"\n"}
              {"       "}
              <span className="text-amber-400">1 - (embedding {"<=>"} $1::vector)</span>
              {" "}
              <span className="text-slate-500">AS cosine_similarity</span>
              {"\n"}
              <span className="text-sky-400">FROM</span>
              {" "}
              <span className="text-teal-300">doc_chunks</span>
              {mode !== "all" && (
                <>
                  {"\n"}
                  <span className="text-sky-400">WHERE</span>
                  {" "}
                  <span className="text-slate-300">chunk_mode = </span>
                  <span className="text-amber-300">&apos;{mode}&apos;</span>
                </>
              )}
              {"\n"}
              <span className="text-sky-400">ORDER BY</span>
              {" "}
              <span className="text-amber-400">embedding {"<=>"} $1::vector</span>
              {"\n"}
              <span className="text-sky-400">LIMIT</span>
              {" "}
              <span className="text-violet-300">{topK}</span>;
            </pre>
            <p className="text-[10px] text-slate-600 font-sans">
              <span className="text-amber-400/80 font-mono">{"<=>"}</span> is pgvector&apos;s cosine distance operator.
              Lower distance = more similar. We convert with{" "}
              <span className="text-amber-400/80 font-mono">1 - distance</span> to get a familiar 0→1 similarity score.
            </p>
          </div>
        )}

        {/* Results */}
        {hasSearched && !loading && (
          <div className="flex flex-col gap-5">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase font-mono">
                {results.length > 0 ? `Top ${results.length} Results from Supabase` : "No results"}
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                Ranked by <code className="text-violet-400">{"<=>"}</code> cosine distance
              </span>
            </div>

            {results.length === 0 && (
              <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-center flex flex-col gap-2">
                <p className="text-amber-400 font-semibold text-sm">Database is empty</p>
                <p className="text-slate-500 text-xs">
                  Run the seed script first to populate it:
                </p>
                <code className="text-slate-400 font-mono text-xs bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 inline-block mx-auto">
                  node --env-file=.env --experimental-strip-types scripts/seed.ts
                </code>
              </div>
            )}

            {results.map((res, rank) => {
              const isTop = rank === 0;
              const scorePct = Math.round(res.similarity * 100);

              return (
                <div
                  key={res.id}
                  className={`p-5 rounded-2xl border flex flex-col gap-4 transition-all relative ${
                    isTop
                      ? "bg-gradient-to-br from-violet-500/10 to-transparent border-violet-500/50 shadow-lg shadow-violet-500/5"
                      : "bg-slate-900/20 border-slate-850 hover:border-slate-800"
                  }`}
                >
                  {isTop && (
                    <div className="absolute -top-2.5 left-5 bg-violet-500 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Top Match
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        RANK #{rank + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-400">
                        id: {res.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded border font-mono text-[10px] ${
                        res.chunkMode === "tokens"
                          ? "bg-teal-950/50 border-teal-800 text-teal-400"
                          : "bg-sky-950/50 border-sky-800 text-sky-400"
                      }`}>
                        {res.chunkMode} chunks
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        chunk #{res.chunkIndex + 1}
                      </span>
                    </div>

                    {/* Similarity meter */}
                    <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="text-xs font-mono text-slate-400">Similarity:</span>
                      <div className="w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isTop ? "bg-violet-400" : "bg-sky-400"}`}
                          style={{ width: `${Math.max(scorePct, 5)}%` }}
                        />
                      </div>
                      <span className={`font-mono text-xs font-bold ${isTop ? "text-violet-400" : "text-sky-400"}`}>
                        {res.similarity.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {/* Chunk text */}
                  <p className="text-sm text-slate-200 leading-relaxed font-sans">
                    &quot;{res.content}&quot;
                  </p>

                  {/* DB row info */}
                  <div className="flex gap-4 text-[10px] font-mono text-slate-600 border-t border-slate-850 pt-2.5">
                    <span>source: {res.sourceFile}</span>
                    <span>db row id: {res.id}</span>
                    <span>cosine distance: {(1 - res.similarity).toFixed(4)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Comparison note */}
        <div className="mt-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/10 flex flex-col gap-2">
          <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
            Week 2 vs Week 3 Comparison
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 leading-relaxed">
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-teal-400">Week 2 — In-Memory</span>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Vectors stored in React state (RAM only)</li>
                <li>Lost on page refresh</li>
                <li>Cosine math runs in browser JS</li>
                <li>Cannot scale beyond current session</li>
              </ul>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="font-bold text-violet-400">Week 3 — pgvector / Supabase</span>
              <ul className="list-disc list-inside space-y-1 text-slate-500">
                <li>Vectors persisted in PostgreSQL</li>
                <li>Survives restarts, accessible to any client</li>
                <li>Cosine math runs in the database engine</li>
                <li>Can index millions of rows with HNSW/IVFFlat</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
