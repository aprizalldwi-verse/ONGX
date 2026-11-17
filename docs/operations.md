# Operations runbook

Panduan harian untuk operator ONGX setelah deploy mengikuti `docs/deployment.md`.

## Cek rutin

| Frekuensi | Cek | Perintah/indikator |
| --- | --- | --- |
| Setiap deploy | Health & header | `curl -fsS https://ongx.example/api/health`; `curl -sI https://ongx.example/` |
| Harian | Web & worker hidup | `systemctl status ongx-web ongx-worker --no-pager` |
| Harian | Heartbeat worker | `docker compose exec redis redis-cli get ongx:worker:heartbeat` (harus < 45 detik) |
| Harian | Error log | `journalctl -u ongx-web -u ongx-worker --since yesterday -p warning` |
| Harian | Backup jalan | File baru di `/var/backups/ongx`, ukuran wajar |
| Mingguan | Sync terakhir | `/admin` atau `/admin/sync`; job sukses < 24 jam |
| Mingguan | Laporan pengguna | `/admin/reports?status=OPEN` |
| Bulanan | Disk & cache | `df -h`, ukuran `apps/web/.next/cache` |
| Bulanan | Audit dependency | `pnpm audit --prod` di staging/CI |
| Bulanan | Uji restore | Restore dump terbaru ke DB scratch (lihat deployment §10) |

Health `degraded` berarti aplikasi masih melayani tetapi salah satu probe bermasalah. Health 503
berarti Postgres dan Redis sama-sama tidak bisa dipakai; halaman publik akan gagal.

## Pekerjaan katalog

- Sync otomatis: `sync.catalog` (02:00 UTC), `sync.offers` (tiap 6 jam), `maintenance.cleanup`
  (03:30 UTC). Jadwal di-upsert saat worker boot; ubah env lalu restart worker.
- Sync manual dari panel: `/admin/sync` → tombol job. Job hanya masuk antrean; eksekusi oleh
  worker. Tanpa Redis tombol menampilkan error dan tidak menulis apa pun.
- Sync manual dari server:

```bash
cd /srv/ongx
pnpm worker:once --job=sync.catalog --tmdb=20 --anilist=20
pnpm worker:once --job=sync.offers --offers-limit=10 --max-age-hours=0
pnpm worker:once --job=maintenance.cleanup
```

- Batas API TMDB/AniList: jangan menaikkan `WORKER_SYNC_TMDB`/`WORKER_SYNC_ANILIST` drastis
  tanpa memantau rate limit. Job gagal otomatis di-retry 3× (1, 2, 4 menit); kegagalan permanen
  terlihat di riwayat `SyncJob` dan log worker.

## Insiden

### Web 502/504 dari Nginx

1. `systemctl status ongx-web`; `journalctl -u ongx-web -n 100`.
2. `curl -v http://127.0.0.1:3000/api/health`.
3. Bila proses crash berulang: `pnpm db:generate && pnpm build`, lalu restart. Cek disk penuh
   (`.next/cache` bisa besar) dan RAM (OOM killer: `dmesg -T | tail`).
4. Bila DB down: `docker compose up -d`, cek healthcheck, lalu restart web.

### Worker mati / health degraded

1. `systemctl status ongx-worker`; log menunjukkan config invalid, Redis unreachable, atau
   Prisma error.
2. `docker compose exec redis redis-cli ping` dan cek `REDIS_URL`.
3. Setelah worker hidup, heartbeat kembali dalam ≤ 45 detik. Job yang tertunda tetap dieksekusi
   (BullMQ), tidak perlu trigger ulang kecuali sudah `failed` permanen.

### Redis down

- Web tetap melayani: rate limit fail-open, cache pencarian mati, panel sync menampilkan error.
- Worker berhenti memproses dan heartbeat hilang.
- Nyalakan Redis; jangan menghapus volume. Antrean yang belum diproses akan dilanjutkan.
- Setelah Redis pulih, pantau lonjakan request karena rate limit sempat tidak aktif.

### Database down / korup

1. Hentikan web & worker agar tidak menulis partial.
2. Nyalakan Postgres; bila volume rusak, restore dump terbaru ke volume/database baru.
3. Jalankan `pnpm db:deploy` untuk memastikan migrasi, lalu `pnpm db:seed` (idempotent).
4. Nyalakan web/worker, cek `/api/health`, login admin, dan `pnpm smoke:urls --limit=20`.

### Katalog kosong / gambar hilang

- Cek `SyncJob` terakhir dan `TMDB_API_KEY`.
- `pnpm catalog:sync --force` untuk backfill; offer Vidio butuh region `ID`.
- Gambar 404: cek host `image.tmdb.org`/`s4.anilist.co` dan firewall keluar; `NEXT_PUBLIC_*`
  tidak terkait.

### Tidak bisa login admin

1. Pastikan `ADMIN_PASS_HASH` terisi dan `ADMIN_SESSION_SECRET` ≥ 32 karakter (bila dipakai).
2. Rate limit 10/15 menit per IP/username; tunggu atau bersihkan key:
   `docker compose exec redis redis-cli --scan --pattern 'ongx:admin:login:*'` lalu `del`.
3. Buat ulang akun:

```bash
cd /srv/ongx
ADMIN_PASS='password-baru-kuat' pnpm db:seed
# simpan hash yang dicetak ke ADMIN_PASS_HASH, hapus ADMIN_PASS, restart web
```

4. Setelah mengganti hash tanpa `ADMIN_SESSION_SECRET`, semua sesi lama otomatis batal.

### Kecurigaan penyalahgunaan

- Cek `journalctl` untuk lonjakan 429, pola laporan spam, atau login gagal.
- Rate limit report/search/login ada di Redis (`ongx:report:*`, `ongx:search:*`,
  `ongx:admin:login:*`). Blokir IP di Nginx bila perlu.
- Rotasi `ADMIN_PASS_HASH` (dan `ADMIN_SESSION_SECRET`) lalu restart web.
- Untuk insiden yang melibatkan data pengguna, simpan log sebelum membersihkan apa pun.

## Maintenance

- **Ganti domain:** ubah `NEXT_PUBLIC_SITE_URL` (build ulang), Nginx `server_name`, certbot,
  lalu `pnpm smoke:urls`.
- **Ganti zona iklan/bridge:** ubah env `NEXT_PUBLIC_*`/`CSP_EXTRA_ORIGINS`, build ulang,
  restart, verifikasi ulang checklist `docs/ads.md`.
- **Naik versi Next/Prisma:** update, `pnpm install`, `pnpm db:generate`, build, test, audit;
  tinjau `pnpm.overrides` di root.
- **Scale web:** jalankan beberapa instance di belakang Nginx dengan health check; putuskan
  shared ISR cache atau sticky session. Worker boleh beberapa replika (BullMQ).
- **Menaikkan retensi:** `WORKER_RETENTION_DAYS` dan `RETENTION_DAYS` backup; pantau ukuran DB.

## Log & observabilitas

- Web/worker: journald (`journalctl -u ongx-web -u ongx-worker -f`).
- Nginx: `/var/log/nginx/access.log`, `error.log`.
- Postgres/Redis: `docker compose logs -f postgres redis`.
- Aplikasi menulis log JSON? Tidak — gunakan prefix `[worker]`, `[health]`, `[report]`,
  `[admin]` untuk filter. Untuk agregasi, arahkan journald ke Loki/CloudWatch.
- Metrik minimum yang perlu dipantau: status health, latency p95, error 5xx, 429 per menit,
  umur heartbeat worker, ukuran DB, sisa disk, dan keberhasilan backup.
