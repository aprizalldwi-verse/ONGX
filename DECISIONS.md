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

ASUMSI-018: Docker Desktop dipasang setelah WSL2 (`wsl --install --no-distribution`) di mesin dev
Windows — tanpa WSL2 engine tidak bisa hidup, dan virtualisasi BIOS sudah aktif sehingga tidak perlu
reboot. Instalasi lewat `winget install -e --id Docker.DockerDesktop`.

ASUMSI-019: PostgreSQL 16 native (`postgresql-x64-16`, auto-start) ternyata sudah memegang port
5432, sehingga koneksi `localhost:5432` masuk ke server itu dan `prisma migrate deploy` gagal
dengan P1000. Service native di-set **Manual + Stopped** dan Postgres dari `docker-compose.yml`
dipakai sebagai satu-satunya sumber data dev, agar `DATABASE_URL` tetap `localhost:5432` seperti
di README dan tidak ada dua sumber kebenaran. Bila butuh server native lagi: `Start-Service
postgresql-x64-16` (port bentrok dengan container, jadi hentikan compose dulu).

ASUMSI-020: Skrip root `db:*` memakai `pnpm --filter @ongx/db run <script>` (bukan
`pnpm --filter @ongx/db <script>`) — tanpa `run`, `deploy` ditangkap sebagai command bawaan pnpm
(`pnpm deploy`) dan gagal dengan `ERR_PNPM_INVALID_DEPLOY_TARGET`.

ASUMSI-021: Detail TMDB diambil dengan **satu** request `append_to_response` (`alternative_titles`,
`credits`, `videos`, `release_dates` untuk movie; `content_ratings` untuk TV) dan bahasa `id-ID`.
Tujuannya memangkas 5-6 request per judul menjadi satu, sehingga budget 40 req/10 s tetap aman saat
build/refresh banyak judul. Judul Inggris diambil dari `alternative_titles` region US, bukan request
bahasa kedua.

ASUMSI-022: `remoteId` mentah TMDB adalah angka yang bisa sama antara movie dan TV. Karena itu
`Title.remoteId` disimpan dengan prefix (`movie:693134`, `tv:1396`) saat ditulis ke DB, dan
`parseRemoteRef()` menerima prefix tersebut. Untuk kompatibilitas, id tanpa prefix dicoba sebagai
movie lalu TV (hanya saat movie 404). `(source, kind, remoteId)` tetap unik di schema.

ASUMSI-023: TMDB/JustWatch hanya menyediakan satu `link` per judul per region di
`watch/providers`, bukan deep link per provider. Semua `WatchOffer` region tersebut berbagi URL itu
(attribution tetap ke TMDB), dan offer dibuang bila region tidak punya `link`. Tidak ada tabel
`ExternalRef`: identitas eksternal cukup di `Title.source + Title.remoteId`, sedangkan provider
disimpan di `WatchOffer` (diganti penuh setiap sync agar offer basi hilang).

ASUMSI-024: Slug publik dijaga stabil. Saat sync, slug lama dipertahankan selama base
`title-year` tidak berubah; bila berubah, slug baru dicari dan `Redirect` (`fromPath` ? `toPath`)
di-upsert untuk 301 di Phase 8. `freeSlug()` menambahkan suffix angka, dan
`stripCollisionSuffix()` membandingkan base tanpa suffix agar rename tidak memicu redirect palsu.

ASUMSI-025: Live smoke TMDB dijalankan sebagai file Vitest (`scripts/**/*.smoke.ts` dengan
`vitest.smoke.mts`) alih-alih menambah dependency `tsx`. Config terpisah menjaga `pnpm test` tidak
pernah memanggil jaringan; `describe.skipIf(!TMDB_API_KEY)` membuat perintah aman di mesin tanpa key.
`compact()` dipakai setiap kali menulis input Prisma karena `exactOptionalPropertyTypes` menolak
properti bernilai `undefined`.

ASUMSI-026: Pemutar video hanya aktif untuk `Title.source === "OWN"` dan `streamUrl` terisi. Judul
TMDB/AniList menampilkan trailer resmi + panel provider, bukan pemutar kosong. Alasannya: v1
metadata-only dan kebijakan data melarang re-hosting/scraping `.m3u8`; `streamUrl` tidak pernah
diisi adapter mana pun, hanya admin (Phase 10) yang boleh mengisinya.

ASUMSI-027: Continue-watching disimpan device-local di `localStorage` (`ongx:continue`), bukan di
server. Entri <10 detik dianggap belum mulai, entri ≥95 % dianggap selesai dan dibuang, daftar
dibatasi 20 item terbaru. Alasannya: v1 belum punya akun, jadi sinkronisasi lintas perangkat tidak
mungkin; aturan ambang mencegah rail mengirim penonton ke kredit atau ke iklan pembuka.

ASUMSI-028: `offers` untuk judul AniList selalu kosong. AniList tidak menyediakan deep link
provider resmi, dan kebijakan data melarang menebak URL atau memakai sumber tidak resmi. Judul
AniList tetap tampil lengkap dengan trailer (bila ada) dan episode; panel offer hanya terisi untuk
judul TMDB.

ASUMSI-029: `POST /api/report` memakai fixed window Redis 5 laporan / 10 menit per IP dan langsung
mengembalikan `429` + `retry-after` (tidak menunggu seperti limiter sync). Redis error = fail-open.
Alasannya: endpoint anonim tanpa akun mudah disalahgunakan, tetapi cache outage tidak boleh
mematikan pelaporan. `x-forwarded-for` dipakai lebih dulu agar benar di belakang reverse proxy.

ASUMSI-030: Playwright memakai `channel: "chrome"` (Chrome sistem) di luar CI karena unduhan
Chromium diblokir `ECONNRESET` di mesin dev; CI tetap memakai browser bawaan
(`playwright install chromium`). Suite juga meng-abort `/_next/image` saat test: host gambar
upstream tidak selalu reachable, dan request optimizer yang menggantung menghabiskan connection
pool per-host Chrome sehingga navigasi RSC ikut tertahan. Test tetap memvalidasi routing,
dialog, dan form; optimasi gambar diuji manual/CI dengan jaringan penuh.

ASUMSI-031: Repo memakai `.gitattributes` `* text=auto eol=lf`. Prettier dikonfigurasi
`endOfLine: "lf"`, sedangkan checkout Windows dengan `core.autocrlf=true` menulis CRLF sehingga
`pnpm format:check` gagal untuk hampir semua file tanpa ada perubahan kode. Atribut ini memaksa
LF di semua platform.
