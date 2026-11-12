import type { Metadata, Route } from "next";
import Link from "next/link";

import ThemeScript from "@/components/theme-script";
import { barlow, inter } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "404 — ONGX",
  description: "Halaman tidak ditemukan / Page not found.",
  robots: { index: false, follow: false },
};

/**
 * Global 404. `app/[locale]/layout.tsx` owns the real `<html>` shell, so unmatched
 * requests need their own document; this is Next's supported entry point for that
 * (`experimental.globalNotFound`). Copy is bilingual because no locale is known here.
 */
export default function GlobalNotFound() {
  return (
    <html lang="id" data-theme="dark" className={`${inter.variable} ${barlow.variable}`}>
      <body className="min-h-dvh bg-[var(--bg)] text-[var(--fg)] antialiased">
        <ThemeScript />
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-4 text-center">
          <p className="font-display text-6xl font-bold tracking-tight text-[var(--accent)]">404</p>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">
            <span lang="id">Halaman tidak ditemukan</span>
            <span aria-hidden="true" className="text-[var(--fg-dim)]">
              {" / "}
            </span>
            <span lang="en">Page not found</span>
          </h1>
          <p lang="id" className="mt-2 text-sm text-[var(--fg-dim)]">
            Tautan mungkin sudah berubah atau kontennya belum tersedia.
          </p>
          <p lang="en" className="mt-1 text-sm text-[var(--fg-dim)]">
            The link may have changed, or the content is not available yet.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href={"/" as Route}
              hrefLang="id"
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-[var(--line)] px-4 text-sm font-medium transition-colors hover:border-[var(--accent)]"
            >
              Kembali ke beranda
            </Link>
            <Link
              href={"/en" as Route}
              hrefLang="en"
              className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] border border-[var(--line)] px-4 text-sm font-medium transition-colors hover:border-[var(--accent)]"
            >
              Back to home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
