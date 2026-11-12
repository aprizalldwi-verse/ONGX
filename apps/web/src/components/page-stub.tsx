import { cn } from "@ongx/ui";
import type { ReactNode } from "react";

export interface PageStubProps {
  badge?: string;
  title: string;
  body: string;
  children?: ReactNode;
  className?: string;
}

export function PageStub({ badge, title, body, children, className }: PageStubProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 py-8", className)}>
      {badge ? (
        <span className="mb-3 inline-flex items-center rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--fg-dim)]">
          {badge}
        </span>
      ) : null}
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 max-w-prose text-sm text-[var(--fg-dim)]">{body}</p>
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  );
}
