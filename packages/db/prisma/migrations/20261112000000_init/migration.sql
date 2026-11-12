-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('TMDB', 'ANILIST', 'OWN');

-- CreateEnum
CREATE TYPE "Kind" AS ENUM ('MOVIE', 'SERIES', 'EPISODE');

-- CreateEnum
CREATE TYPE "TitleStatus" AS ENUM ('DRAFT', 'LIVE', 'BROKEN', 'GONE');

-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('FLATRATE', 'FREE', 'ADS', 'RENT', 'BUY');

-- CreateEnum
CREATE TYPE "CreditRole" AS ENUM ('CAST', 'CREW');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Title" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "kind" "Kind" NOT NULL,
    "remoteId" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "titleEn" TEXT,
    "titleNative" TEXT,
    "synopsis" TEXT,
    "year" INTEGER,
    "releasedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "rating" DOUBLE PRECISION,
    "voteCount" INTEGER,
    "popularity" DOUBLE PRECISION,
    "posterPath" TEXT NOT NULL,
    "backdropPath" TEXT,
    "trailerKey" TEXT,
    "ageRating" TEXT,
    "country" TEXT,
    "language" TEXT,
    "status" "TitleStatus" NOT NULL DEFAULT 'LIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "tmdbId" INTEGER,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TitleGenre" (
    "titleId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "TitleGenre_pkey" PRIMARY KEY ("titleId","genreId")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imagePath" TEXT,
    "tmdbId" INTEGER,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" "CreditRole" NOT NULL,
    "label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchOffer" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "offerType" "OfferType" NOT NULL,
    "url" TEXT NOT NULL,
    "logoPath" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "synopsis" TEXT,
    "airDate" TIMESTAMP(3),
    "durationSec" INTEGER,
    "stillPath" TEXT,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" TEXT NOT NULL,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "source" "Source" NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsIn" INTEGER NOT NULL DEFAULT 0,
    "itemsOut" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "meta" JSONB,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Title_slug_key" ON "Title"("slug");

-- CreateIndex
CREATE INDEX "Title_kind_status_popularity_idx" ON "Title"("kind", "status", "popularity" DESC);

-- CreateIndex
CREATE INDEX "Title_releasedAt_idx" ON "Title"("releasedAt" DESC);

-- CreateIndex
CREATE INDEX "Title_year_idx" ON "Title"("year");

-- CreateIndex
CREATE UNIQUE INDEX "Title_source_kind_remoteId_key" ON "Title"("source", "kind", "remoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_tmdbId_key" ON "Genre"("tmdbId");

-- CreateIndex
CREATE INDEX "TitleGenre_genreId_idx" ON "TitleGenre"("genreId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Person_tmdbId_key" ON "Person"("tmdbId");

-- CreateIndex
CREATE INDEX "Credit_personId_idx" ON "Credit"("personId");

-- CreateIndex
CREATE INDEX "Credit_titleId_role_position_idx" ON "Credit"("titleId", "role", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Credit_titleId_personId_role_label_key" ON "Credit"("titleId", "personId", "role", "label");

-- CreateIndex
CREATE INDEX "WatchOffer_region_offerType_idx" ON "WatchOffer"("region", "offerType");

-- CreateIndex
CREATE UNIQUE INDEX "WatchOffer_titleId_region_providerId_offerType_key" ON "WatchOffer"("titleId", "region", "providerId", "offerType");

-- CreateIndex
CREATE INDEX "Episode_titleId_season_number_idx" ON "Episode"("titleId", "season", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_titleId_season_number_key" ON "Episode"("titleId", "season", "number");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_username_key" ON "AdminUser"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_fromPath_key" ON "Redirect"("fromPath");

-- CreateIndex
CREATE INDEX "SyncJob_source_startedAt_idx" ON "SyncJob"("source", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "SyncJob_status_idx" ON "SyncJob"("status");

-- AddForeignKey
ALTER TABLE "TitleGenre" ADD CONSTRAINT "TitleGenre_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TitleGenre" ADD CONSTRAINT "TitleGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchOffer" ADD CONSTRAINT "WatchOffer_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;

