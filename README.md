# ONGX

Portal katalog film, series, dan anime dengan UI Indonesia-first.
Metadata dari TMDB + AniList, pemutaran lewat provider resmi.

**Status:** Phase 11 (hardening). Lihat `PROGRESS.md`.

## Prasyarat

- Node 22+ (diuji di Node 24)
- pnpm 10 (`npm i -g pnpm`)
- Docker Desktop + WSL2 (Postgres 16 + Redis 7; wajib mulai Phase 2)

## Mulai

```bash
pnpm install
Copy-Item .env.example apps/web/.env.local   # bash: cp .env.example apps/web/.env.local
docker compose up -d
pnpm db:deploy                 # terapkan migrasi
pnpm db:seed                   # 24 genre (+ admin bila ADMIN_PASS* diisi)
pnpm catalog:sync              # tarik metadata TMDB + AniList (butuh TMDB_API_KEY)
pnpm catalog:sync --force      # paksa refresh walau baris <24 jam (mis. backfill offer)
pnpm worker                    # worker: jadwal sync, refresh offer, cleanup
pnpm dev                       # http://localhost:3000
```

Semua perintah membaca env dari **`apps/web/.env.local`** (Next.js, Prisma, dan skrip sync).
`.env.local` di root tidak dipakai.

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
pnpm format       # Prettier (tulis)
pnpm format:check # Prettier (cek, dipakai gate)
pnpm e2e          # Playwright smoke (butuh `pnpm build` + server/Chrome)
pnpm audit        # audit dependensi produksi (target: 0 temuan)

pnpm catalog:sync # sinkronisasi metadata TMDB + AniList
pnpm worker       # worker BullMQ (butuh Redis); jalankan proses terpisah
pnpm worker:once  # jalankan satu job manual: --job=<nama>
pnpm db:generate  # generate Prisma client
pnpm db:migrate   # prisma migrate dev (butuh Postgres hidup)
pnpm db:deploy    # prisma migrate deploy (produksi)
pnpm db:seed      # seed 24 genre + admin (idempotent)
pnpm db:studio    # Prisma Studio
```

Health check: `GET /api/health` — 200 `{status:"ok"|"degraded"}`, 503 bila DB/Redis down.
Set `WORKER_HEALTH_REQUIRED=true` untuk ikut memeriksa heartbeat worker; worker yang mati
menurunkan status ke `degraded` (bukan 503) karena halaman tetap bisa dilayani.

### Worker (Phase 9)

`pnpm worker` menjalankan tiga jadwal berulang (cron UTC). Semua jadwal di-upsert saat boot,
jadi mengubah env lalu restart worker cukup untuk mengganti jadwal:

| Job | Default | Isi |
| --- | --- | --- |
| `sync.catalog` | `0 2 * * *` | TMDB 100 + AniList 60 detail, episode, genre, kredit, offer |
| `sync.offers` | `0 */6 * * *` | refresh `WatchOffer` 50 judul TMDB terpopuler yang offer-nya >24 jam |
| `maintenance.cleanup` | `30 3 * * *` | hapus riwayat `SyncJob` lebih tua dari 30 hari |

Job manual (tanpa menunggu cron):

```bash
pnpm worker:once --job=maintenance.cleanup
pnpm worker:once --job=sync.offers --offers-limit=5 --max-age-hours=0
pnpm worker:once --job=sync.catalog --tmdb=5 --anilist=5
```

Retry: 3 percobaan dengan exponential backoff (1, 2, 4 menit). Worker menulis heartbeat ke
Redis (`ongx:worker:heartbeat`, TTL 45 detik) dan menutup antrean dengan rapi pada SIGINT/SIGTERM.
Konfigurasi lengkap ada di `.env.example` (`WORKER_*`).

### Admin (Phase 10)

Panel admin ada di `/admin` (Inggris: `/en/admin`). Semua halaman di balik guard akan
mengalihkan ke `/admin/login` bila belum ada sesi.

Menyiapkan akun pertama:

```bash
# 1. Isi password sekali di apps/web/.env.local
#    ADMIN_PASS="password-kuat"
pnpm db:seed            # mencetak hash bcrypt; simpan ke ADMIN_PASS_HASH

# 2. Ganti ADMIN_PASS dengan hash yang dicetak, lalu (opsional) isi secret sesi
#    ADMIN_PASS_HASH="$2b$12$..."
#    ADMIN_SESSION_SECRET="<32+ karakter acak>"   # mis. openssl rand -base64 32
```

`ADMIN_SESSION_SECRET` opsional: bila kosong, cookie sesi ditandatangani dengan
`ADMIN_PASS_HASH`, sehingga mengganti password otomatis membatalkan sesi lama. Mengisi secret
terpisah memungkinkan rotasi password tanpa logout massal.

Isi panel:

- **Ringkasan** — hitungan judul/laporan per status, heartbeat worker, dan sync terakhir.
- **Laporan** — moderasi laporan pengguna (`REVIEWING` / `RESOLVED` / `REJECTED`).
- **Judul** — cari/filter katalog; ubah status judul TMDB/AniList (metadata lain milik worker),
  atau edit penuh termasuk `streamUrl` untuk judul `OWN`.
- **Sinkronisasi** — riwayat `SyncJob` dan tombol "jalankan sekarang" untuk
  `sync.catalog`, `sync.offers`, dan `maintenance.cleanup` (butuh Redis + `pnpm worker`).

Keamanan: sesi berlaku 12 jam (`httpOnly`, `SameSite=Lax`, `Secure` di produksi), login
dibatasi 10 percobaan / 15 menit per IP, seluruh panel `noindex`, dan `streamUrl` hanya menerima
path relatif atau URL http(s). Detail ada di `DECISIONS.md` ASUMSI-054…058.

E2E: `pnpm e2e` menjalankan Playwright terhadap build produksi. Di mesin dev dipakai Chrome
sistem (`channel: "chrome"`); di CI pasang browser dengan
`pnpm --filter @ongx/web exec playwright install --with-deps chromium`. Suite memakai
`apps/web/.env.local` (DATABASE_URL) karena `globalSetup` membuat fixture `Source.OWN` sementara
untuk menguji player dengan playlist HLS lokal di `apps/web/public/test/fixtures/hls/`, plus akun
admin sementara dan satu laporan terbuka; semuanya dihapus lagi oleh `globalTeardown`. Jalankan
`pnpm build` dulu agar file `public/` terdaftar di server produksi.

## Keamanan (Phase 11)

Header keamanan dipasang terpusat dari `apps/web/src/lib/security-headers.ts` melalui
`next.config.ts`: CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy`, `Permissions-Policy`, dan `Cross-Origin-Opener-Policy`. HSTS
(`max-age=63072000; includeSubDomains; preload`) hanya dikirim di produksi. `X-Powered-By`
dimatikan, source map browser tidak dipublikasikan, dan body server action dibatasi 512 kb.

- `POST /api/report` hanya menerima `application/json` (16 KiB, same-origin); semua respons API
  dan halaman admin `no-store`. Admin juga mengirim `X-Robots-Tag: noindex`.
- Login admin dibatasi 10 percobaan / 15 menit per IP **dan** per username; lihat
  `DECISIONS.md` ASUMSI-061.
- `NEXT_PUBLIC_MT_ADAPTER_URL` hanya boleh http(s). Bila snippet iklan memuat script dari host
  lain, isi `CSP_EXTRA_ORIGINS` (spasi/koma) lalu rebuild; kosongkan bila tidak perlu.
- `pnpm audit --prod` harus bersih. Override `postcss`/`deepmerge-ts` ada di root
  `package.json` dan ditinjau setiap menaikkan Next/Prisma.

Detail header, batas request, asumsi proxy/HTTPS, dan checklist operasional ada di
`docs/security.md`.

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
