-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT,
    "audioUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "duration" DOUBLE PRECISION,
    "plays" INTEGER NOT NULL DEFAULT 0,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Track_artistId_idx" ON "Track"("artistId");

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
