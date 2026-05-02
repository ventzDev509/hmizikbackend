-- AlterTable
ALTER TABLE "Playlist" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "totalLikesCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Playlist_totalLikesCount_idx" ON "Playlist"("totalLikesCount" DESC);
