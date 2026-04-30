-- CreateTable
CREATE TABLE "RecommendationFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecommendationFeedback_userId_trackId_idx" ON "RecommendationFeedback"("userId", "trackId");

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
