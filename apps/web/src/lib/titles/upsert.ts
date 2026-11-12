import type { PrismaClient } from "@ongx/db";
import {
  buildTitleSlug,
  slugify,
  type NormalizedGenre,
  type NormalizedPerson,
  type NormalizedTitle,
} from "@ongx/shared";

import { compact } from "@/lib/compact";

import { uniqueCredits, uniqueGenres } from "./dedupe";
import { freeSlug, stripCollisionSuffix, titlePath } from "./slug";

export interface UpsertResult {
  action: "created" | "updated" | "skipped";
  reason?: string;
  titleId?: string;
  slug?: string;
  /** Old path, when the slug changed and a 301 redirect was recorded. */
  redirectFrom?: string;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function displayName(input: NormalizedTitle): string | undefined {
  return input.titleId?.trim() || input.titleEn?.trim() || input.titleNative?.trim() || undefined;
}

/**
 * Idempotent write for one normalized title.
 *
 * - Upserts by `(source, kind, remoteId)`.
 * - Keeps existing slugs stable; re-slugs only when the title/year base changes
 *   and writes a `Redirect` row so old URLs keep working.
 * - Replaces genres/credits/offers on every run so stale relations disappear.
 */
export async function upsertTitle(db: PrismaClient, input: NormalizedTitle): Promise<UpsertResult> {
  if (!input.posterPath) {
    return { action: "skipped", reason: "missing-poster" };
  }

  const name = displayName(input);
  if (!name) return { action: "skipped", reason: "missing-title" };

  const desiredBase = buildTitleSlug(name, input.year);
  let redirectFrom: string | undefined;

  return db.$transaction(async (tx) => {
    const existing = await tx.title.findUnique({
      where: {
        source_kind_remoteId: {
          source: input.source,
          kind: input.kind,
          remoteId: input.remoteId,
        },
      },
      select: { id: true, slug: true },
    });

    const titleSlugTaken = async (candidate: string, excludeId?: string): Promise<boolean> => {
      const row = await tx.title.findUnique({ where: { slug: candidate }, select: { id: true } });
      return row !== null && row.id !== excludeId;
    };

    let slug: string;
    if (!existing) {
      slug = await freeSlug(desiredBase, (candidate) => titleSlugTaken(candidate));
    } else if (stripCollisionSuffix(existing.slug) === desiredBase) {
      slug = existing.slug;
    } else {
      const next = await freeSlug(desiredBase, (candidate) =>
        titleSlugTaken(candidate, existing.id),
      );
      if (next !== existing.slug && input.kind !== "EPISODE") {
        redirectFrom = titlePath(input.kind, existing.slug);
      }
      slug = next;
    }

    const resolveGenre = async (genre: NormalizedGenre): Promise<string> => {
      if (genre.tmdbId !== undefined) {
        const row = await tx.genre.upsert({
          where: { tmdbId: genre.tmdbId },
          update: { nameId: genre.nameId, nameEn: genre.nameEn },
          create: {
            slug: genre.slug,
            nameId: genre.nameId,
            nameEn: genre.nameEn,
            tmdbId: genre.tmdbId,
          },
          select: { id: true },
        });
        return row.id;
      }

      const row = await tx.genre.upsert({
        where: { slug: genre.slug },
        update: { nameId: genre.nameId, nameEn: genre.nameEn },
        create: { slug: genre.slug, nameId: genre.nameId, nameEn: genre.nameEn },
        select: { id: true },
      });
      return row.id;
    };

    const genreIds: string[] = [];
    for (const genre of uniqueGenres(input.genres)) {
      genreIds.push(await resolveGenre(genre));
    }

    const titleFields = {
      slug,
      source: input.source,
      kind: input.kind,
      remoteId: input.remoteId,
      titleId: name,
      posterPath: input.posterPath,
      status: "LIVE" as const,
      ...compact({
        titleEn: input.titleEn,
        titleNative: input.titleNative,
        synopsis: input.synopsis,
        year: input.year ?? null,
        releasedAt: parseDate(input.releasedAt) ?? null,
        durationSec: input.durationSec,
        rating: input.rating,
        voteCount: input.voteCount,
        popularity: input.popularity,
        backdropPath: input.backdropPath,
        trailerKey: input.trailerKey,
        ageRating: input.ageRating,
        country: input.country,
        language: input.language,
      }),
    };

    const genreWrites =
      genreIds.length > 0 ? { create: genreIds.map((genreId) => ({ genreId })) } : { create: [] };

    const title = existing
      ? await tx.title.update({
          where: { id: existing.id },
          data: { ...titleFields, genres: { deleteMany: {}, ...genreWrites } },
          select: { id: true },
        })
      : await tx.title.create({
          data: { ...titleFields, genres: genreWrites },
          select: { id: true },
        });

    const resolvePerson = async (person: NormalizedPerson): Promise<string> => {
      const existingPerson =
        person.tmdbId !== undefined
          ? await tx.person.findUnique({ where: { tmdbId: person.tmdbId }, select: { id: true } })
          : await tx.person.findUnique({ where: { slug: person.slug }, select: { id: true } });

      if (existingPerson) {
        await tx.person.update({
          where: { id: existingPerson.id },
          data: compact({ name: person.name, imagePath: person.imagePath ?? null }),
        });
        return existingPerson.id;
      }

      const taken = async (candidate: string): Promise<boolean> => {
        const row = await tx.person.findUnique({
          where: { slug: candidate },
          select: { id: true },
        });
        return row !== null;
      };
      const personSlug = await freeSlug(person.slug || slugify(person.name), taken);

      const created = await tx.person.create({
        data: {
          slug: personSlug,
          name: person.name,
          ...compact({
            imagePath: person.imagePath,
            tmdbId: person.tmdbId,
          }),
        },
        select: { id: true },
      });
      return created.id;
    };

    const credits: {
      personId: string;
      role: "CAST" | "CREW";
      label: string | null;
      position: number;
    }[] = [];

    for (const person of uniqueCredits(input.people)) {
      credits.push({
        personId: await resolvePerson(person),
        role: person.role ?? "CAST",
        label: person.label ?? null,
        position: person.position ?? credits.length,
      });
    }

    await tx.credit.deleteMany({ where: { titleId: title.id } });
    if (credits.length > 0) {
      await tx.credit.createMany({
        data: credits.map((credit) => ({ titleId: title.id, ...credit })),
        skipDuplicates: true,
      });
    }

    await tx.watchOffer.deleteMany({ where: { titleId: title.id } });
    if (input.offers.length > 0) {
      await tx.watchOffer.createMany({
        data: input.offers.map((offer) => ({
          titleId: title.id,
          region: offer.region,
          providerId: offer.providerId,
          providerName: offer.providerName,
          offerType: offer.offerType,
          url: offer.url,
          logoPath: offer.logoPath ?? null,
        })),
        skipDuplicates: true,
      });
    }

    if (redirectFrom !== undefined) {
      const toPath = titlePath(input.kind === "SERIES" ? "SERIES" : "MOVIE", slug);
      await tx.redirect.upsert({
        where: { fromPath: redirectFrom },
        update: { toPath },
        create: { fromPath: redirectFrom, toPath },
      });
    }

    return {
      action: existing ? "updated" : "created",
      titleId: title.id,
      slug,
      ...(redirectFrom !== undefined ? { redirectFrom } : {}),
    };
  });
}
