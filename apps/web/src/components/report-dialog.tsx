"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ongx/ui";
import { Flag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

export interface ReportDialogProps {
  titleId?: string;
  title?: string;
}

type Status = "idle" | "submitting" | "success" | "invalid" | "error";

const inputClass =
  "h-10 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)] px-3 text-sm text-[var(--fg)] outline-none focus-visible:border-[var(--accent)]";

export function ReportDialog({ titleId, title }: ReportDialogProps) {
  const t = useTranslations("report");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  function handleOpenChange(next: boolean): void {
    setOpen(next);
    if (!next) setStatus("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("submitting");

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titleId: titleId ?? null,
          reason: String(data.get("reason") ?? "other"),
          message: String(data.get("message") ?? "").trim() || null,
          contact: String(data.get("contact") ?? "").trim() || null,
        }),
      });

      if (response.ok) {
        setStatus("success");
        form.reset();
        return;
      }

      setStatus(response.status === 400 ? "invalid" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Flag aria-hidden="true" />
          {t("trigger")}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {title ? `${title} — ${t("description")}` : t("description")}
          </DialogDescription>
        </DialogHeader>

        {status === "success" ? (
          <>
            <p className="mt-4 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm">
              {t("success")}
            </p>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button">{t("close")}</Button>
              </DialogClose>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--fg-dim)]">{t("reason")}</span>
              <select name="reason" required defaultValue="broken" className={inputClass}>
                <option value="broken">{t("reasonBroken")}</option>
                <option value="metadata">{t("reasonWrong")}</option>
                <option value="unavailable">{t("reasonUnavailable")}</option>
                <option value="other">{t("reasonOther")}</option>
              </select>
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-[var(--fg-dim)]">{t("message")}</span>
              <textarea
                name="message"
                rows={3}
                maxLength={1_000}
                placeholder={t("messagePlaceholder")}
                className="w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--fg)] outline-none focus-visible:border-[var(--accent)]"
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-[var(--fg-dim)]">{t("contact")}</span>
              <input
                name="contact"
                type="email"
                maxLength={200}
                placeholder={t("contactPlaceholder")}
                className={inputClass}
              />
            </label>

            {status === "invalid" ? (
              <p role="alert" className="text-sm text-[var(--accent)]">
                {t("invalid")}
              </p>
            ) : null}
            {status === "error" ? (
              <p role="alert" className="text-sm text-[var(--accent)]">
                {t("error")}
              </p>
            ) : null}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t("close")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={status === "submitting"}>
                {status === "submitting" ? t("submitting") : t("submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
