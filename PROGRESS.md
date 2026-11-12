# PROGRESS

Diperbarui setiap fase selesai. Gate per fase: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.

## Phase 1 — Scaffold ✅

- [x] pnpm workspace + toolchain (ESLint 9 flat, Prettier, Husky, lint-staged)
- [x] `packages/shared` (format, slug, tipe dasar) + unit test — 14 tests
- [x] `packages/ui` (button, skeleton, dialog, sheet, toaster)
- [x] `apps/web`: tokens, font, wordmark, header, bottom nav, skip link
- [x] next-intl 4 + `messages/{id,en}.json` + middleware locale
- [x] `src/lib/env.ts` Zod + fail-fast
- [x] Tema cookie (dark default, tanpa FOUC)
- [x] Stub rute + `loading.tsx` / `error.tsx` / `not-found.tsx`
- [x] Gate: lint, typecheck, test, build hijau

Catatan Phase 1:

- 17 rute publik + 33 halaman ter-prerender (id/en).
- URL tak dikenal mengembalikan HTTP 404 dengan halaman ber-CSS (lihat `DECISIONS.md` ASUMSI-009).
- `notFound()` dari halaman streaming masih 200 (ASUMSI-009b) — diperbaiki di Phase 8.
- Docker belum terpasang di mesin dev; Phase 2 butuh Postgres/Redis.
- Commit awal: `86b2a54 chore: phase 1 scaffold`.

## Phase 2 — Database

- [x] `packages/db`: Prisma 6 schema (Title, Genre, TitleGenre, Person, Credit, WatchOffer,
      Episode, AdminUser, Redirect, SyncJob) + enum `Source`/`Kind`/`OfferType`/`CreditRole`
- [x] Migration awal `20261112000000_init` (SQL digenerate via `migrate diff`, tanpa DB hidup)
- [x] Seed idempotent: 24 genre (nama id+en) + admin dari `ADMIN_PASS`/`ADMIN_PASS_HASH`
- [x] Prisma client singleton (`@ongx/db`) + guard `server-only` di web
- [x] `/api/health` (DB + Redis, 200/503) + unit test laporan health
- [x] Terapkan migrasi ke Postgres lokal (Docker, `20261112000000_init` applied)
- [x] Jalankan seed + verifikasi `/api/health` = `ok`

Catatan Phase 2:

- Docker Desktop 4.99.0 + WSL2 dipasang; `docker compose up -d` menyalakan `ongx-postgres`
  (healthy) dan `ongx-redis` (healthy).
- Seed: 24 genre masuk; admin dilewati karena `ADMIN_PASS`/`ADMIN_PASS_HASH` masih kosong
  (diisi saat Phase 10).
- `/api/health` → `{"status":"ok","checks":{"database":"up","redis":"up"}}`.
- PostgreSQL 16 native di mesin dev dihentikan (Manual) agar port 5432 dipakai container
  (lihat `DECISIONS.md` ASUMSI-019).

## Phase 3 — TMDB adapter ✅

- [x] `@ongx/shared`: `NormalizedTitle`/`NormalizedGenre`/`NormalizedPerson`/`NormalizedOffer`,
      `CatalogAdapter`, `BrowseFilters`, `Page<T>`
- [x] `TmdbClient`: Zod-validated GET, read-through cache (Redis → memori), fixed-window rate
      limiter, retry 429/5xx/network dengan backoff + `Retry-After`, pemetaan error
- [x] Skema Zod subset payload TMDB (list, search, detail movie/TV, watch providers, genre)
- [x] Normalisasi ke domain: judul ID via `alternative_titles`, genre kanonik (24 seed + fallback),
      cast/crew terurut, trailer YouTube resmi, age rating per region, offers per region
- [x] `TmdbAdapter`: `trending`, `listing`, `search`, `detail`, `genres`, `offers` + `parseRemoteRef`
- [x] Upsert idempotent: Title/Genre/Person/Credit/WatchOffer + slug dedupe + `Redirect` saat slug
      berubah; `uniqueGenres`/`uniqueCredits` pure helper
- [x] Atribusi TMDB di footer (badge + notice resmi, i18n id/en)
- [x] 66 unit test web (fixture, tanpa jaringan) + live smoke opsional
- [x] Gate: lint, typecheck, test, build hijau

Catatan Phase 3:

- `TMDB_API_KEY` di mesin dev masih kosong, jadi `pnpm --filter @ongx/web tmdb:smoke` otomatis
  skip. Unit test memakai fixture dan tidak butuh key.
- Detail memakai satu panggilan dengan `append_to_response=alternative_titles,credits,videos,
  release_dates` (movie) / `content_ratings` (TV) — lihat `DECISIONS.md` ASUMSI-021.
- Cache TTL: listing 10 menit, detail 30 menit, genre 24 jam; budget 40 request / 10 detik.
- Phase 3 belum menyentuh UI katalog; halaman masih stub sampai Phase 5.

## Phase 4 — AniList adapter (opsional)

- [ ] (belum)

## Phase 5 — Pages + player

- [ ] (belum)

## Phase 6 — Search, filter, library

- [ ] (belum)

## Phase 7 — Ad engine

- [ ] (belum)

## Phase 8 — SEO

- [ ] Perbaiki status HTTP 404 (ASUMSI-009)

## Phase 9 — Worker

- [ ] (belum)

## Phase 10 — Admin

- [ ] (belum)

## Phase 11 — Hardening

- [ ] (belum)

## Phase 12 — Docs & deploy

- [ ] (belum)
