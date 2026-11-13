"use client";

import { Button, Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@ongx/ui";
import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export interface FilterSheetProps {
  label: string;
  title: string;
  children: ReactNode;
}

/**
 * Mobile filter panel. The form inside navigates with a native GET submit, so a
 * full document navigation closes the sheet without any client-side state.
 */
export function FilterSheet({ label, title, children }: FilterSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-10">
          <SlidersHorizontal aria-hidden="true" />
          {label}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" aria-describedby={undefined} className="md:hidden">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
