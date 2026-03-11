-- AlterTable
ALTER TABLE "Track" ADD COLUMN     "playCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Play" (
    "id" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Play_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Play" ADD CONSTRAINT "Play_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
