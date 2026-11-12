export { prisma } from "./client";
export { GENRES, genreSlugs, type GenreSeed } from "./genres";
export type { PrismaClient } from "@prisma/client";
export type {
  AdminUser,
  Credit,
  Episode,
  Genre,
  Person,
  Redirect,
  Source,
  SyncJob,
  Title,
  WatchOffer,
} from "@prisma/client";
export { CreditRole, Kind, OfferType, SyncStatus, TitleStatus } from "@prisma/client";
