# Environment reference

Semua proses (Next, Prisma CLI, skrip sync, worker, Playwright) membaca
**`apps/web/.env.local`**. File di root repo tidak dipakai. Mulai dari `.env.example`:

```bash
cp .env.example apps/web/.env.local
```

Nilai `NEXT_PUBLIC_*` **disematkan saat build**. Mengubahnya di server tanpa rebuild tidak
berpengaruh. Variabel lain dibaca saat runtime (kecuali `DATABASE_URL` yang juga dibutuhkan
saat build karena halaman ISR diprerender).

## Core

| Key | Scope | Wajib | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | runtime + build | ya | — | Postgres untuk Prisma Client. Contoh: `postgresql://ongx:ongx@localhost:5432/ongx?schema=public` |
| `DIRECT_URL` | migrasi | ya (sama) | — | Koneksi langsung untuk `prisma migrate`; boleh sama dengan `DATABASE_URL` |
| `REDIS_URL` | runtime | produksi | — | Cache pencarian, rate limit, BullMQ, heartbeat worker. Tanpa Redis: rate limit fail-open, cache mati, worker tidak jalan |
| `NEXT_PUBLIC_SITE_URL` | build + runtime | ya | `http://localhost:3000` | Origin publik tanpa trailing slash; dipakai canonical, sitemap, RSS, OG |
| `NODE_ENV` | runtime | tidak | `development` | `production` mengaktifkan HSTS dan mematikan `'unsafe-eval'` di CSP |

## Katalog

| Key | Scope | Wajib | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `TMDB_API_KEY` | sync + smoke | untuk sync | kosong | API key v3 TMDB. Unit test memakai fixture, jadi kosong tetap lolos gate |
| `TMDB_REGION` | sync + worker | tidak | `ID` | Kode negara dua huruf untuk watch providers dan rilis |

AniList tidak membutuhkan kunci. `pnpm catalog:sync` menarik TMDB + AniList; tanpa
`TMDB_API_KEY` hanya AniList yang berjalan.

## Iklan

| Key | Scope | Wajib | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_ADS_ENABLED` | build | tidak | `false` | `true`/`1` menampilkan slot; nilai lain menyembunyikan semua |
| `NEXT_PUBLIC_MT_ADAPTER_URL` | build | jika iklan | kosong | URL bridge akun (`window.ongxAds`), hanya http(s); origin-nya masuk CSP |
| `NEXT_PUBLIC_MT_SMART` | build | tidak | kosong | Zone smart tag |
| `NEXT_PUBLIC_MT_PUSH` | build | tidak | kosong | Zone in-page push |
| `NEXT_PUBLIC_MT_VIGNETTE` | build | tidak | kosong | Zone vignette |
| `NEXT_PUBLIC_MT_INTERSTITIAL` | build | tidak | kosong | Zone interstitial |
| `NEXT_PUBLIC_MT_POPUNDER` | build | tidak | kosong | Zone popunder |
| `NEXT_PUBLIC_MT_REWARDED` | build | tidak | kosong | Zone rewarded |
| `NEXT_PUBLIC_MT_NATIVE` | build | tidak | kosong | Zone native |

Zone kosong = format itu tidak dirender. Detail kontrak bridge dan verifikasi format ada di
`docs/ads.md`.

## Worker

| Key | Scope | Wajib | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `WORKER_CONCURRENCY` | worker | tidak | `2` | Job paralel per proses (1–8) |
| `WORKER_QUEUE_PREFIX` | worker | tidak | `ongx` | Prefix BullMQ; harus sama dengan web admin |
| `WORKER_HEALTH_KEY` | worker + web | tidak | `ongx:worker:heartbeat` | Key heartbeat Redis |
| `WORKER_HEARTBEAT_MS` | worker | tidak | `15000` | Interval heartbeat (5–60 detik) |
| `WORKER_CATALOG_CRON` | worker | tidak | `0 2 * * *` | Sync katalog, UTC |
| `WORKER_OFFERS_CRON` | worker | tidak | `0 */6 * * *` | Refresh offer, UTC |
| `WORKER_CLEANUP_CRON` | worker | tidak | `30 3 * * *` | Bersihkan riwayat `SyncJob`, UTC |
| `WORKER_SYNC_TMDB` | worker | tidak | `100` | Jumlah judul TMDB per sync |
| `WORKER_SYNC_ANILIST` | worker | tidak | `60` | Jumlah detail AniList per sync |
| `WORKER_SYNC_FORCE` | worker | tidak | `false` | Abaikan cache 24 jam |
| `WORKER_OFFERS_LIMIT` | worker | tidak | `50` | Judul per refresh offer |
| `WORKER_OFFERS_MAX_AGE_HOURS` | worker | tidak | `24` | Offer lebih tua dari ini di-refresh |
| `WORKER_RETENTION_DAYS` | worker | tidak | `30` | Retensi `SyncJob` |
| `WORKER_HEALTH_REQUIRED` | web | tidak | kosong | `true` membuat `/api/health` memeriksa heartbeat worker |

Semua jadwal di-upsert saat worker boot; ubah env lalu restart worker.

## Ops & admin

| Key | Scope | Wajib | Default | Keterangan |
| --- | --- | --- | --- | --- |
| `CSP_EXTRA_ORIGINS` | build | tidak | kosong | Origin http(s) tambahan untuk `script-src`, dipisah spasi/koma |
| `ADMIN_USER` | seed | tidak | `admin` | Username admin yang dibuat `pnpm db:seed` |
| `ADMIN_PASS` | seed | tidak | kosong | Password plaintext **hanya** untuk seed; di-hash lalu boleh dihapus |
| `ADMIN_PASS_HASH` | runtime | ya untuk admin | kosong | Hash bcrypt; juga menjadi kunci sesi bila secret kosong |
| `ADMIN_SESSION_SECRET` | runtime | dianjurkan | kosong | HMAC ≥ 32 karakter; rotasi tanpa logout massal |
| `CRON_SECRET` | — | tidak | kosong | Dicadangkan; arsitektur saat ini memakai BullMQ, bukan endpoint cron |

## Build vs runtime

- Build: `NEXT_PUBLIC_*`, `CSP_EXTRA_ORIGINS`, `DATABASE_URL` (prerender ISR), `NODE_ENV`.
- Runtime: `DATABASE_URL`, `REDIS_URL`, `ADMIN_*`, `WORKER_*`, `TMDB_*`.
- `ADMIN_PASS`/`ADMIN_PASS_HASH` dibaca `pnpm db:seed`; setelah akun dibuat, hanya hash yang
  dibutuhkan web.

Build vs runtime di atas menentukan kapan perubahan env terlihat. `apps/web/src/lib/env.ts`
memvalidasi env publik dan server saat modul dimuat; `next build` gagal lebih awal dengan nama key
yang bermasalah. Setelah mengubah env runtime, restart web dan worker (`systemctl restart
ongx-web ongx-worker`).
