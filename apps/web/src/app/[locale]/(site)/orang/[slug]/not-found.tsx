import { Button } from "@ongx/ui";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="mx-auto max-w-md space-y-3 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-[var(--fg-dim)]">{t("body")}</p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
