# Knowledge Base AI (Production-Grade RAG Pipeline)

This is a full-stack **Retrieval-Augmented Generation (RAG)** application built with Next.js 16, pgvector, Drizzle ORM, and Vercel AI SDK v6.

The application is structured as a 4-week progression playground:

- **Week 1**: Real-time AI data streaming using Next.js Server Actions.
- **Week 2**: Unstructured text chunking (character & token-based) and OpenAI vector coordinate math.
- **Week 3**: Database vector storage via Supabase + pgvector and raw SQL similarity search.
- **Week 4 (Capstone)**: End-to-end grounded RAG pipeline streaming answers to a premium chat interface.

---

## 🚀 Features

### 1. In-Memory Embeddings Playground (`/`)

- Interactively segment article templates using sliding boundary controls.
- Visualize 1,536-dimensional float coordinates mapped to a 384-cell glowing heat grid.
- Query chunks in-memory using vector dot products and cosine similarity math.

### 2. Database Vector Search (`/db-search`)

- Query stored document chunks directly from Supabase.
- Performs cosine similarity ranking in raw SQL using pgvector's `<=>` distance operator.
- Explains the exact SQL queries executed for educational reference.

### 3. Grounded RAG Chat (`/rag`)

- **Drag-and-Drop Markdown Upload**: Drag `.md` or `.txt` files to segment, embed, and store chunks instantly.
- **Dynamic RAG Stage Visualizer**: Animates in real-time as the query moves through the pipeline (Embed → Search → Inject → Stream).
- **Source Citation Cards**: Highlights the exact document chunk and similarity score supporting every statement.
- **Safe Guardrails**: AI answers are strictly grounded in document context and reject outside knowledge.

---

## 🛠️ Tech Stack

- **Core**: [Next.js 16](https://nextjs.org) (Turbopack) & React 19
- **AI Integrations**: [Vercel AI SDK v6](https://ai-sdk.dev) & `@ai-sdk/openai`
- **Model Space**: OpenAI `text-embedding-3-small` (1,536 dimensions) & `gpt-4o-mini`
- **Database**: PostgreSQL with `pgvector` (hosted on Supabase)
- **ORM & Driver**: [Drizzle ORM](https://orm.drizzle.team) & `postgres.js`
- **Tokenization**: `js-tiktoken` (`cl100k_base` encoder)
- **Styling**: TailwindCSS & Vanilla CSS (Dark mode glows & frosted glass layout)

---

## ⚙️ Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in the root of the project:

```bash
OPENAI_API_KEY="your-openai-api-key"
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

### 2. Prepare pgvector Extension

In your Supabase SQL Editor, enable the vector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Push Database Schema

Ensure all tables are applied using Drizzle:

```bash
pnpm db:push
```

### 4. Seed the Database

Chunk and embed `scripts/sample-article.txt` to populate the initial database index:

```bash
node --env-file=.env --experimental-strip-types scripts/seed.ts
```

### 5. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```
├── app/
│   ├── api/
│   │   ├── chunks/          # CRUD for document chunks & embeddings
│   │   ├── embed/           # OpenAI embeddings generation
│   │   ├── rag/             # AI SDK v6 streaming RAG handler
│   │   └── search/          # Cosine similarity SQL search
│   ├── db-search/           # pgvector search playground UI
│   ├── rag/                 # Grounded RAG Chat client UI
│   ├── layout.tsx
│   └── page.tsx             # In-memory embeddings playground UI
├── db/
│   ├── index.ts             # Drizzle instance connection
│   └── schema.ts            # doc_chunks table configuration
├── scripts/
│   ├── embed.ts             # CLI embeddings builder (Week 2 CLI)
│   ├── search.ts            # CLI vector distance query (Week 3 CLI)
│   ├── seed.ts              # Document seed script
│   └── sample-article.txt
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```
