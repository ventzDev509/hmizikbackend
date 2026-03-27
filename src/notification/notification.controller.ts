import { Controller, Get, Post, UseGuards, Req, Param, Body } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import * as admin from 'firebase-admin';

@Controller('notifications')
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get('test-push/:token')
    async testPush(@Param('token') token: string) {
        try {
            const message = {
                notification: {
                    title: 'H-MIZIK Tès 🎵',
                    body: 'Si ou wè sa, sa vle di tout bagay mache nèt!',
                },
                // Opsyonèl: sa pèmèt notifikasyon an parèt menm si moun lan sou paj la (sou Android)
                android: {
                    notification: {
                        sound: 'default',
                    },
                },
                token: token,
            };

            // Nou itilize admin.messaging() piske se li nou te inisyalize
            const response = await admin.messaging().send(message);
            return { success: true, messageId: response };
        } catch (error) {
            console.error("Erè Firebase:", error);
            return { success: false, error: error.message };
        }
    }

    // --- Wout ki bezwen Sekirite yo ---
    @UseGuards(JwtAuthGuard)
    @Get()
    async getMyNotifications(@Req() req) {
        return this.notificationService.getUserNotifications(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('unread-count')
    async getCount(@Req() req) {
        return this.notificationService.getUnreadCount(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('mark-read')
    async readAll(@Req() req) {
        return this.notificationService.markAsRead(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('update-token')
    async updateToken(@Req() req, @Body('token') token: string) {
        return this.notificationService.updatePushToken(req.user.id, token);
    }
}