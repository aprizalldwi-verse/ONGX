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
- [x] Script `db:generate` / `db:migrate` / `db:deploy` / `db:reset` / `db:seed` / `db:studio`
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

## Vidio-first polish ✅

- [x] CTA offer Vidio memakai deep link pencarian resmi `https://www.vidio.com/search?q=<judul>`
      (menggantikan link agregat TMDB); offer Vidio ganda (langganan + iklan) didedupe jadi satu
      kartu — ASUMSI-036
- [x] Filter `provider=vidio` ("Tersedia di Vidio") di `/film`, `/series`, `/anime`, `/trending`,
      `/baru`, dan `/genre/[slug]`
- [x] Badge "Vidio" di poster card untuk judul yang punya offer Vidio
- [x] Rail "Tersedia di Vidio" di home (setelah trending, tautan ke `/trending?provider=vidio`)
- [x] 21 file / 164 unit test web (182 test seluruh workspace)
- [x] Gate: lint, typecheck, test, build, format:check hijau

Catatan Vidio-first:

- Deteksi offer Vidio memakai `providerName` case-insensitive atau `providerId` `489`/slug
  `vidio`, sehingga data TMDB (`Vidio`) dan AniList (`vidio`) sama-sama tertangkap.
- `titleCardSelect` mengambil maksimal satu offer Vidio per kartu untuk badge, sedangkan filter
  listing memakai relasi `offers.some`. Keduanya berbagi `vidioOfferWhere` di `queries.ts`.
- Data katalog saat ini hanya punya 2 judul dengan offer Vidio (One Piece, The Last Attack);
  rail tetap tampil dan filter mengembalikan hasil yang sama sampai sync berikutnya menambah judul.

## Phase 6 — Search, filter, library

- [x] Pencarian lintas sumber `/cari?q=` (SSR, `noindex`) + typeahead header (debounce 300 ms,
      navigasi keyboard, sheet di mobile)
- [x] `GET /api/search` (Zod `q` 2–80 karakter, rate limit Redis 120/menit per IP, cache Redis
      60 detik per locale, `cache-control: no-store`, `x-cache: hit|miss`, fail-open)
- [x] Pencocokan `contains` case-insensitive pada `titleId`/`titleEn`/`titleNative`, urut
      popularitas, maksimal 24 hasil (40 di query layer)
- [x] Filter desktop inline + sheet mobile yang berbagi satu form GET native (tutup sheet tanpa
      state klien, tetap berfungsi tanpa JavaScript)
- [x] Simpanan + playlist device-local (`ongx:saved`, `ongx:playlist`, Zod, maks 100) dengan
      tombol simpan/playlist di halaman detail
- [x] `/simpanan`, `/playlist`, `/riwayat` (riwayat memakai `ongx:continue`, progress + hapus)
- [x] `loading.tsx` / `error.tsx` / `not-found.tsx` tetap lengkap untuk rute baru
- [x] Playwright: typeahead → detail, kontrak API + cache, filter Vidio → simpan → playlist,
      riwayat ter-seed + hapus, sheet filter mobile, dan cek hydration tanpa console error
- [x] 23 file / 183 unit test web (201 test seluruh workspace)
- [x] Gate: lint, typecheck, test, build, format:check hijau; 10/10 e2e hijau

Catatan Phase 6:

- Library dan riwayat sepenuhnya device-local: tidak ada akun, tidak ada sinkronisasi server.
  Parser memvalidasi `localStorage` dan gagal dengan aman (data rusak = daftar kosong).
- Halaman daftar merender skeleton di server dan pass klien pertama (`entries === null`) lalu
  mengisi dari `localStorage`, sehingga tidak ada hydration mismatch.
- `/cari` tampil sebagai SSG di output build meski membaca `searchParams`; hasil query tetap
  dirender per request saat runtime (diverifikasi lewat e2e dan `next start`).
- Filter dan pencarian memakai submit GET native; `reset` memakai `<a>` biasa agar sheet mobile
  tertutup tanpa state tambahan.
- Rate limit pencarian dan laporan berbagi `lib/redis-fixed-window.ts`; validasi query dilakukan
  sebelum rate limit agar request cacat tidak memakan kuota.

## Phase 7 — Ad engine

- [x] `src/config/ads.ts`: zona dari env (`NEXT_PUBLIC_MT_*`) + master switch
      `NEXT_PUBLIC_ADS_ENABLED`; tidak ada zone id hardcoded di komponen
- [x] `<AdProvider>` satu instance di root layout: adapter `lazyOnload`, smart tag + push +
      vignette, popunder setelah `pointerdown` pertama
- [x] `<AdSlot variant="inline" | "in-grid" | "sticky-footer">` dengan tinggi terkunci
      250/300/100, `data-slot-id` unik, dan div kosong `hidden` saat disabled
- [x] Inline tiap 2 rail (maks 6), in-grid tiap 7 kartu, sticky footer di `/watch/[id]`
- [x] Dev: kotak garis putus-putus + label zona; production disabled: tinggi 0 (tanpa CLS)
- [x] Interstitial sekali per sesi di `/watch`: referrer internal, scroll > 1 viewport,
      `sessionStorage.ongx_int`, pause/mute/resume player
- [x] Rewarded 1080p: unlock 30 menit di `sessionStorage`, gate HLS.js mixed-quality;
      manifest high-only tidak dikunci; native HLS tanpa pemilih kualitas
- [x] Adblock nudge, `<noscript>` placeholder, `/ads.txt` dengan baris `# TODO`
- [x] 24 file / 187 unit test web (205 test seluruh workspace); e2e 12/12
- [x] Gate: lint, typecheck, test, build, format:check hijau

Catatan Phase 7:

- Live fill belum diverifikasi. Monetag harus menyetujui akun dan memberi zona + snippet
  per format; tanpa itu tidak ada klaim "slot terisi". Batas integrasinya
  `window.ongxAds` (`AdNetworkAdapter` di `src/lib/ads-client.ts`) yang dimuat dari
  `NEXT_PUBLIC_MT_ADAPTER_URL`; kontrak dan checklist verifikasi ada di `docs/ads.md`.
- Rewarded hanya diberikan saat adapter mengembalikan `completed`, bukan timer/close button.
  Ini juga mencegah kualitas tinggi terbuka hanya karena SDK gagal dimuat.
- E2E mode disabled membuktikan semua slot berukuran 0 dan tidak ada layout shift yang
  berasal dari `[data-slot-id]`; script adapter juga tidak dirender.
- `document.referrer` tidak berubah pada navigasi klien App Router, jadi marker
  `ongx:internal-nav` mencatat navigasi internal. Interstitial tetap butuh scroll melewati
  viewport pertama dan hanya tampil sekali per sesi.

## Phase 8 — SEO

- [x] Perbaiki status HTTP 404 (ASUMSI-009): `loading.tsx` hanya membungkus listing;
      detail/episode/genre/orang/watch tanpa boundary sehingga `notFound()` mengirim 404 asli
- [x] `src/lib/seo.ts`: `siteUrl`/`absoluteUrl`/`localizedPath`, canonical absolut,
      `hreflang` id/en/x-default, `clampDescription` 150–160 karakter, `pageMetadata`
- [x] `generateMetadata` per halaman dengan format `<Judul> — ONGX`; deskripsi 150–160
      karakter (fallback i18n saat sinopsis kosong/pendek)
- [x] JSON-LD `WebSite` + `SearchAction` (beranda), `Movie`/`TVSeries` + `AggregateRating` +
      `Person` (detail), `TVEpisode` + `TVSeason`/`TVSeries` + `VideoObject` (episode),
      `BreadcrumbList` (detail + episode), `Person` (profil orang)
- [x] Breadcrumb terlihat di detail dan episode, memakai label/urutan yang sama dengan JSON-LD
- [x] `opengraph-image.tsx` dinamis 1200×630 (beranda + detail film/series/anime); poster
      di-inline dengan timeout 2,5 detik dan fallback wordmark
- [x] Sitemap index + chunk `/sitemap/[n].xml` (maks 45.000 URL/chunk, `lastmod` dari
      `updatedAt`, hanya `status = LIVE`, hreflang per URL)
- [x] `robots.txt` (allow all, disallow `/admin` + `/api`, `Host`, `Sitemap`),
      `manifest.webmanifest`, `rss.xml` (50 judul terbaru), ikon SVG
- [x] Tabel `Redirect` dihormati sebagai 308 permanen / 302 sementara setelah slug meleset
      (ASUMSI-046)
- [x] `noindex` untuk hasil pencarian, `?page > 20`, `/watch`, dan halaman device-local
- [x] Gate: lint, typecheck, test (207 unit), build, format:check hijau; e2e 16/16
- [ ] Rich Results Test — manual, butuh URL publik (lihat catatan)

Catatan Phase 8:

- Akar masalah 404: setiap `loading.tsx` di atas halaman mengirim shell HTTP 200 lebih dulu,
  lalu `notFound()` hanya mengganti UI. Karena itu listing pindah ke route group
  `film/(list)`, `series/(list)`, `anime/(list)` yang punya `loading.tsx` sendiri, sedangkan
  detail/episode/genre/orang/watch tidak punya boundary. Halaman yang dikenal tetap 200,
  slug asing (termasuk varian `/en`) sekarang 404.
- Rich Results Test tidak bisa dijalankan lokal. Verifikasi otomatis menegaskan tipe JSON-LD
  yang dirender (`Movie`, `TVSeries`, `TVEpisode`, `VideoObject`, `BreadcrumbList`) dan e2e
  memeriksa canonical/hreflang/deskripsi/OG; validasi Google tetap langkah manual setelah
  deploy dengan `NEXT_PUBLIC_SITE_URL` produksi.
- `NEXT_PUBLIC_SITE_URL` di `.env.local` masih `http://localhost:3000`, jadi canonical,
  sitemap, `robots.txt`, dan RSS memakai origin lokal saat pengembangan. Produksi wajib
  mengisi origin asli atau semua URL absolut akan menunjuk localhost.
- `permanentRedirect` Next mengirim 308, bukan 301. Untuk crawler keduanya permanen; 308
  dipilih karena mempertahankan metode HTTP (ASUMSI-046). Redirect hanya dicek setelah
  lookup normal meleset, jadi jalur panas tidak menambah query.
- Sitemap saat ini 1 chunk / 5.777 URL. Chunk memakai query terpaginasi per sumber
  (statis → genre → judul → episode → orang) sehingga katalog besar tidak dimuat sekaligus.
- E2E sitemap mengambil 50 URL sampel dari chunk dan memastikan semuanya 200, plus index,
  robots, manifest, RSS, OG image, dan 404 slug asing.

## Phase 9 — Worker ✅

- [x] Pipeline sync diekstrak dari `scripts/catalog-sync.ts` ke `src/lib/sync/*` supaya CLI
      dan worker memakai kode yang sama (`catalog`, `offers`, `cleanup`, `counters`, logger)
- [x] BullMQ + ioredis: queue `ongx-jobs`, worker `apps/web/src/worker/main.ts`,
      concurrency dari `WORKER_CONCURRENCY` (1–8), prefix dari `WORKER_QUEUE_PREFIX`
- [x] Tiga jadwal berulang di-upsert saat boot (idempoten): `sync.catalog` (`0 2 * * *`),
      `sync.offers` (`0 */6 * * *`), `maintenance.cleanup` (`30 3 * * *`), cron UTC
- [x] Payload divalidasi Zod sebelum menyentuh DB/provider; job tak dikenal ditolak
- [x] Retry 3× exponential backoff (1/2/4 menit), completed disimpan 1 hari (maks 100),
      failed 7 hari (maks 500)
- [x] `sync.offers` memilih judul TMDB LIVE dengan `offersUpdatedAt` null/lebih tua dari
      batas, mengganti offer dalam transaksi hanya setelah fetch berhasil (offer lama tidak
      pernah terhapus saat provider error)
- [x] `maintenance.cleanup` menghapus `SyncJob` lebih tua dari `WORKER_RETENTION_DAYS`
- [x] Migrasi `20261115000000_add_offers_updated_at` + index
      `(source, status, offersUpdatedAt)`
- [x] Heartbeat Redis `ongx:worker:heartbeat` (TTL 45 detik); `/api/health` melaporkan
      `checks.worker` bila `WORKER_HEALTH_REQUIRED=true` dan menurunkan status ke `degraded`
      (bukan 503)
- [x] Graceful shutdown SIGINT/SIGTERM (drain worker, tutup queue/Redis, hapus heartbeat)
- [x] `pnpm worker` dan `pnpm worker:once --job=<nama>` untuk operasi manual
- [x] Gate: lint, typecheck, test (229 unit), build, format:check hijau

Catatan Phase 9:

- Worker ditempatkan di `apps/web` (bukan app/package terpisah) karena adapter TMDB/AniList,
  normalisasi, dan `upsertTitle` hidup di sana; memisahkan app akan memaksa refactor besar
  tanpa manfaat pada fase ini. Entry worker tidak diimpor route Next, jadi bundle web tidak
  berubah.
- Verifikasi runtime: worker berjalan, ketiga scheduler terdaftar di Redis, heartbeat terisi,
  `maintenance.cleanup` jalan, `sync.offers` me-refresh 2 judul (3 offer dari TMDB), dan
  `sync.catalog --tmdb=1 --anilist=1` memperbarui satu judul per sumber tanpa gagal.
- `tsx` masih devDependency. Image produksi Phase 12 harus menyertakan devDependencies atau
  mengompilasi worker terpisah; dicatat di README.
- `sync.offers` hanya untuk TMDB karena offer AniList menempel di payload `detail` dan sudah
  ikut `sync.catalog` (ASUMSI-034).

## Phase 10 — Admin

- [x] Sesi stateless: cookie `ongx_admin` HMAC-SHA256 (username + expiry, TTL 12 jam,
      `httpOnly`, `SameSite=Lax`, `Secure` di produksi) tanpa dependency baru; secret dari
      `ADMIN_SESSION_SECRET` (min 32 karakter) atau fallback `ADMIN_PASS_HASH`
- [x] Login bcrypt dengan dummy-hash anti-enumerasi, throttle Redis 10 percobaan / 15 menit per
      IP (fail-open), logout, dan banner bila panel belum dikonfigurasi
- [x] Guard `requireAdminSession` untuk seluruh panel, metadata `noindex`, halaman
      `force-dynamic` (login tidak lagi diprerender statis)
- [x] Dashboard: hitungan judul/laporan per status, status worker dari heartbeat, lima
      `SyncJob` terakhir, dan pintasan
- [x] Moderasi laporan: filter status + pagination, transisi `REVIEWING`/`RESOLVED`/`REJECTED`
- [x] Judul: pencarian + filter status/jenis/sumber, pagination; edit status untuk
      TMDB/AniList, edit penuh + `streamUrl` untuk `OWN` dengan validasi skema
- [x] Sinkronisasi: riwayat job + filter/pagination, status worker, dan trigger manual
      `sync.catalog` / `sync.offers` / `maintenance.cleanup` lewat BullMQ
- [x] i18n namespace `admin` di `id`/`en` (kunci identik), UI Indonesia-first + `/en`
- [x] Unit test baru (session token, validasi, schema, format) — total 270; e2e admin (guard,
      kredensial salah, moderasi, edit status, sync, `/en`, logout, noindex) — total 18
- [x] Gate: lint, typecheck, test, build, e2e, format:check hijau

Catatan Phase 10:

- Login manual di mesin dev membutuhkan secret sesi (`ADMIN_SESSION_SECRET` atau
  `ADMIN_PASS_HASH`) dan admin hasil seed (isi `ADMIN_PASS` di `.env.local`, jalankan
  `pnpm db:seed`, simpan hash yang dicetak). `.env.local` saat ini mengosongkan keduanya, jadi
  panel menampilkan status "belum dikonfigurasi" sampai diisi. E2E menyuntikkan secret lewat
  `webServer.env` dan membuat akun `e2e-admin` sementara.
- Trigger manual hanya mengantrekan job; eksekusi tetap membutuhkan `pnpm worker`. Tanpa Redis
  halaman menampilkan banner error dan tidak menulis apa pun.
- `streamUrl` hanya untuk `Source.OWN`; skema menolak `javascript:`, `//`, control character,
  dan nilai lebih dari 2.048 karakter (ASUMSI-056).
- Verifikasi runtime: `enqueueAdminJob("maintenance.cleanup")` mengembalikan `jobId` dari queue
  `ongx-jobs`; job uji dihapus lagi setelah verifikasi karena worker tidak dijalankan.

## Phase 11 — Hardening

- [ ] (belum)

## Phase 12 — Docs & deploy

- [ ] (belum)
