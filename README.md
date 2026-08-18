# MyHelpa — AI Job Search Co-pilot

An AI-powered job-search co-pilot that doesn't just find visa-sponsoring roles — it manages the entire application lifecycle.

## Features

- **Job Discovery Engine** — Two freshness layers: daily email alerts + monthly CSV cross-referencing
- **Requirement Extraction** — Claude-powered JD parsing with confidence scores
- **Document Vault** — Version-controlled documents with checksums
- **Tailoring Engine** — AI-generated drafts with full provenance tracking
- **Application Tracker** — Kanban board + funnel analytics
- **Immigration Intelligence** — Deterministic CRS calculation against versioned rules
- **Interview Scheduler** — Calendar assistant (propose/approve/book)
- **Background Jobs** — Supabase-backed job queue with retry/backoff

## Tech Stack

- **Frontend**: Next.js (App Router) + Tailwind CSS
- **Database**: Supabase (PostgreSQL + RLS)
- **AI**: Claude API (extraction, tailoring, explanation)
- **Background Jobs**: Supabase-backed `jobs` table + worker
- **Hosting**: Vercel

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Anthropic keys

# Run development server
npm run dev

# Build for production
npm run build
```

## Database Setup

1. Create a Supabase project at https://supabase.com
2. Run the migration in `supabase/migrations/001_initial_schema.sql`
3. Copy your Supabase URL and anon key to `.env.local`

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Dashboard
│   ├── jobs/               # Job listings and filters
│   ├── applications/       # Application tracker
│   ├── documents/          # Document vault
│   ├── immigration/        # Immigration pathway tracker
│   └── api/cron/           # Vercel cron endpoint
├── components/             # React components
│   ├── navigation.tsx      # Main navigation
│   ├── dashboard-stats.tsx # Dashboard statistics
│   ├── review-queue.tsx    # Needs-your-review queue
│   └── ...
├── lib/                    # Utility functions
│   ├── supabase.ts         # Browser Supabase client
│   ├── supabase-server.ts  # Server Supabase client
│   ├── utils.ts            # Utility helpers
│   └── jobs/               # Job processing logic
│       ├── parser.ts       # CSV parser & normalizer
│       ├── dedup.ts        # Deduplication logic
│       └── worker.ts       # Background job worker
└── types/                  # TypeScript types
    └── database.ts         # Database schema types
```

## Roadmap

| Phase | Scope |
|-------|-------|
| 0 | Data pipeline validation — Ingest Job Bank CSV + LMIA list |
| 1 | Profile + matching — Profile schema, hard-filter + ranking |
| 2 | Application tracker — Save → application → status → next action |
| 3 | Document vault — documents/document_versions, basic validation |
| 4 | Requirement extraction — Claude JD parsing with confidence |
| 5 | Tailoring engine — Draft generation with generation_runs tracking |
| 6 | Observer — Deterministic rule engine, notification/nudge layer |
| 7 | Immigration intelligence — Versioned ruleset, deterministic CRS |
| 8 | Scheduling — Calendar assistant (propose/approve/book) |
| 9 | Browser extension — Manual capture tool |
| 10 | Optional expansion — Public content/SEO, multi-tenant |

## Security

- Row Level Security (RLS) on every user-scoped table
- OAuth tokens (Calendar, Gmail) server-side only
- Basic file-type/size validation on upload
- Encryption at rest, signed time-limited URLs

## License

Private — All rights reserved.
