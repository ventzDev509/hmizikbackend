import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { ProfilesModule } from './profiles/profiles.module';

@Module({
  imports: [PrismaModule, AuthModule, UsersModule, MailModule, ProfilesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
