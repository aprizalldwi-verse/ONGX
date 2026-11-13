export { prisma } from "./client";
export { GENRES, genreSlugs, type GenreSeed } from "./genres";
export { Prisma } from "@prisma/client";
export type { PrismaClient } from "@prisma/client";
export type {
  AdminUser,
  Credit,
  Episode,
  Genre,
  Person,
  Redirect,
  Report,
  Source,
  SyncJob,
  Title,
  WatchOffer,
} from "@prisma/client";
export { CreditRole, Kind, OfferType, ReportStatus, SyncStatus, TitleStatus } from "@prisma/client";
