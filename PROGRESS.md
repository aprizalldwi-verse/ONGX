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

## Phase 4 — AniList adapter ✅

- [x] GraphQL client AniList + Zod (media, streamingEpisodes, relations) + rate limit 90 req/60 s
- [x] `AniListAdapter`: `trending`, `listing`, `search`, `detail`, `genres`, `offers`,
      `parseRemoteRef` + registri adapter (`Source.ANILIST`)
- [x] Normalisasi: `titleId` = romaji, `titleEn` = english, `titleNative` = native,
      `averageScore/10`, `duration*60`, `format MOVIE` → `MOVIE` (selain itu `SERIES`)
- [x] Genre dipetakan ke slug kanonik + `anime` otomatis; `streamingEpisodes` → `Episode`
      (fallback `Episode N`), hanya musim 1
- [x] `offers` AniList dari `externalLinks` tipe `STREAMING` (region `WW`, YouTube `FREE`) —
      ASUMSI-034
- [x] `pnpm catalog:sync` (TMDB + AniList, `--limit`/`--tmdb`/`--anilist`/`--force`, skip <24 jam,
      `Promise.allSettled` untuk discovery parsial)
- [x] Sync offer TMDB via `/movie|tv/{id}/watch/providers` region ID (ASUMSI-035)
- [x] Sinkronisasi katalog: **201 judul / 3.392 episode / 335 offer** (TMDB 59 judul ber-offer,
      AniList 68 judul ber-offer; contoh: One Piece → Netflix, Vidio, Crunchyroll)
- [x] Gate: lint, typecheck, test, build hijau

Catatan Phase 4:

- AniList tidak punya ketersediaan per region; offer memakai region sentinel `WW` dan tautan resmi
  dari `externalLinks`. Keputusan: `DECISIONS.md` ASUMSI-034.
- `pnpm catalog:sync` membaca `apps/web/.env.local` lewat `dotenv-cli`; skrip memakai alias `@/`
  dan tidak boleh mengimpor `server-only`.
- `--force` dipakai saat menambah field baru (mis. offer) agar baris yang belum 24 jam tetap
  diperbarui. Timeout jaringan TMDB (10 s) di sandbox bisa membuat sebagian halaman discovery
  gagal; sync tetap jalan dan counter `failed` mencatatnya.

## Phase 5 — Pages + player ✅

- [x] Read model `lib/titles/{view,queries,paths,filters}.ts` + helper path
      (`titlePath`, `watchPath`, `episodePath`)
- [x] Halaman listing `/film`, `/series`, `/anime` (filter genre/tahun/sort, pagination) +
      `/trending`, `/baru`, `/genre/[slug]`
- [x] Home: hero popularitas + 8 rail (trending, baru, rating, anime, film, series, aksi, komedi),
      tiap rail di balik `Suspense` + skeleton berukuran sama, rail kosong disembunyikan
- [x] Detail `/film|/series|/anime/[slug]`: sinopsis, cast/crew, genre, offer resmi, trailer,
      daftar episode, share, report
- [x] Episode `/series/[slug]/s/[s]/e/[e]` + `/anime/[slug]/s/[s]/e/[e]` (prev/next + daftar musim)
- [x] `/orang/[slug]` (karya cast/crew) + `/watch/[id]?s=&e=`
- [x] Player HLS.js (quality, subtitle, volume, PiP, fullscreen, resume) — hanya untuk
      `Source.OWN` + `streamUrl`; judul metadata-only menampilkan trailer + offer (ASUMSI-026)
- [x] Continue-watching device-local (`ongx:continue`, min 10 s, buang ≥95 %, maks 20)
- [x] `POST /api/report` (Zod, rate limit Redis 5/10 menit per IP, fail-open)
- [x] `loading.tsx` / `error.tsx` / `not-found.tsx` untuk setiap rute publik baru
- [x] Playwright smoke (4 skenario: home → detail, trailer + report, episode → watch, serta
      player HLS lokal + klik offer provider)
- [x] 20 file / 149 unit test web + 167 test seluruh workspace
- [x] Gate: lint, typecheck, test, build, format:check hijau

Catatan Phase 5:

- Data produksi belum punya `Source.OWN`/`streamUrl`, jadi semua CTA watch jatuh ke trailer +
  panel offer kosong. E2E membuat fixture `Source.OWN` sementara (judul + offer) di `globalSetup`
  dan menghapusnya di `globalTeardown`; player memutar master playlist lokal
  `public/test/fixtures/hls/master.m3u8`.
- Player memilih hls.js selama MSE tersedia (quality/subtitle), native HLS hanya fallback iOS —
  ASUMSI-032.
- Slug tak dikenal masih mengembalikan HTTP 200 dengan UI 404 (ASUMSI-009b, Phase 8).
- E2E memakai Chrome sistem di mesin dev (unduhan Chromium diblokir) dan memblokir
  `/_next/image` agar koneksi gambar yang menggantung tidak menahan navigasi — ASUMSI-030.

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
