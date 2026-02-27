import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: 'http://localhost:3000/users/google/callback',
      scope: ['email', 'profile'],
    });
  }

  // Retire 'payload' nan paramèt yo, li pa egziste isit la
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    try {
      const { name, emails, photos } = profile;

      // Nou prepare objè user a sèlman ak done Google voye yo
      const user = {
        email: emails[0].value,
        firstName: name.givenName,
        lastName: name.familyName,
        picture: photos[0].value,
        accessToken,
      };

      // Nou voye user a bay Passport (l ap disponib nan req.user)
      done(null, user);
    } catch (error) {
      console.error("Erè nan validate Google:", error);
      done(undefined, "");
    }
  }
}