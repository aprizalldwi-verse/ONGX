import { Button } from "@ongx/ui";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="mx-auto w-full max-w-md px-4 py-24 text-center">
      <meta name="robots" content="noindex" />
      <p className="font-display text-6xl font-bold tracking-tight text-[var(--accent)]">404</p>
      <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-[var(--fg-dim)]">{t("body")}</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}
