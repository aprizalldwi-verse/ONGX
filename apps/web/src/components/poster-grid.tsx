import type { TitleCardView } from "@/lib/titles/view";

import { PosterCard } from "./poster-card";

export interface PosterGridProps {
  items: TitleCardView[];
}

export function PosterGrid({ items }: PosterGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item, index) => (
        <PosterCard key={item.id} item={item} priority={index < 6} />
      ))}
    </div>
  );
}
