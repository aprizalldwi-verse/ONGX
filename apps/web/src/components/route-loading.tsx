import { Skeleton } from "@ongx/ui";
import { getTranslations } from "next-intl/server";

export default async function RouteLoading() {
  const t = await getTranslations("common");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8" aria-busy="true">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-full max-w-prose" />
      <Skeleton className="mt-6 aspect-video w-full" />
      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
        {Array.from({ length: 14 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[2/3] w-full" />
        ))}
      </div>
    </div>
  );
}
