import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { NotificationModule } from '../notification/notification.module';
import { PlaylistModule } from 'src/playlist/playlist.module';
@Module({
  imports: [NotificationModule,PlaylistModule],
  providers: [LikesService],
  controllers: [LikesController],
  
})
export class LikesModule {}
