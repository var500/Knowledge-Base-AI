"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  UIMessage,
  TextUIPart,
  SourceDocumentUIPart,
} from "ai";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

type MyUIDataTypes = {
  step: { step: number };
};

type MyUIMessage = UIMessage<unknown, MyUIDataTypes>;

type Source = {
  sourceFile: string;
  chunkIndex: number;
  chunkMode: string;
  similarity: number;
  content: string;
};

type KBFile = {
  name: string;
  chunkCount: number;
  createdAt: string;
};

// ─── Pipeline Step Component ──────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { label: "Embed Query", sub: "text-embedding-3-small", color: "sky" },
  { label: "Search pgvector", sub: "<=> cosine distance", color: "violet" },
  { label: "Inject Context", sub: "system prompt", color: "amber" },
  { label: "Stream Answer", sub: "gpt-4o-mini", color: "teal" },
];

function PipelineViz({
  active,
  currentStep,
}: {
  active: boolean;
  currentStep: number;
}) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {PIPELINE_STEPS.map((step, i) => {
        const isCurrent = active && currentStep === i;
        const isCompleted = active && currentStep > i;

        let borderClass = "border-slate-800 bg-slate-900/30 text-slate-500";
        let textClass = "text-slate-500";

        if (isCurrent) {
          borderClass =
            "border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/10 animate-pulse";
          textClass = "text-violet-300 font-bold";
        } else if (isCompleted) {
          borderClass = "border-teal-500/50 bg-teal-500/10";
          textClass = "text-teal-300";
        }

        return (
          <div key={step.label} className="flex items-center">
            <div
              className={`flex flex-col items-center px-3 py-2 rounded-xl border text-center transition-all duration-300 min-w-27.5 ${borderClass}`}
            >
              <span
                className={`text-[10px] font-mono tracking-wider transition-colors ${textClass}`}
              >
                {step.label} {isCompleted && "✓"}
              </span>
              <span className="text-[9px] text-slate-600 mt-0.5">
                {step.sub}
              </span>
              {isCurrent && (
                <div className="flex gap-0.5 mt-1.5">
                  {[0, 1, 2].map((j) => (
                    <div
                      key={j}
                      className="w-1 h-1 bg-violet-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${j * 150}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <div
                className={`h-px w-6 shrink-0 transition-colors duration-300 ${
                  isCompleted
                    ? "bg-teal-500/50"
                    : isCurrent
                      ? "bg-violet-500/30"
                      : "bg-slate-800"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Source Card ──────────────────────────────────────────────────────────────

function SourceCard({ source, rank }: { source: Source; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.round(source.similarity * 100);

  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] font-mono font-bold text-slate-500 shrink-0">
            #{rank}
          </span>
          <span className="text-[10px] font-mono text-violet-300 truncate">
            {source.sourceFile}
          </span>
          <span className="text-[9px] text-slate-600 shrink-0">
            chunk {source.chunkIndex + 1}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-400 rounded-full"
              style={{ width: `${Math.max(pct, 5)}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-violet-400">{pct}%</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-550 leading-relaxed whitespace-pre-wrap">
        {expanded ? source.content : `${source.content.slice(0, 150)}...`}
      </p>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="text-[9px] text-slate-500 hover:text-slate-400 cursor-pointer text-left transition-colors"
      >
        {expanded ? "Show less ↑" : "Show full chunk ↓"}
      </button>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: MyUIMessage }) {
  const [showSources, setShowSources] = useState(true);
  const isUser = message.role === "user";

  // In AI SDK v6, sources and text are streamed as part of message.parts
  const sources: Source[] = message.parts
    ? message.parts
        .filter((part) => part.type === "source-document")
        .map((part) => {
          const docPart = part as SourceDocumentUIPart;
          const ragData = docPart.providerMetadata?.rag as
            | {
                content: string;
                chunkIndex: number;
                chunkMode: string;
                similarity: number;
              }
            | undefined;
          return {
            sourceFile: docPart.title || docPart.filename || "Unknown file",
            chunkIndex: ragData?.chunkIndex ?? 0,
            chunkMode: ragData?.chunkMode ?? "chars",
            similarity: ragData?.similarity ?? 0.0,
            content: ragData?.content ?? "",
          };
        })
    : [];

  const textPart = message.parts
    ? message.parts
        .filter((part) => part.type === "text")
        .map((part) => (part as TextUIPart).text)
        .join("")
    : "";

  return (
    <div
      className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}
    >
      {/* Role label */}
      <span className="text-[10px] font-mono text-slate-600 px-1">
        {isUser ? "YOU" : "KNOWLEDGE BASE AI"}
      </span>

      {/* Bubble */}
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-violet-500/20 border border-violet-500/30 text-slate-200 rounded-tr-sm"
            : "bg-slate-900/60 border border-slate-800 text-slate-200 rounded-tl-sm"
        }`}
      >
        {textPart || (
          <span className="flex gap-1 items-center text-slate-500">
            <span className="animate-bounce" style={{ animationDelay: "0ms" }}>
              •
            </span>
            <span
              className="animate-bounce"
              style={{ animationDelay: "150ms" }}
            >
              •
            </span>
            <span
              className="animate-bounce"
              style={{ animationDelay: "300ms" }}
            >
              •
            </span>
          </span>
        )}
      </div>

      {/* Sources (only for assistant messages) */}
      {!isUser && sources.length > 0 && (
        <div className="max-w-[85%] w-full flex flex-col gap-1.5">
          <button
            onClick={() => setShowSources((s) => !s)}
            className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 hover:text-slate-400 cursor-pointer transition-colors"
          >
            <div className="w-3 h-3 rounded border border-slate-700 flex items-center justify-center text-[8px]">
              {showSources ? "−" : "+"}
            </div>
            {sources.length} source{sources.length !== 1 ? "s" : ""} retrieved
            from pgvector
          </button>
          {showSources && (
            <div className="grid grid-cols-1 gap-1.5">
              {sources.map((src, i) => (
                <SourceCard
                  key={`${src.sourceFile}-${src.chunkIndex}`}
                  source={src}
                  rank={i + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RAGPage() {
  const [files, setFiles] = useState<KBFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [currentStep, setCurrentStep] = useState<number>(-1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat<MyUIMessage>({
    transport: new DefaultChatTransport({
      api: "/api/rag",
    }),
    onData: (dataPart) => {
      if (dataPart.type === "data-step") {
        setCurrentStep(dataPart.data.step);
      }
    },
    onFinish: () => {
      setCurrentStep(-1);
    },
    onError: () => {
      setCurrentStep(-1);
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Knowledge base CRUD ────────────────────────────────────────────────────

  const loadKnowledgeBase = useCallback(async (shouldSetLoading = false) => {
    if (shouldSetLoading) {
      setLoadingFiles(true);
    }
    try {
      const res = await fetch("/api/chunks");
      const data = await res.json();

      // Group rows by sourceFile
      const map = new Map<string, { count: number; createdAt: string }>();
      for (const row of data.rows ?? []) {
        if (!map.has(row.sourceFile)) {
          map.set(row.sourceFile, { count: 0, createdAt: row.createdAt });
        }
        map.get(row.sourceFile)!.count++;
      }

      setFiles(
        Array.from(map.entries()).map(([name, info]) => ({
          name,
          chunkCount: info.count,
          createdAt: info.createdAt,
        })),
      );
    } catch {
      // silently fail if DB not connected
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    async function initKnowledgeBase() {
      try {
        const res = await fetch("/api/chunks");
        const data = await res.json();
        if (!active) return;

        const map = new Map<string, { count: number; createdAt: string }>();
        for (const row of data.rows ?? []) {
          if (!map.has(row.sourceFile)) {
            map.set(row.sourceFile, { count: 0, createdAt: row.createdAt });
          }
          map.get(row.sourceFile)!.count++;
        }

        setFiles(
          Array.from(map.entries()).map(([name, info]) => ({
            name,
            chunkCount: info.count,
            createdAt: info.createdAt,
          })),
        );
      } catch {
        // silently fail if DB not connected
      } finally {
        if (active) {
          setLoadingFiles(false);
        }
      }
    }

    initKnowledgeBase();

    return () => {
      active = false;
    };
  }, []);

  const handleFileUpload = async (file: File) => {
    const allowed = [".md", ".txt", ".mdx"];
    if (!allowed.some((ext) => file.name.endsWith(ext))) {
      setUploadError("Only .md, .mdx, and .txt files are supported.");
      return;
    }
    if (file.size > 500_000) {
      setUploadError("File must be smaller than 500 KB.");
      return;
    }

    setUploading(true);
    setUploadError("");
    setUploadStatus(`Reading ${file.name}…`);

    try {
      const content = await file.text();
      setUploadStatus(`Chunking & embedding ${file.name}…`);

      const res = await fetch("/api/chunks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: content,
          sourceFile: file.name,
          chunkSize: 500,
          mode: "chars",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUploadStatus(`✓ ${data.inserted} chunks saved`);
        await loadKnowledgeBase(true);
        setTimeout(() => setUploadStatus(""), 3000);
      } else {
        setUploadError(data.error || "Upload failed.");
        setUploadStatus("");
      }
    } catch (e) {
      setUploadError((e as Error).message);
      setUploadStatus("");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (name: string) => {
    setDeletingFile(name);
    try {
      await fetch(`/api/chunks?source=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (selectedFile === name) setSelectedFile(null);
      await loadKnowledgeBase(true);
    } finally {
      setDeletingFile(null);
    }
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  // ── Form Submit ────────────────────────────────────────────────────────────

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    setCurrentStep(0);
    sendMessage({ text: input }, { body: { sourceFile: selectedFile } });
    setInput("");
  };

  const handleQuickQuestion = (q: string) => {
    if (isLoading) return;
    setCurrentStep(0);
    sendMessage({ text: q }, { body: { sourceFile: selectedFile } });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen bg-[#07090e] text-slate-100 flex flex-col overflow-hidden">
      {/* Background glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 left-[20%] w-[50%] h-[30%] bg-violet-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-[10%] w-[30%] h-[30%] bg-teal-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-slate-950/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight bg-linear-to-r from-violet-300 to-teal-400 bg-clip-text text-transparent">
              Knowledge Base AI
            </span>
            <span className="text-[9px] font-mono text-slate-500 tracking-widest">
              WEEK 4 — RAG PIPELINE
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="/"
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-all"
          >
            ← Embeddings
          </Link>
          <Link
            href="/db-search"
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-all"
          >
            DB Search
          </Link>
          <Link
            href="/rag"
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800 transition-all"
          >
            RAG Chat
          </Link>
        </nav>
      </header>

      {/* Main Layout */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        {/* LEFT: Knowledge Base Sidebar */}
        <aside className="w-72 shrink-0 border-r border-slate-800/80 flex flex-col bg-slate-950/20 backdrop-blur-xl">
          <div className="px-4 py-3 border-b border-slate-800/60">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Knowledge Base
            </h2>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {files.length} file{files.length !== 1 ? "s" : ""} ·{" "}
              {files.reduce((a, f) => a + f.chunkCount, 0)} chunks
            </p>
          </div>

          {/* Drop zone */}
          <div
            className={`mx-3 mt-3 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
              dragOver
                ? "border-violet-400 bg-violet-500/10"
                : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/30"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center gap-1.5 py-4 px-3 text-center">
              {uploading ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-violet-400"
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
                  <span className="text-[10px] text-violet-400">
                    {uploadStatus}
                  </span>
                </>
              ) : uploadStatus ? (
                <>
                  <svg
                    className="w-5 h-5 text-teal-400"
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
                  <span className="text-[10px] text-teal-400">
                    {uploadStatus}
                  </span>
                </>
              ) : (
                <>
                  <svg
                    className="w-6 h-6 text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                    />
                  </svg>
                  <span className="text-[10px] text-slate-550">
                    Drop .md / .txt files
                  </span>
                  <span className="text-[9px] text-slate-600">
                    or click to browse
                  </span>
                </>
              )}
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.mdx,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                handleFileUpload(f);
                e.target.value = "";
              }
            }}
          />

          {uploadError && (
            <p className="mx-3 mt-1.5 text-[10px] text-red-400 px-2 py-1 bg-red-500/10 rounded-lg border border-red-500/20">
              {uploadError}
            </p>
          )}

          {/* File list */}
          <div className="flex-1 overflow-y-auto mt-3 px-3 flex flex-col gap-1.5">
            {loadingFiles ? (
              <div className="flex flex-col gap-1.5 mt-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-slate-900/40 animate-pulse border border-slate-800"
                  />
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center gap-2 mt-8 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-650 text-lg">
                  📄
                </div>
                <p className="text-[10px] text-slate-600">
                  No documents yet.
                  <br />
                  Upload a file to get started.
                </p>
              </div>
            ) : (
              <>
                {/* "All files" option */}
                <button
                  onClick={() => setSelectedFile(null)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedFile === null
                      ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                      : "border-slate-800 text-slate-550 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  <span className="text-[10px] font-mono">🌐</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-semibold truncate">
                      All documents
                    </span>
                    <span className="text-[9px] text-slate-600">
                      {files.reduce((a, f) => a + f.chunkCount, 0)} total chunks
                    </span>
                  </div>
                </button>

                {files.map((file) => (
                  <div
                    key={file.name}
                    className={`flex items-start gap-2 px-3 py-2.5 rounded-xl border transition-all group ${
                      selectedFile === file.name
                        ? "bg-violet-500/15 border-violet-500/40"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <button
                      className="flex-1 flex flex-col gap-0.5 text-left cursor-pointer min-w-0"
                      onClick={() =>
                        setSelectedFile(
                          selectedFile === file.name ? null : file.name,
                        )
                      }
                    >
                      <span
                        className={`text-[11px] font-semibold truncate ${
                          selectedFile === file.name
                            ? "text-violet-300"
                            : "text-slate-300"
                        }`}
                      >
                        📄 {file.name}
                      </span>
                      <span className="text-[9px] text-slate-600">
                        {file.chunkCount} chunk
                        {file.chunkCount !== 1 ? "s" : ""}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.name)}
                      disabled={deletingFile === file.name}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all cursor-pointer p-0.5 mt-0.5"
                      title="Delete file"
                    >
                      {deletingFile === file.name ? (
                        <svg
                          className="animate-spin h-3 w-3"
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
                      ) : (
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* RAG flow legend */}
          <div className="px-3 py-3 border-t border-slate-800/60 mt-2">
            <p className="text-[9px] font-mono text-slate-650 uppercase tracking-widest mb-1.5">
              RAG Pipeline
            </p>
            <div className="flex flex-col gap-1">
              {[
                "1. Embed query",
                "2. Search pgvector",
                "3. Inject context",
                "4. Stream answer",
              ].map((step) => (
                <div key={step} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-violet-500/50 shrink-0" />
                  <span className="text-[9px] text-slate-600">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* RIGHT: Chat Interface */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Pipeline visualizer */}
          <div className="px-6 py-2.5 border-b border-slate-800/60 bg-slate-950/20 backdrop-blur-xl shrink-0">
            <PipelineViz active={isLoading} currentStep={currentStep} />
          </div>

          {/* Filter badge */}
          {selectedFile && (
            <div className="flex items-center gap-2 px-6 py-1.5 bg-violet-500/5 border-b border-violet-500/10 shrink-0">
              <span className="text-[10px] font-mono text-violet-400">
                Searching only: {selectedFile}
              </span>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-[10px] text-slate-600 hover:text-slate-400 cursor-pointer"
              >
                ✕ clear
              </button>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500/20 to-teal-500/20 border border-violet-500/20 flex items-center justify-center text-2xl">
                  🧠
                </div>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-bold text-slate-200">
                    {files.length === 0
                      ? "Upload documents to start"
                      : "Ask anything about your documents"}
                  </h2>
                  <p className="text-sm text-slate-500 max-w-md">
                    {files.length === 0
                      ? "Drop markdown or text files into the sidebar. They'll be chunked, embedded, and stored in your pgvector database."
                      : "Questions are answered strictly from your uploaded documents. Sources are shown for every response."}
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {[
                      "What is this document about?",
                      "Summarise the key points",
                      "What are the main concepts?",
                      "Give me 3 important takeaways",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQuickQuestion(q)}
                        className="px-3 py-1.5 rounded-full text-xs border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all cursor-pointer"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-6 py-4 border-t border-slate-800/60 bg-slate-950/40 backdrop-blur-xl shrink-0">
            <form onSubmit={handleFormSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    files.length === 0
                      ? "Upload documents first…"
                      : "Ask a question about your documents…"
                  }
                  disabled={isLoading || files.length === 0}
                  className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-violet-500 rounded-2xl px-5 py-3.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500/30 placeholder:text-slate-650 transition-all disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !input.trim() || files.length === 0}
                className={`px-5 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all border ${
                  isLoading || !input.trim() || files.length === 0
                    ? "bg-slate-800 border-slate-750 text-slate-500 cursor-not-allowed"
                    : "bg-linear-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 border-transparent text-white cursor-pointer hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02]"
                }`}
              >
                {isLoading ? (
                  <svg
                    className="animate-spin h-4 w-4"
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
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                )}
                {isLoading ? "Thinking…" : "Ask"}
              </button>
            </form>

            {/* Clear chat */}
            {messages.length > 0 && !isLoading && (
              <button
                onClick={() => setMessages([])}
                className="mt-2 text-[10px] text-slate-600 hover:text-slate-400 cursor-pointer transition-colors"
              >
                Clear conversation
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
