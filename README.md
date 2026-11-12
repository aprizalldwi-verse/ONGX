# ONGX

Portal katalog film, series, dan anime dengan UI Indonesia-first.
Metadata dari TMDB + AniList, pemutaran lewat provider resmi.

**Status:** Phase 1 (scaffold). Lihat `PROGRESS.md`.

## Prasyarat

- Node 22+ (diuji di Node 24)
- pnpm 10 (`npm i -g pnpm`)
- Docker Desktop (Postgres + Redis, dipakai mulai Phase 2)

## Mulai

```bash
pnpm install
cp .env.example .env.local     # Windows: Copy-Item .env.example .env.local
docker compose up -d           # opsional sampai Phase 2
pnpm dev                       # http://localhost:3000
```

## Perintah

```bash
pnpm dev          # dev server (apps/web)
pnpm build        # production build
pnpm lint         # ESLint semua workspace
pnpm typecheck    # tsc --noEmit semua workspace
pnpm test         # Vitest semua workspace
pnpm format       # Prettier
```

## Struktur

```
apps/web         Next.js 15 App Router
packages/ui      primitif shadcn/ui + util
packages/shared  tipe, util, format
docker-compose.yml
DECISIONS.md     asumsi & keputusan teknis
PROGRESS.md      checklist fase
```

## Lisensi konten

Proyek ini tidak menghosting video. Data katalog berasal dari TMDB (attribution wajib) dan
AniList; tombol tonton mengarah ke provider resmi.
