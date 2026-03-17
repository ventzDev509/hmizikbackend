import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { ProfilesModule } from './profiles/profiles.module';
import { TracksModule } from './tracks/tracks.module';
import { SupabaseModule } from './common/supabase.module';
import { LikesModule } from './likes/likes.module';
import { PlaylistModule } from './playlist/playlist.module';
import { AlbumModule } from './album/album.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PublishService } from './album/publish.service';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, MailModule, ProfilesModule,SupabaseModule, TracksModule, LikesModule, PlaylistModule, AlbumModule,ScheduleModule.forRoot()],
  controllers: [AppController],
  providers: [AppService,PublishService],
})
export class AppModule {}
