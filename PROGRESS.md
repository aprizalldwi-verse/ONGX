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
- Belum ada commit Git (repo di-init, working tree belum di-commit).

## Phase 2 — Database

- [ ] (belum)

## Phase 3 — TMDB adapter

- [ ] (belum)

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
