import { Link } from "@/i18n/navigation";

export interface BreadcrumbItem {
  name: string;
  href?: string | undefined;
}

/**
 * Visible breadcrumb trail. The matching `BreadcrumbList` JSON-LD is rendered by
 * the page so both always use the same labels and order.
 */
export function Breadcrumb({ items }: { items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-[var(--fg-dim)]">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const last = index === items.length - 1;

          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-1.5">
              {item.href !== undefined && !last ? (
                <Link href={item.href} className="transition-colors hover:text-[var(--accent)]">
                  {item.name}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="text-[var(--fg)]">
                  {item.name}
                </span>
              )}
              {last ? null : (
                <span aria-hidden="true" className="text-[var(--fg-dim)]/60">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
