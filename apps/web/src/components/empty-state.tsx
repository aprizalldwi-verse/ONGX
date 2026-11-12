import { Button, cn } from "@ongx/ui";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  body: string;
  action?: { label: string; href: string };
  className?: string;
}

export function EmptyState({ icon: Icon, title, body, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--surface)] px-6 py-10 text-center",
        className,
      )}
    >
      {Icon ? (
        <Icon aria-hidden="true" className="size-8 text-[var(--fg-dim)]" strokeWidth={1.5} />
      ) : null}
      <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
      <p className="max-w-prose text-sm text-[var(--fg-dim)]">{body}</p>
      {action ? (
        <Button asChild variant="outline" size="sm" className="mt-1">
          <a href={action.href}>{action.label}</a>
        </Button>
      ) : null}
    </div>
  );
}
