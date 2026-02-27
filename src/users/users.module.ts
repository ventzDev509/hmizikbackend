import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport'; // Ou te manke import sa a
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
@Module({
  imports: [
    // 1. Nou aktive Passport pou modil sa a
    PassportModule.register({ defaultStrategy: 'google' }),
    
    // 2. Konfigirasyon JWT
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'SUPER_SECRET_KEY',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService, 
    GoogleStrategy ,
    JwtStrategy
  ],
  exports: [UsersService], 
})
export class UsersModule { }