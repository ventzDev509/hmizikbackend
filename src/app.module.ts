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

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, MailModule, ProfilesModule,SupabaseModule, TracksModule, LikesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
