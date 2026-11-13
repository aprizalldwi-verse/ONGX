"use client";

import { Button } from "@ongx/ui";
import { Check, Copy, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export interface ShareRowProps {
  title: string;
}

export function ShareRow({ title }: ShareRowProps) {
  const t = useTranslations("share");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  async function copy(): Promise<void> {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare(): Promise<void> {
    if (!url || !canNativeShare) return;
    try {
      await navigator.share({ title, url });
    } catch {
      // The user cancelled the sheet; nothing to do.
    }
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--fg-dim)]">
        {t("title")}
      </span>

      <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!url}>
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? t("copied") : t("copy")}
      </Button>

      <Button asChild variant="outline" size="sm">
        <a
          href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("whatsapp")}
        </a>
      </Button>

      <Button asChild variant="outline" size="sm">
        <a
          href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("telegram")}
        </a>
      </Button>

      <Button asChild variant="outline" size="sm">
        <a
          href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("x")}
        </a>
      </Button>

      {canNativeShare ? (
        <Button type="button" variant="ghost" size="sm" onClick={nativeShare}>
          <Share2 aria-hidden="true" />
          {t("native")}
        </Button>
      ) : null}
    </div>
  );
}
