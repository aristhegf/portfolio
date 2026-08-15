# Portfolio

A personal portfolio for a multi-skill maker — video editing, ebook design, websites, graphic
design, branding, and writing — catalogued **by skill and by year**, with a content backend you
manage yourself.

- **Frontend** — [Astro](https://astro.build) (server-rendered on Vercel)
- **Backend / CMS** — [Sanity](https://www.sanity.io), admin studio at `/studio`
- **Design** — monochrome editorial, day/night toggle, lots of whitespace

## Quick start

```bash
pnpm install
cp .env.example .env     # then fill in your Sanity details
pnpm dev
```

`pnpm dev` runs **both** the site and the content studio — the studio lives at
**`/studio`** on the same server. There is no separate Sanity server to start.

## 1. Create your Sanity project

You need a free Sanity account. Two options:

**Option A — CLI (recommended):**

```bash
pnpm sanity init
```

- Choose **"Create new project"** (or link an existing one).
- Pick a project name, use the default dataset `production`.
- When asked, **reuse the existing configuration** (it will just fill in your
  `projectId`/`dataset` into `.env`).
- The schema in `sanity/` is already written — you do not need to add types.

**Option B — manual:**

1. Create a project at https://www.sanity.io/manage
2. Copy its **Project ID** and **dataset name** into `.env`:

```bash
SANITY_PROJECT_ID=your-project-id
SANITY_DATASET=production
SITE_URL=https://your-site.vercel.app
```

## 2. First publish

> The studio is served by the Astro dev server itself — open
> **http://localhost:4321/studio** while `pnpm dev` is running and sign in.
> (For local-only development, `pnpm sanity dev` also works, but `/studio` is
> the single entry point — one server, one URL.)

1. Open the studio at **http://localhost:4321/studio** (start the server first).
2. Create at least one **Skill / Category** first: `Video Editing`, `Ebook Design`,
   `Websites`, `Graphic Design`, `Branding`, `Writing` — plus any you want.
3. Create a **Site settings** document (your name, headline, email, socials, profile image).
4. Add your first **Project**. The category and year fields drive the filters.

> Tip: the Writing skill is what powers the `/writing` page. Anything with the
> `Writing` category shows up there as a poem/article/essay.

## 3. Deploy to Vercel

1. Push this folder to a Git repo (GitHub/GitLab).
2. In Vercel, **New Project** → import the repo.
3. Vercel detects `pnpm` automatically.
4. Add the environment variables in **Settings → Environment Variables**:
   `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SITE_URL`.
5. Deploy.

Because the site is server-rendered, **edits in Sanity go live immediately** — no redeploys
needed.

### Allow Vercel to read your Sanity data (CORS)

In https://www.sanity.io/manage → your project → **API → CORS origins**, add your deployed URL
and `http://localhost:4321` (method: `GET`). The studio login also needs the URL you open it at
to be listed.

## Content model

| Type | Purpose | Key fields |
| --- | --- | --- |
| `category` | A skill (Video Editing, Writing, …) | name, slug, description, order |
| `project` | Any piece of work | title, category, **year**, cover, gallery, video link, live link, body, tags, featured |
| `settings` | Single site-wide document | name, headline, bio, email, location, socials |

## Project fields explained

- **Category + Year** — power the skill/year filters on `/work`.
- **Video link** — paste a YouTube/Vimeo URL or a direct `.mp4` link; it embeds on the page.
- **Cover image** — ~4:3 works best for cards.
- **Body** — project description, or the full text of a poem/article.
- **Featured** — promoted to the top of the home page "Selected work".

## Day / night

The toggle in the nav saves to `localStorage`; first-time visitors get their OS preference.
Colors and tokens live in `src/styles/global.css` (`:root` / `:root[data-theme='dark']`).

## Working on Windows (WSL)

If `pnpm install` is extremely slow on a `/mnt/c` drive, the project includes an `.npmrc` that
keeps the heavy pnpm store on the native Linux filesystem. Vercel is unaffected (it installs
fresh on its own infrastructure).

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Dev server on http://localhost:4321 |
| `pnpm build` | Production build |
| `pnpm preview` | Preview the production build locally |
| `pnpm typecheck` | Type-check with `astro check` |
| `pnpm sanity` | Run Sanity CLI commands |
