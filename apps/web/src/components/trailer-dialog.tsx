"use client";

import { Button } from "@ongx/ui";
import { Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@ongx/ui";

export interface TrailerDialogProps {
  trailerKey: string;
  title: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
}

export function TrailerDialog({
  trailerKey,
  title,
  variant = "outline",
  size = "default",
  label,
}: TrailerDialogProps) {
  const t = useTranslations("trailer");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <Play aria-hidden="true" />
          {label ?? t("play")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl overflow-hidden p-0">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("description")}</DialogDescription>

        <div className="relative aspect-video w-full bg-black">
          {open ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
                trailerKey,
              )}?autoplay=1&rel=0`}
              title={`${t("title")} — ${title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : null}
        </div>

        <DialogClose asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute right-2 top-2 bg-black/70 text-white hover:bg-black"
            aria-label={t("close")}
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
