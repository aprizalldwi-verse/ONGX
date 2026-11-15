import { Fragment } from "react";

import { adSlotId, inGridSlotAfterCard } from "@/lib/ads";
import type { TitleCardView } from "@/lib/titles/view";

import { AdSlot } from "./ad-slot";
import { PosterCard } from "./poster-card";

export interface PosterGridProps {
  items: TitleCardView[];
  /** Separates `data-slot-id` when one page renders more than one grid. */
  slotScope?: string;
}

export function PosterGrid({ items, slotScope = "grid" }: PosterGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item, index) => (
        <Fragment key={item.id}>
          <PosterCard item={item} priority={index < 6} />
          {inGridSlotAfterCard(index) ? (
            <AdSlot variant="in-grid" slotId={adSlotId("in-grid", index, slotScope)} />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
