import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) { }

  async sendUserConfirmation(user: any, token: string) {
    
    const baseUrl = process.env.LINK?.replace(/\/$/, '');
    const url = `${baseUrl}/confirm?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Aktive kont H-Mizik ou kounye a!',
        
        html: `
        <div style="background-color: #09090b; color: #ffffff; font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 40px; border-radius: 24px; text-align: center; border: 1px solid #1f1f23;">
          
          <div style="margin-bottom: 30px;">
            <div style="background-color: #f97316; width: 50px; height: 50px; border-radius: 12px; margin: 0 auto; display: flex; align-items: center; justify-content: center; transform: rotate(3deg); box-shadow: 0 10px 20px rgba(249, 115, 22, 0.2);">
               <span style="font-size: 24px; color: white; font-weight: bold;">H</span>
            </div>
            <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: -1px; margin-top: 15px; text-transform: uppercase; font-style: italic;">H-MIZIK</h1>
          </div>

          <div style="background-color: #18181b; padding: 40px; border-radius: 16px; border: 1px solid #27272a;">
            <h2 style="color: #ffffff; font-size: 20px; margin-top: 0; font-weight: 800;">Sak pase, ${user.name}! 🇭🇹</h2>
            <p style="color: #a1a1aa; font-size: 15px; line-height: 1.6; margin-bottom: 25px;">
              Nou byen kontan wè ou rantre nan kominote <strong>H-Mizik</strong> la. 
              Pi bon eksperyans mizik ayisyen an ap tann ou. Yon sèl etap ki rete!
            </p>

            <div style="margin: 35px 0;">
              <a href="${url}" style="background-color: #f97316; color: #ffffff; padding: 16px 35px; text-decoration: none; border-radius: 100px; font-weight: 900; font-size: 15px; display: inline-block; text-transform: uppercase; letter-spacing: 1px; transition: all 0.3s ease;">
                Aktive Kont Mwen
              </a>
            </div>

            <p style="color: #52525b; font-size: 12px; margin-top: 30px;">
              Si bouton an pa mache, kopye lyen sa a:<br>
              <a href="${url}" style="color: #f97316; text-decoration: none; word-break: break-all;">${url}</a>
            </p>
          </div>

          <div style="margin-top: 30px; color: #52525b; font-size: 11px;">
            <p>© 2026 H-Mizik Inc. Port-au-Prince, Haiti.</p>
            <p style="margin-top: 10px;">
              <a href="#" style="color: #71717a; text-decoration: none; margin: 0 10px;">Privacy</a> 
              <a href="#" style="color: #71717a; text-decoration: none; margin: 0 10px;">Support</a>
            </p>
          </div>
        </div>
        `,
      });
    } catch (error) {
      console.error('Mail Error:', error);
      throw new InternalServerErrorException({
        errorCode: 'ERR_MAIL_SEND_FAILED',
        message: 'Echèk nan voye imèl la. Tcheke konfigirasyon SMTP ou.',
      });
    }
  }
} 