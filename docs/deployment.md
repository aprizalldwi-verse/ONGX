# Deployment

Panduan end-to-end untuk menjalankan ONGX di VPS. Arsitekturnya satu Next.js app
(`apps/web`), satu worker BullMQ (proses terpisah dari repo yang sama), Postgres, Redis, dan
Nginx sebagai reverse proxy/TLS. Ringkasan keputusan ada di `DECISIONS.md` ASUMSI-064…068.

Untuk referensi setiap variabel env lihat `docs/env.md`; untuk header/rate limit lihat
`docs/security.md`; untuk iklan lihat `docs/ads.md`.

## 1. Topologi

```
Internet ── Nginx (TLS, port 443) ── Next.js :3000 (systemd: ongx-web)
                                         │
                                         ├── Postgres :5432 (Docker, hanya localhost)
                                         ├── Redis    :6379 (Docker, hanya localhost)
                                         └── worker BullMQ (systemd: ongx-worker)
```

- Web dan worker berbagi database, Redis, dan file `.env.local` yang sama.
- Worker tidak boleh dijalankan dua kali dengan jadwal berbeda; beberapa replika worker aman
  karena BullMQ menjamin satu eksekusi per job.
- ISR/image cache Next berada di disk (`apps/web/.next/cache`). Untuk lebih dari satu instance
  web, pasang shared cache atau arahkan traffic ke satu instance; jangan biarkan instance
  menulis cache yang berbeda tanpa sadar.

## 2. Prasyarat VPS

Contoh: Ubuntu 24.04, 2 vCPU, 2 GB RAM (build Next butuh ~1 GB), 20 GB disk.

```bash
sudo apt update && sudo apt install -y curl git nginx postgresql-client
# Node 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
corepack prepare pnpm@10.18.0 --activate

# Docker + compose plugin (untuk Postgres/Redis)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Logout/login sekali agar grup `docker` aktif. Buka firewall hanya untuk SSH/HTTP/HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 3. Ambil kode dan siapkan env

```bash
sudo useradd --create-home --shell /bin/bash ongx
sudo mkdir -p /srv/ongx && sudo chown ongx:ongx /srv/ongx
sudo -iu ongx
git clone https://github.com/aprizalldwi-verse/ONGX.git /srv/ongx
cd /srv/ongx
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local` untuk produksi. Nilai minimum:

```env
DATABASE_URL="postgresql://ongx:<password-kuat>@127.0.0.1:5432/ongx?schema=public"
DIRECT_URL="postgresql://ongx:<password-kuat>@127.0.0.1:5432/ongx?schema=public"
REDIS_URL="redis://127.0.0.1:6379"
NEXT_PUBLIC_SITE_URL="https://ongx.example"

TMDB_API_KEY="<tmdb-key>"
TMDB_REGION="ID"

NEXT_PUBLIC_ADS_ENABLED="false"
NEXT_PUBLIC_MT_ADAPTER_URL=""
# ...zone iklan lain, lihat docs/ads.md

WORKER_HEALTH_REQUIRED="true"

ADMIN_USER="admin"
ADMIN_PASS="<password-admin-kuat>"     # hanya untuk seed pertama
ADMIN_PASS_HASH=""
ADMIN_SESSION_SECRET="<openssl rand -base64 32>"
CSP_EXTRA_ORIGINS=""
```

Catatan:

- `NEXT_PUBLIC_*` dan `CSP_EXTRA_ORIGINS` **dibaca saat build**. Set nilainya sebelum
  `pnpm build`; mengubahnya nanti butuh build ulang.
- Jangan commit `apps/web/.env.local`. Batasi permission: `chmod 600 apps/web/.env.local`.
- `ADMIN_PASS` hanya dipakai `pnpm db:seed`; setelah hash dicetak, ganti dengan
  `ADMIN_PASS_HASH` dan kosongkan `ADMIN_PASS`.

## 4. Postgres & Redis

`docker-compose.yml` menyalakan Postgres 16 + Redis 7 dengan volume persisten dan port yang
hanya terbuka di loopback:

```bash
cd /srv/ongx
# Samakan kredensial dengan DATABASE_URL sebelum start.
docker compose up -d
docker compose ps          # keduanya "healthy"
```

Volume tinggal di Docker (`ongx_pgdata`, `ongx_redisdata`). Jangan jalankan `docker compose
down -v` di produksi. Untuk mengubah password Postgres setelah volume dibuat, masuk ke container
(`docker compose exec postgres psql -U ongx`) lalu perbarui `DATABASE_URL`.

## 5. Install, migrasi, seed, build

```bash
cd /srv/ongx
pnpm install --frozen-lockfile     # devDependencies dibutuhkan worker/Prisma CLI
pnpm db:generate
pnpm db:deploy                     # prisma migrate deploy
```

Seed pertama (membuat genre + admin). Simpan hash yang dicetak:

```bash
pnpm db:seed
# ADMIN_PASS_HASH="$2b$12$..."
```

Setelah itu isi `ADMIN_PASS_HASH` di `.env.local`, kosongkan `ADMIN_PASS`, lalu:

```bash
pnpm catalog:sync                  # isi katalog awal; butuh TMDB_API_KEY
pnpm build                         # DATABASE_URL harus hidup saat build (ISR prerender)
```

Build akan gagal cepat bila env wajib kosong/salah. `pnpm build` tidak menjalankan migrasi;
migrasi selalu langkah terpisah agar rollback aplikasi tidak otomatis mengubah skema.

## 6. systemd

Salin unit contoh, sesuaikan `User`/`WorkingDirectory` bila bukan `/srv/ongx`, lalu aktifkan:

```bash
sudo cp deploy/ongx-web.service deploy/ongx-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ongx-web ongx-worker
systemctl status ongx-web ongx-worker --no-pager
```

- `ongx-web` menjalankan `pnpm --filter @ongx/web start` (Next `next start`) di
  `127.0.0.1:3000`.
- `ongx-worker` menjalankan `tsx src/worker/main.ts`; worker membutuhkan `tsx` (devDependency),
  karena itu instalasi memakai devDependencies (ASUMSI-066).
- Keduanya membaca `EnvironmentFile=/srv/ongx/apps/web/.env.local`.
- `ReadWritePaths` web hanya `.next/cache`; source tetap read-only bagi service.

Uji manual sebelum lanjut:

```bash
curl -fsS http://127.0.0.1:3000/api/health
journalctl -u ongx-worker -n 50 --no-pager   # cari "scheduled" dan heartbeat
```

## 7. Nginx + TLS

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/ongx
sudo ln -s /etc/nginx/sites-available/ongx /etc/nginx/sites-enabled/ongx
sudo nano /etc/nginx/sites-available/ongx     # ganti ongx.example
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d ongx.example          # pasang certbot dulu bila belum
```

Poin penting:

- `proxy_set_header X-Forwarded-For $remote_addr;` **menimpa** header klien. Aplikasi memakai
  IP pertama untuk rate limit; jangan menggantinya dengan `$proxy_add_x_forwarded_for` yang
  menambahkan nilai palsu dari klien (ASUMSI-068).
- Jangan menambahkan cache publik untuk `/admin/*` dan `/api/*`; aplikasi sudah mengirim
  `no-store`.
- `/_next/static/` boleh di-cache `immutable, max-age=31536000`.
- HSTS dikirim aplikasi di produksi; jangan duplikasi di Nginx.

## 8. Verifikasi go-live

```bash
# Health: 200 + status ok/degraded (503 hanya bila DB/Redis down)
curl -fsS https://ongx.example/api/health

# Header keamanan
curl -sI https://ongx.example/ | grep -Ei 'content-security|strict-transport|x-frame|x-content|referrer|permissions|x-powered'

# Admin: harus redirect ke /admin/login dan mengirim no-store + noindex
curl -sI https://ongx.example/admin | grep -Ei 'cache-control|x-robots-tag'

# 50 URL dari sitemap tidak boleh >= 400
pnpm smoke:urls --base=https://ongx.example --limit=50

# Worker hidup
docker compose exec redis redis-cli get ongx:worker:heartbeat
```

Checklist manual:

- [ ] Login `/admin` dengan akun seed, ganti status satu judul, lihat riwayat sync.
- [ ] Trigger `sync.offers` dari panel; job muncul di halaman sync dan worker mengeksekusi.
- [ ] `https://ongx.example/sitemap.xml` dan `/rss.xml` valid.
- [ ] Gambar poster/backdrop tampil (host `image.tmdb.org`, `s4.anilist.co`).
- [ ] Report dari halaman detail masuk ke `/admin/reports`.
- [ ] `https://ongx.example/robots.txt` mengizinkan publik dan memblokir `/admin`.
- [ ] Tidak ada error di `journalctl -u ongx-web -u ongx-worker`.

## 9. Update & rollback

Rutin (backup dulu, lihat bagian 10):

```bash
cd /srv/ongx
git fetch --tags
git checkout <tag-baru>
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:deploy
pnpm build
sudo systemctl restart ongx-web ongx-worker
pnpm smoke:urls --base=https://ongx.example --limit=20
```

Rollback aplikasi:

```bash
git checkout <tag-lama>
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
sudo systemctl restart ongx-web ongx-worker
```

Migrasi Prisma bersifat forward-only. Bila rilis baru menghapus/mengubah kolom dan rollback
butuh skema lama, restore backup ke database terpisah lalu arahkan `DATABASE_URL` sementara —
jangan mengedit migrasi yang sudah diterapkan.

## 10. Backup & restore

Backup harian dengan `pg_dump` (script sudah menangani `?schema=public`):

```bash
sudo mkdir -p /var/backups/ongx && sudo chown ongx:ongx /var/backups/ongx
sudo -iu ongx
cd /srv/ongx
DATABASE_URL="$(grep '^DATABASE_URL=' apps/web/.env.local | cut -d= -f2- | tr -d '\"')" \
  sh deploy/backup-db.sh
```

Jadwalkan lewat cron user `ongx`:

```cron
15 2 * * * cd /srv/ongx && set -a && . apps/web/.env.local && set +a && sh deploy/backup-db.sh >> /var/log/ongx-backup.log 2>&1
```

- Retensi default 14 hari (`RETENTION_DAYS`).
- Salin dump ke storage lain (rclone/restic/S3) — backup di VPS yang sama bukan backup.
- Redis tidak di-backup: isinya cache, antrean, dan heartbeat. ISR cache bisa dibangun ulang.
- Uji restore berkala ke database scratch:

```bash
createdb -h 127.0.0.1 -U ongx ongx_restore
gunzip -c /var/backups/ongx/ongx-<stamp>.sql.gz | psql -h 127.0.0.1 -U ongx ongx_restore
# lalu jalankan `prisma migrate status` dengan DATABASE_URL ke ongx_restore
```

## 11. Alternatif: web di Vercel, worker di VPS

Bisa dipakai bila ingin CDN/edge Vercel. Yang perlu diperhatikan:

1. Import repo di Vercel, **Root Directory** `apps/web`, aktifkan opsi menyertakan file di luar
   root (workspace `packages/*`).
2. Build command: `pnpm --filter @ongx/db generate && pnpm --filter @ongx/web build`.
3. Env Vercel: `DATABASE_URL` (pooled), `DIRECT_URL`, `REDIS_URL` (Upstash/Redis publik),
   `NEXT_PUBLIC_SITE_URL`, `ADMIN_*`, `TMDB_*`, `WORKER_*` bila health memeriksa worker.
   Env `NEXT_PUBLIC_*` harus diisi sebelum build pertama.
4. Worker tetap di VPS (systemd seperti bagian 6) karena BullMQ butuh proses long-running.
   Arahkan `REDIS_URL` worker ke Redis yang sama dengan Vercel.
5. Jalankan migrasi dari mesin yang bisa menjangkau database: `pnpm db:deploy`.
6. Uji ulang header: Vercel dapat menambahkan header sendiri, tetapi CSP/HSTS dari aplikasi
   tetap berlaku. Pastikan `X-Forwarded-For` di Vercel tepercaya (Vercel menulisnya).
7. ISR ditangani platform; rate limit dan cache pencarian tetap memakai Redis bersama.

Vercel tidak menjalankan cron BullMQ dan tidak menyimpan `apps/web/.next/cache` seperti VPS —
jangan mengandalkan filesystem lokal untuk state.

## 12. Iklan Monetag

Iklan **tidak** aktif sampai akun disetujui dan bridge di-host. Set `NEXT_PUBLIC_ADS_ENABLED`,
zone `NEXT_PUBLIC_MT_*`, dan `NEXT_PUBLIC_MT_ADAPTER_URL`, lalu rebuild. Origin bridge otomatis
masuk CSP; host script tambahan masuk `CSP_EXTRA_ORIGINS`.

Verifikasi tiap format sebelum menganggap live (detail kontrak di `docs/ads.md`):

- [ ] Smart tag, in-page push, vignette: muncul setelah load, tidak menutupi navigasi.
- [ ] Interstitial: hanya setelah scroll > 1 viewport di halaman watch dan referrer internal.
- [ ] Popunder: baru setelah gesture pertama; tidak muncul berulang di navigasi internal.
- [ ] Rewarded: hanya `completed` dari callback jaringan yang membuka kunci 30 menit; skip
      tidak membuka.
- [ ] Native/in-grid: tinggi slot tetap (250/300/100 px), CLS tidak bertambah saat no-fill.
- [ ] `https://ongx.example/ads.txt` memuat seller record yang diberikan jaringan (bukan `# TODO`).
- [ ] Mode `NEXT_PUBLIC_ADS_ENABLED=false` menyembunyikan semua slot dan tidak memuat bridge.
- [ ] Tidak ada error CSP di console saat bridge/zone aktif.

## 13. Troubleshooting

| Gejala | Penyebab umum | Tindakan |
| --- | --- | --- |
| `P1000` saat migrate | kredensial salah, atau Postgres native memakai 5432 | Hentikan service native, cek `docker compose ps`, samakan `DATABASE_URL` |
| `P1001` | Postgres belum siap/port tidak terbuka | `docker compose up -d`, tunggu healthcheck |
| Build gagal query DB | `DATABASE_URL` tidak di-set saat build | Nyalakan Postgres + migrasi sebelum `pnpm build` |
| Halaman 500 hanya di produksi | `prisma generate` belum jalan setelah checkout | `pnpm db:generate && pnpm build` |
| `/api/health` 503 | DB/Redis down | `docker compose ps`, `journalctl -u ongx-web` |
| Health `degraded` | heartbeat worker hilang | `systemctl status ongx-worker`, cek `REDIS_URL`/queue prefix |
| Login selalu "salah" | `ADMIN_PASS_HASH` kosong/stale | Jalankan seed ulang dengan `ADMIN_PASS`, simpan hash baru |
| Rate limit tidak jalan | Redis mati (fail-open) | Hidupkan Redis; lihat `docs/security.md` |
| `X-Forwarded-For` spoofable | Nginx memakai `$proxy_add_x_forwarded_for` | Ganti ke `$remote_addr` dan reload |
| Aset 404 setelah deploy | `pnpm build` tidak dijalankan ulang | Build ulang; jangan hapus `.next` saat server hidup |
| Worker dobel eksekusi | dua worker dengan prefix/queue berbeda | Samakan `WORKER_QUEUE_PREFIX`; BullMQ butuh satu queue |
| Gambar upstream lambat | jaringan ke TMDB/AniList | Bukan error aplikasi; cek `/_next/image` dan firewall keluar |
