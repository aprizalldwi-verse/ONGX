"use client";

import { Search, X } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { useRouter } from "@/i18n/navigation";
import { VIDIO_PROVIDER_NAME } from "@/lib/providers";
import { searchResponseSchema, SEARCH_MIN_LENGTH, type SearchItem } from "@/lib/search";

type Status = "idle" | "loading" | "done" | "error";

export interface SearchCommandProps {
  /** `popover` floats over the page; `inline` pushes content down (mobile sheet). */
  variant?: "popover" | "inline";
  initialQuery?: string;
  onNavigate?: () => void;
  className?: string;
}

const DEBOUNCE_MS = 300;

export function SearchCommand({
  variant = "popover",
  initialQuery = "",
  onNavigate,
  className,
}: SearchCommandProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const inputId = useId();
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState(initialQuery);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const normalized = query.replace(/\s+/g, " ").trim();
  const searchable = normalized.length >= SEARCH_MIN_LENGTH;
  const showList =
    open && searchable && (status === "loading" || status === "done" || status === "error");

  useEffect(() => {
    abortRef.current?.abort();

    if (!searchable) {
      setItems([]);
      setStatus("idle");
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: normalized, locale });

      fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(`search failed: ${response.status}`);
          return (await response.json()) as unknown;
        })
        .then((payload) => {
          const parsed = searchResponseSchema.safeParse(payload);
          if (!parsed.success) throw new Error("invalid search response");
          setItems(parsed.data.items);
          setStatus("done");
          setActiveIndex(-1);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setItems([]);
          setStatus("error");
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalized, searchable, locale]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function go(href: string): void {
    setOpen(false);
    setActiveIndex(-1);
    onNavigate?.();
    router.push(href);
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const target = items[activeIndex];
    if (target) {
      go(target.href);
      return;
    }

    if (!searchable) return;
    go(`/cari?q=${encodeURIComponent(normalized)}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (items.length === 0) return;
      setActiveIndex((index) => (index + 1) % items.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1));
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  function clear(): void {
    setQuery("");
    setItems([]);
    setStatus("idle");
    setActiveIndex(-1);
    setOpen(false);
  }

  function kindLabel(item: SearchItem): string {
    if (item.source === "ANILIST") return t("kindAnime");
    return item.kind === "MOVIE" ? t("kindMovie") : t("kindSeries");
  }

  const listClass =
    variant === "popover"
      ? "absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-2xl"
      : "mt-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]";

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`}>
      <form role="search" onSubmit={submit} className="relative">
        <label htmlFor={inputId} className="sr-only">
          {t("title")}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--fg-dim)]"
        />
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={t("placeholder")}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            if (searchable) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="h-10 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] pl-9 pr-9 text-sm text-[var(--fg)] outline-none placeholder:text-[var(--fg-dim)] focus-visible:border-[var(--accent)]"
        />
        {query.length > 0 ? (
          <button
            type="button"
            onClick={clear}
            aria-label={t("clear")}
            className="absolute right-1 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--fg-dim)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </form>

      {showList ? (
        <div className={listClass}>
          <div
            id={listId}
            role="listbox"
            aria-label={t("title")}
            aria-busy={status === "loading"}
            className="max-h-[min(60vh,420px)] overflow-y-auto py-1"
          >
            {status === "loading" && items.length === 0 ? (
              <p className="px-4 py-3 text-sm text-[var(--fg-dim)]">{t("loading")}</p>
            ) : null}

            {status === "error" ? (
              <p className="px-4 py-3 text-sm text-[var(--fg-dim)]">{t("error")}</p>
            ) : null}

            {status === "done" && items.length === 0 ? (
              <div className="px-4 py-3">
                <p className="text-sm font-medium">{t("noResultsTitle")}</p>
                <p className="mt-1 text-xs text-[var(--fg-dim)]">{t("noResultsBody")}</p>
              </div>
            ) : null}

            {items.map((item, index) => (
              <button
                key={item.id}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => go(item.href)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                  index === activeIndex ? "bg-[var(--surface-2)]" : ""
                }`}
              >
                {item.posterUrl ? (
                  <Image
                    src={item.posterUrl}
                    alt=""
                    width={32}
                    height={48}
                    loading="lazy"
                    className="h-12 w-8 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-12 w-8 shrink-0 rounded bg-[var(--surface-2)]"
                  />
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.title}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-[var(--fg-dim)]">
                    {item.year ? <span>{item.year}</span> : null}
                    <span>{kindLabel(item)}</span>
                    {item.availableOnVidio ? (
                      <span className="font-semibold text-[var(--accent)]">
                        {VIDIO_PROVIDER_NAME}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            ))}

            {status === "done" && items.length > 0 ? (
              <button
                type="button"
                onClick={() => go(`/cari?q=${encodeURIComponent(normalized)}`)}
                className="mt-1 block w-full border-t border-[var(--line)] px-4 py-2.5 text-left text-sm font-medium text-[var(--accent)] transition-colors hover:bg-[var(--surface-2)]"
              >
                {t("viewAll")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
