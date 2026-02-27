import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, InternalServerErrorException } from '@nestjs/common';

@Injectable()
export class MailService {
    constructor(private mailerService: MailerService) { }

    async sendUserConfirmation(user: any, token: string) {
        const url = `https://h-mizik.com/confirm?token=${token}`; // Lyen React la

        try {
            await this.mailerService.sendMail({
                to: user.email,
                subject: 'Byenvini nan H-Mizik! Konfime imèl ou',
                template: './confirmation', // Si w itilize templates, sinon sèvi ak 'html' anba a
                html: `
  <div style="background-color: #121212; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px; border-radius: 12px; text-align: center;">
    
    <div style="margin-bottom: 30px;">
      <h1 style="color: #1DB954; font-size: 28px; letter-spacing: 2px; margin: 0;">H-MIZIK</h1>
    </div>

    <div style="background-color: #181818; padding: 30px; border-radius: 8px; border: 1px solid #282828;">
      <h2 style="color: #ffffff; font-size: 22px; margin-top: 0;">Bonjou, ${user.name}!</h2>
      <p style="color: #b3b3b3; font-size: 16px; line-height: 1.5;">
        Byenvini nan kominote <strong>H-Mizik</strong> la. Nou kontan wè ou! 
        Pou w ka kòmanse koute pi bon mizik yo, tanpri konfime kont ou anba a.
      </p>

      <div style="margin: 35px 0;">
        <a href="${url}" style="background-color: #1DB954; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; font-size: 16px; display: inline-block; transition: background-color 0.3s;">
          Konfime Kont Mwen
        </a>
      </div>

      <p style="color: #727272; font-size: 13px;">
        Si bouton an pa mache, kopye lyen sa a nan navigatè w la:<br>
        <span style="color: #1DB954;">${url}</span>
      </p>
    </div>

    <div style="margin-top: 30px; color: #727272; font-size: 12px;">
      <p>© 2026 H-Mizik Inc. Tout dwa rezève.</p>
      <p>Si ou pa t mande imèl sa a, ou mèt inore l san pwoblèm.</p>
      <div style="margin-top: 15px;">
        <a href="#" style="color: #b3b3b3; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
        <a href="#" style="color: #b3b3b3; text-decoration: none; margin: 0 10px;">Support</a>
      </div>
    </div>
  </div>
`,
            });
        } catch (error) {
            throw new InternalServerErrorException({
                errorCode: 'ERR_MAIL_SEND_FAILED',
                message: 'Nou pa t ka voye imèl konfimasyon an.' + error,
            });
        }
    }
}