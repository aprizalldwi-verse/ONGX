-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Title" ADD COLUMN "streamUrl" TEXT;

-- AlterTable
ALTER TABLE "Episode" ADD COLUMN "streamUrl" TEXT;

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "titleId" TEXT,
    "reason" TEXT NOT NULL,
    "message" TEXT,
    "contact" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Report_titleId_idx" ON "Report"("titleId");

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE SET NULL ON UPDATE CASCADE;
