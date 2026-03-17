-- AlterTable
ALTER TABLE "Like" ADD COLUMN     "albumId" TEXT;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;
