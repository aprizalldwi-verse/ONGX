import { prisma } from "@ongx/db";

import { E2E_TITLE_ID } from "./global-setup";

export default async function globalTeardown(): Promise<void> {
  // Cascades episodes/offers; reports keep their row but lose the title link.
  await prisma.title.deleteMany({ where: { id: E2E_TITLE_ID } });
  await prisma.report.deleteMany({ where: { message: "E2E smoke report" } });
}
