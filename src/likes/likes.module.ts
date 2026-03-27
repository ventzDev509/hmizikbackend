import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { NotificationModule } from '../notification/notification.module';
@Module({
  imports: [NotificationModule],
  providers: [LikesService],
  controllers: [LikesController],
  
})
export class LikesModule {}
