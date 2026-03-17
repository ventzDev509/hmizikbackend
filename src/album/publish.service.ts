// src/album/publish.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);

  constructor(private prisma: PrismaService) {}

 
  @Cron(CronExpression.EVERY_MINUTE)
  async autoPublishAlbums() {
    const now = new Date();

    try {
      const result = await this.prisma.album.updateMany({
        where: {
          isPublished: false, // Sèlman sa ki poko pibliye
          releaseDate: {
            lte: now, // Si dat la <= kounye a
          },
        },
        data: {
          isPublished: true,
        },
      });

      if (result.count > 0) {
        this.logger.log(`🔥 [Siksè] ${result.count} album(s) fèk pibliye otomatikman!`);
      }
    } catch (error) {
      this.logger.error(`❌ Erè nan sistèm piblikasyon an: ${error.message}`);
    }
  }
}