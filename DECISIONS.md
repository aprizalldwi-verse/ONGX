# DECISIONS

Format: `ASUMSI-###: <isi> — <alasan>`

ASUMSI-001: Monorepo berada langsung di root `StreamONGX/`, bukan folder `ongx/` bersarang —
workspace root sudah menjadi folder proyek; nesting hanya menambah path noise.

ASUMSI-002: Sumber katalog v1 adalah TMDB (film/series) dengan tautan provider resmi, bukan
missav/idlix — menghosting ulang stream pihak ketiga bukan sesuatu yang bisa dibangun di sini.
Konsekuensi: `/watch/[id]` menampilkan trailer resmi + daftar provider sampai ada konten `OWN`.

ASUMSI-003: AniList ditunda ke Phase 4 (opsional) — TMDB sudah mencakup anime populer lewat
genre + discover, sehingga Phase 1–3 tidak terblokir.

ASUMSI-004: `packages/db` belum dibuat di Phase 1 — Prisma baru masuk Phase 2; menghindari
workspace kosong yang gagal `typecheck`.

ASUMSI-005: Docker Desktop belum terpasang di mesin dev. Phase 1 tidak butuh DB; Phase 2 akan
memakai Postgres/Redis dari `docker-compose.yml` atau instance Neon/Upstash bila Docker tetap
tidak tersedia.

ASUMSI-006: `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess` aktif sesuai semangat
"TypeScript strict" di brief; bila library pihak ketiga bentrok, hanya `skipLibCheck` yang
dilonggarkan, bukan tipe kode kita.

ASUMSI-007: Tema dibaca oleh inline script blocking di awal `<body>` (cookie `ongx_theme`), bukan
dengan `cookies()` di layout — `cookies()` akan memaksa seluruh halaman jadi dynamic rendering;
script inline menjaga halaman tetap statis/ISR tanpa flash tema salah (FOUC). Saat CSP dipasang
di Phase 11, script ini perlu nonce/hash.

ASUMSI-008: `localePrefix` tetap `"as-needed"` (id tanpa prefix, `/en` berprefix) sesuai peta rute
brief. Middleware next-intl melakukan rewrite internal untuk locale default; URL kanonik id tetap
`/film`, bukan `/id/film`.

ASUMSI-009: 404 untuk URL yang tidak dikenal mengembalikan status HTTP 404 sungguhan lewat
`app/global-not-found.tsx` + `experimental.globalNotFound` (Next 15.5). Ini perlu karena
`<html>` shell tinggal di `app/[locale]/layout.tsx`, bukan di root `app/`, sehingga tanpa file itu
Next memakai error shell bawaan tanpa CSS. Catch-all `[...rest]` dihapus karena ia menangkap semua
URL sehingga `global-not-found` tak pernah aktif. Karena tidak ada locale yang diketahui di titik
itu, salinan halaman 404 bersifat dwibahasa (bukan lewat next-intl). `loading.tsx` di level
`[locale]` juga dihapus: boundary itu membuat seluruh tree di-stream sehingga status 404 berubah
jadi 200. Setiap rute tetap punya `loading.tsx` sendiri.

ASUMSI-009b: **Sisa keterbatasan:** `notFound()` yang dipanggil dari dalam halaman yang sudah
streaming (mis. `/watch/[id]` dengan ID tidak valid di Phase 5) tetap mengembalikan 200 karena
shell sudah terkirim. Mitigasi sementara: `<meta name="robots" content="noindex">` pada boundary
`[locale]/not-found.tsx`. Perbaikan status penuh dijadwalkan Phase 8.

ASUMSI-010: `eslint.ignoreDuringBuilds = true` di `next.config.ts` — Next 15 hanya mendeteksi plugin
ESLint gaya `.eslintrc`, sehingga build memunculkan warning palsu untuk flat config. Lint tetap
diwajibkan lewat `pnpm lint` (dan CI di Phase 11).

ASUMSI-011: Aturan `@next/next/*` di-scope ke `apps/web/**` — package `packages/*` bukan aplikasi
Next, dan `no-html-link-for-pages` memunculkan warning "Pages directory cannot be found" bila
dijalankan di sana.

ASUMSI-012: `dynamicParams = false` pada `app/[locale]/layout.tsx` — hanya `id` dan `en` yang valid;
locale lain ditolak di level router, bukan dirender sebagai halaman kosong.

ASUMSI-013: `next-intl` dipakai tanpa `[locale]` prefix untuk admin nanti; panel admin tetap berada
di bawah `[locale]` agar satu root layout dan satu pipeline i18n.

ASUMSI-014: Prisma dipin ke **6.19.3** (bukan 7/8) — brief menetapkan Prisma 6, dan rilis 8 masih
RC. Client digenerate di lokasi default (`node_modules/@prisma/client`) agar Next bisa
mengeksternalkannya lewat `serverExternalPackages`, alih-alih output kustom yang ikut di-bundle.

ASUMSI-015: Migrasi awal dibuat dengan `prisma migrate diff --from-empty` sehingga SQL dan
`migration_lock.toml` masuk repo tanpa perlu Postgres hidup. `migrate deploy` dijalankan setelah
database tersedia. Seed idempotent (upsert per slug/username) supaya aman diulang di CI/VPS.
`ADMIN_PASS` hanya dipakai sekali untuk menghasilkan hash; hash hasilnya dicetak ke log agar bisa
disimpan ke `ADMIN_PASS_HASH`.

ASUMSI-016: `/api/health` mengembalikan 200 untuk `ok` dan `degraded` (DB/Redis belum
dikonfigurasi), 503 hanya bila salah satu probe benar-benar `down`. Tujuannya: uptime monitor tidak
merah di mesin dev yang belum punya Redis, tetapi tetap gagal saat dependensi yang dikonfigurasi
tidak bisa dihubungi.

ASUMSI-017: `.husky/pre-commit` memakai `lint-staged --max-arg-length 5000` — batas panjang
command line Windows (±8191 karakter) terlampaui saat 109 file di-stage sekaligus, sehingga
prettier/eslint gagal sebelum sempat memeriksa file.
