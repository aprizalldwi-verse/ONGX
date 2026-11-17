# Keamanan & hardening

Dokumen ini merangkum kontrol Phase 11: header, CSP, batas request, throttle, dan asumsi
deployment. Keputusan rinci ada di `DECISIONS.md` ASUMSI-059…063.

## Header respons

`apps/web/next.config.ts` memasang header berikut untuk semua rute lewat
`securityHeaders()` di `src/lib/security-headers.ts` (satu sumber kebenaran, diuji unit).

| Header | Nilai | Catatan |
| --- | --- | --- |
| `Content-Security-Policy` | lihat di bawah | semua halaman |
| `X-Content-Type-Options` | `nosniff` | |
| `X-Frame-Options` | `DENY` | fallback untuk browser tanpa CSP |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` | |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | popunder iklan tetap bisa membuka tab |
| `X-DNS-Prefetch-Control` | `off` | |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | **hanya produksi** |
| `X-Robots-Tag` | `noindex, nofollow` | `/admin/*` dan `/en/admin/*` |
| `Cache-Control` | `private, no-store, max-age=0` (admin), `no-store` (API) | |

`poweredByHeader: false` menghapus `X-Powered-By`, dan `productionBrowserSourceMaps: false`
membuat stack trace hanya ada di log server (browser menerima `digest`).

### CSP

```
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none';
form-action 'self'; script-src 'self' 'unsafe-inline' https://<adapter>;
script-src-attr 'none'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:; font-src 'self' data:;
media-src 'self' blob: https:; connect-src 'self' https:;
frame-src 'self' https:; worker-src 'self' blob:; manifest-src 'self'
```

- `'unsafe-inline'` disengaja: Next menyisipkan bootstrap inline dan tema memakai script inline
  agar halaman tetap statis/ISR tanpa FOUC. Nonce/hash akan memaksa semua halaman publik menjadi
  dinamis, jadi trade-off ini didokumentasikan (ASUMSI-059). `script-src-attr 'none'` tetap
  menolak handler atribut inline.
- `'unsafe-eval'` hanya muncul saat `NODE_ENV !== "production"` (React refresh).
- Origin `NEXT_PUBLIC_MT_ADAPTER_URL` otomatis masuk `script-src`. Bila snippet jaringan memuat
  script dari host lain, isi `CSP_EXTRA_ORIGINS` (dipisah spasi/koma, hanya http(s); nilai lain
  diabaikan) lalu rebuild.
- `upgrade-insecure-requests` tidak dipasang: CSP dikirim juga di dev/e2e http. Paksa HTTPS di
  proxy, bukan lewat CSP.
- `frame-src https:` dibutuhkan trailer YouTube dan embed provider; `media-src blob:` untuk
  elemen video dan segmen HLS; `worker-src blob:` untuk worker HLS.js.

## Batas request

| Permukaan | Batas | Perilaku |
| --- | --- | --- |
| Server action (admin) | 512 kb | `experimental.serverActions.bodySizeLimit` |
| `POST /api/report` | 16 KiB | `readJsonBody()`: 415 bila bukan `application/json`, 413 bila `Content-Length` atau panjang body melebihi batas, 400 bila JSON rusak |
| `GET /api/search` | query 2–80 karakter | skema strict; rate limit 120/menit/IP |

`POST /api/report` juga memeriksa same-origin: bila header `Origin` ada, host-nya harus sama
dengan `Host` (403 bila tidak). Klien non-browser tanpa `Origin` (curl, server-to-server) tetap
diizinkan dan mengandalkan rate limit. Urutan pemeriksaan adalah origin → content-type/ukuran →
skema → rate limit, sehingga request cacat tidak menghabiskan kuota.

Rate limit bersifat fail-open bila Redis mati: laporan/pencarian tetap dilayani, dan login admin
tetap bisa masuk. Konsekuensinya brute-force tidak dibatasi selama Redis down — pantau
`/api/health` dan hidupkan Redis di produksi.

## Autentikasi admin

- Sesi: cookie `ongx_admin`, HMAC stateless, 12 jam, `httpOnly`, `SameSite=Lax`, `Secure` di
  produksi.
- `ADMIN_SESSION_SECRET` minimal 32 karakter bila diisi; kosong berarti memakai
  `ADMIN_PASS_HASH` sebagai kunci.
- Login dibatasi 10 percobaan / 15 menit per IP **dan** per username (SHA-256, sehingga nama
  akun tidak tersimpan di Redis). Kedua bucket diperiksa paralel.
- `NEXT_PUBLIC_MT_ADAPTER_URL` divalidasi hanya http(s) agar tidak bisa menjadi `javascript:`
  di `<Script>`.

## Tautan keluar

URL offer difilter dua kali: adapter metadata hanya menyimpan http(s), dan lapisan baca
(`toTitleDetail`) membuang offer yang URL-nya bukan http(s) absolut. Tautan eksternal memakai
`rel="noopener noreferrer"` (offer: `sponsored`).

## Dependency audit

```bash
pnpm audit            # alias `pnpm audit --prod`
```

Root `package.json` memakai `pnpm.overrides` untuk menaikkan dependensi transitif yang rentan:

- `postcss@<8.5.23` → `8.5.33` (dipakai Next).
- `deepmerge-ts@<8.0.0` → `8.0.2` (dipakai `@prisma/config`).

Override diverifikasi dengan `pnpm --filter @ongx/db generate` dan `pnpm db:deploy` (Prisma CLI
memuat config dan menjalankan merger). Setelah menaikkan Next/Prisma, cek apakah override masih
perlu; hapus bila upstream sudah memakai versi aman.

## Asumsi deployment

- Aplikasi **harus** berada di belakang reverse proxy yang menetapkan/menimpa
  `X-Forwarded-For` (dan `X-Real-IP`). Aplikasi memercayai header ini untuk rate limit; jangan
  pernah mengekspos port Next langsung ke internet.
- Proxy mengakhiri TLS dan meneruskan `Host` asli. Same-origin check membandingkan `Host`
  dengan `Origin`, jadi `X-Forwarded-Host` tidak dipakai.
- HSTS `preload` hanya berarti bila domain benar-benar didaftarkan ke preload list dan seluruh
  subdomain mendukung HTTPS. Untuk domain uji, turunkan `max-age`/hapus `preload`.
- `Cache-Control` admin/API dipasang juga di level Next; pastikan proxy tidak menambahkan cache
  publik untuk rute tersebut.

## Checklist operasional

- [ ] `pnpm audit --prod` bersih sebelum deploy.
- [ ] `.env.local` produksi: `ADMIN_SESSION_SECRET` ≥ 32 karakter acak, `ADMIN_PASS_HASH` bcrypt.
- [ ] `CSP_EXTRA_ORIGINS` hanya berisi host yang benar-benar diperlukan (kosongkan bila tidak ada).
- [ ] Redis hidup; `/api/health` hijau; alert bila `status` bukan `ok`.
- [ ] Log server dipantau untuk `[report] create failed`, `[health]`, dan error Prisma.
- [ ] Rotasi kredensial admin = ganti `ADMIN_PASS_HASH`/secret (sesi lama otomatis batal bila
      memakai hash sebagai kunci).
- [ ] Uji header setelah deploy: `curl -I https://<domain>/` dan `/admin/login`.

## Pelaporan kerentanan

Kirim detail reproduksi secara privat ke operator (kanal di halaman kontak/DMCA). Jangan membuka
issue publik untuk kerentanan yang belum diperbaiki; sertakan URL, header, dan langkah reproduksi.
