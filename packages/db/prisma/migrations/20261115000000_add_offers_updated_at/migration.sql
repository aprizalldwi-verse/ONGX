-- AlterTable
ALTER TABLE "Title" ADD COLUMN     "offersUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Title_source_status_offersUpdatedAt_idx" ON "Title"("source", "status", "offersUpdatedAt");
