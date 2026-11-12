import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

import { GENRES } from "../src/genres";

const prisma = new PrismaClient();

async function seedGenres(): Promise<void> {
  for (const genre of GENRES) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      create: {
        slug: genre.slug,
        nameId: genre.nameId,
        nameEn: genre.nameEn,
        tmdbId: genre.tmdbId,
      },
      update: {
        nameId: genre.nameId,
        nameEn: genre.nameEn,
        tmdbId: genre.tmdbId,
      },
    });
  }

  console.log(`[seed] ${GENRES.length} genre siap.`);
}

async function seedAdmin(): Promise<void> {
  const username = process.env.ADMIN_USER?.trim() || "admin";
  const password = process.env.ADMIN_PASS?.trim();
  const passwordHash = process.env.ADMIN_PASS_HASH?.trim();

  if (!password && !passwordHash) {
    console.warn("[seed] ADMIN_PASS / ADMIN_PASS_HASH kosong — admin dilewati.");
    return;
  }

  const resolvedHash = passwordHash ?? (await hash(password as string, 12));

  if (!passwordHash) {
    console.warn("[seed] ADMIN_PASS dipakai sekali; simpan hash ini di ADMIN_PASS_HASH:");
    console.warn(resolvedHash);
  }

  await prisma.adminUser.upsert({
    where: { username },
    create: { username, passwordHash: resolvedHash },
    update: { passwordHash: resolvedHash },
  });

  console.log(`[seed] admin "${username}" siap.`);
}

async function main(): Promise<void> {
  await seedGenres();
  await seedAdmin();
}

main()
  .catch((error: unknown) => {
    console.error("[seed] gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
