# QA & acceptance

Checklist yang dijalankan sebelum sebuah rilis dianggap selesai. Gate otomatis ada di CI
(`.github/workflows/ci.yml`); e2e dan Lighthouse dijalankan lokal/against staging karena
bergantung pada katalog dan jaringan nyata.

## Gate otomatis

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm audit --prod
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build          # butuh DATABASE_URL yang hidup (ISR)
```

CI menjalankan urutan yang sama (quality job + build job dengan service Postgres/Redis). E2E
tidak dijalankan di CI: smoke suite membutuhkan katalog hasil sync TMDB/AniList (`One Piece`,
`Shingeki`, `Simpsons`, dst.), sehingga tanpa seed deterministik hasilnya flaky (ASUMSI-065).

## E2E Playwright

Prasyarat: `pnpm build` selesai, Postgres/Redis hidup, `.env.local` valid, dan katalog sudah
di-seed/di-sync. Suite membuat fixture `Source.OWN` + laporan + admin sementara sendiri.

```bash
pnpm build
pnpm e2e
```

Yang dicakup (22 test): beranda/rail/detail, trailer + report, episode → watch, typeahead +
`/api/search`, filter Vidio, simpan/riwayat/playlist, sheet filter mobile, player HLS fixture,
provider offer, robots/manifest/RSS, sitemap + 50 sampel URL, canonical/hreflang/JSON-LD/OG,
admin (guard, login, moderasi, edit status, sync, `/en`, logout), dan header keamanan
(403/413/415, no-store, noindex).

## Sitemap smoke

```bash
# terhadap server lokal/produksi
pnpm smoke:urls --base=https://ongx.example --limit=50
```

Script mengambil `/sitemap.xml` (index + chunk), mengambil sampel merata, lalu gagal bila ada
respons ≥ 400. Jalankan setelah deploy dan setelah sync katalog besar.

## Lighthouse (mobile)

Target brief: Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95, CLS < 0,1. Jalankan terhadap
build produksi (bukan `next dev`) dengan iklan sesuai kondisi rilis.

```bash
pnpm build
pnpm start                       # terminal lain
pnpm dlx lighthouse@12 http://localhost:3000/ \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new" \
  --output=json --output-path=./lighthouse-home.json

pnpm dlx lighthouse@12 http://localhost:3000/film \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless=new" \
  --output=json --output-path=./lighthouse-film.json
```

Catatan:

- Emulasi mobile default Lighthouse (Moto G Power, slow 4G). Angka bisa turun bila host gambar
  TMDB/AniList lambat dari mesin penguji; ulangi 2–3 kali dan pakai median.
- Jangan menguji dengan `NEXT_PUBLIC_ADS_ENABLED=true` sebelum bridge disetujui; iklan pihak
  ketiga mengubah metrik.
- Periksa `lighthouse-*.json` untuk `largest-contentful-paint` dan `cumulative-layout-shift`
  pada halaman detail (poster/backdrop) dan beranda (hero).

### Hasil pengukuran lokal (17 November 2026)

Build produksi, `next start` di `localhost:3000`, Lighthouse 12, emulasi mobile, Chrome headless,
tanpa iklan. Tiga run beranda `/en` berturut-turut setelah satu warm-up:

| Kategori | Target | Run 1 | Run 2 | Run 3 | Median |
| --- | --- | --- | --- | --- | --- |
| Performance | ≥ 85 | 71 | 71 | 76 | **71** |
| Accessibility | ≥ 95 | 100 | 100 | 100 | **100** |
| Best practices | — | 96 | 96 | 96 | **96** |
| SEO | ≥ 95 | 100 | 100 | 100 | **100** |
| CLS | < 0,1 | 0 | 0 | 0 | **0** |
| FCP | — | 2,2 s | 2,2 s | 2,2 s | 2,2 s |
| LCP | — | 3,9 s | 3,8 s | 4,1 s | 3,9 s |
| TBT | — | 580 ms | 620 ms | 370 ms | 580 ms |

Run lain pada konfigurasi yang sama memberi Performance 67–79 (variasi TBT 330–760 ms). Elemen
LCP adalah poster rail pertama (gambar `/_next/image` dari `s4.anilist.co`), dengan rincian
TTFB ~100 ms, resource load delay ~60 ms, load duration ~36 ms, dan **element render delay
~450 ms** (main thread sibuk hidrasi). FCP 2,2 s berasal dari HTML ISR besar (9 rail × 12 kartu,
~750 KB sebelum kompresi) + font + chunk React.

Artinya target Performance ≥ 85 **belum tercapai** di mesin ini; A11y/SEO/CLS memenuhi target.
Langkah berikutnya bila target tetap diwajibkan: kurangi jumlah kartu yang dirender per rail di
bawah fold, pindahkan rail setelah rail pertama ke fetch klien, atau ukur ulang di staging dengan
jaringan dan host gambar yang representatif (angka di sini dipengaruhi latensi TMDB/AniList dari
mesin penguji serta beban Chrome/Docker lokal). Jangan menaikkan angka secara manual di dokumen.

## Checklist manual

### Publik

- [ ] Beranda: hero, rail tren/baru/rating/anime/film/series/genre, continue watching.
- [ ] `/film`, `/series`, `/anime`, `/trending`, `/baru`: filter genre/provider/sort, pagination,
      empty state, dan reset filter.
- [ ] Detail: trailer dialog, report (validasi + sukses), share, offers provider resmi, badge Vidio.
- [ ] Episode → `/watch`: player HLS, kualitas, subtitle bila ada, fallback pesan bila stream
      tidak tersedia, offer provider.
- [ ] `/cari`: query pendek ditolak, hasil kosong, typeahead keyboard (panah/Enter/Escape).
- [ ] Simpanan/riwayat bertahan setelah reload dan bisa dihapus.
- [ ] `/en` untuk beranda, detail, pencarian, dan admin.
- [ ] `/dmca`, `/privasi`, `/syarat`, `/tentang` terisi dan menautkan kontak.
- [ ] 404 ber-CSS untuk slug tak dikenal; tidak ada 500.
- [ ] Tema gelap/terang tanpa flash (cookie) dan menghormati `prefers-color-scheme` saat kosong.
- [ ] Skip link, fokus keyboard, `aria-*` dialog/listbox, kontras teks.

### Admin & operasi

- [ ] Guard redirect, login benar/salah, throttle 10/15 menit, logout menghapus cookie.
- [ ] Moderasi laporan, edit status judul TMDB/AniList, edit penuh + `streamUrl` hanya `OWN`.
- [ ] Riwayat sync, status worker, trigger job (dengan/tanpa Redis).
- [ ] `/admin` mengirim `no-store` + `X-Robots-Tag: noindex`.
- [ ] `pnpm smoke:urls` hijau; `/api/health` sesuai; heartbeat worker segar.
- [ ] Backup terbaru bisa direstore ke DB scratch.

### Kepatuhan data

- [ ] Tidak ada `.m3u8`/video yang di-rehost; playback memakai file `OWN` atau provider resmi.
- [ ] Tidak ada scraper/Cloudflare bypass; metadata hanya TMDB/AniList.
- [ ] `ads.txt` hanya berisi seller resmi dari jaringan.
- [ ] Atribusi TMDB tampil di footer/konten sesuai ketentuan.
