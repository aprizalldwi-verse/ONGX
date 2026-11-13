"use client";

import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger } from "@ongx/ui";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { SearchCommand } from "./search-command";

/**
 * Inline typeahead on desktop, full-width bottom sheet on mobile. Both mount the
 * same `SearchCommand`, so keyboard behaviour and the API contract stay in one
 * place.
 */
export function HeaderSearch() {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="hidden md:block">
        <SearchCommand className="w-[240px]" />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("open")}>
            <Search aria-hidden="true" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" aria-describedby={undefined} className="md:hidden">
          <SheetTitle className="sr-only">{t("title")}</SheetTitle>
          <SearchCommand variant="inline" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
