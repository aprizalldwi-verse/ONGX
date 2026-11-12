# ONGX

Portal katalog film, series, dan anime dengan UI Indonesia-first.
Metadata dari TMDB + AniList, pemutaran lewat provider resmi.

**Status:** Phase 2 (database). Lihat `PROGRESS.md`.

## Prasyarat

- Node 22+ (diuji di Node 24)
- pnpm 10 (`npm i -g pnpm`)
- Docker Desktop + WSL2 (Postgres 16 + Redis 7; wajib mulai Phase 2)

## Mulai

```bash
pnpm install
cp .env.example .env.local     # Windows: Copy-Item .env.example .env.local
docker compose up -d
pnpm db:deploy                 # terapkan migrasi
pnpm db:seed                   # 24 genre (+ admin bila ADMIN_PASS* diisi)
pnpm dev                       # http://localhost:3000
```

Catatan: bila ada PostgreSQL native yang memakai port 5432, hentikan dulu
(`Stop-Service postgresql-x64-16`) — kalau tidak, koneksi `localhost:5432` tidak sampai ke container
dan `db:deploy` gagal dengan P1000. Detail: `DECISIONS.md` ASUMSI-019.

## Perintah

```bash
pnpm dev          # dev server (apps/web)
pnpm build        # production build
pnpm lint         # ESLint semua workspace
pnpm typecheck    # tsc --noEmit semua workspace
pnpm test         # Vitest semua workspace
pnpm format       # Prettier

pnpm db:generate  # generate Prisma client
pnpm db:migrate   # prisma migrate dev (butuh Postgres hidup)
pnpm db:deploy    # prisma migrate deploy (produksi)
pnpm db:seed      # seed 24 genre + admin (idempotent)
pnpm db:studio    # Prisma Studio
```

Health check: `GET /api/health` — 200 `{status:"ok"|"degraded"}`, 503 bila DB/Redis down.

## Struktur

```
apps/web         Next.js 15 App Router
packages/db      Prisma schema, migration, seed
packages/ui      primitif shadcn/ui + util
packages/shared  tipe, util, format
docker-compose.yml
DECISIONS.md     asumsi & keputusan teknis
PROGRESS.md      checklist fase
```

## Lisensi konten

Proyek ini tidak menghosting video. Data katalog berasal dari TMDB (attribution wajib) dan
AniList; tombol tonton mengarah ke provider resmi.
