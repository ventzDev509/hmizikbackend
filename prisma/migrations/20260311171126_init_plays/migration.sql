/*
  Warnings:

  - You are about to drop the column `plays` on the `Track` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Play" DROP CONSTRAINT "Play_trackId_fkey";

-- AlterTable
ALTER TABLE "Play" ADD COLUMN     "userIp" TEXT;

-- AlterTable
ALTER TABLE "Track" DROP COLUMN "plays";

-- CreateIndex
CREATE INDEX "Play_trackId_createdAt_idx" ON "Play"("trackId", "createdAt");

-- AddForeignKey
ALTER TABLE "Play" ADD CONSTRAINT "Play_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
