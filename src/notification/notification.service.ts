import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asire w chemen an bon
import * as admin from 'firebase-admin';
@Injectable()
export class NotificationService {
    constructor(private prisma: PrismaService) { }

    // 1. Kreye yon nouvo notifikasyon
    async createNotification(data: {
        recipientId: string;
        senderId: string;
        type: string;
        relatedId?: string;
    }) {
        // 1. Sove nan DB a (sa nou te fè anvan an)
        const notification = await this.prisma.notification.create({
            data: data,
        });

        // 2. Chèche Token telefòn moun k ap resevwa a
        const recipient = await this.prisma.user.findUnique({
            where: { id: data.recipientId },
            select: { pushToken: true }
        });

        // 3. Si moun nan gen yon Token, nou voye Push Notification an
        if (recipient?.pushToken) {
            const message: admin.messaging.Message = {
                notification: {
                    title: 'H-MIZIK 🎵',
                    body: data.type === 'FOLLOW'
                        ? `Yon moun kòmanse swiv ou!`
                        : `Ou gen yon nouvo notifikasyon`,
                },
                token: recipient.pushToken,
                // Opsyonèl: voye data anplis pou lè moun nan klike sou li
                data: {
                    type: data.type,
                    relatedId: data.relatedId || '',
                }
            };

            try {
                await admin.messaging().send(message);
                console.log('Push voye ak siksè!');
            } catch (error) {
                console.error('Erè nan voye Push:', error);
            }
        }

        return notification;
    }

    // 2. Jwenn tout notifikasyon yon itilizatè (atis)
    async getUserNotifications(userId: string) {
        return this.prisma.notification.findMany({
            where: { recipientId: userId },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                recipient: {
                    select: { name: true, profile: true }
                },
                sender: {
                    select: {
                        name: true,
                        profile: { select: { avatarUrl: true, username: true } }
                    }
                },
            }
        });
    }

    async getUnreadCount(userId: string) {
        const count = await this.prisma.notification.count({
            where: {
                recipientId: userId,
                read: false,
            },
        });
        return { count };
    }

    // 4. Mete notifikasyon yo kòm "Li" (Read)
    async markAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: {
                recipientId: userId,
                read: false,
            },
            data: { read: true },
        });
    }

    // Nan NotificationService
    async updatePushToken(userId: string, token: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { pushToken: token },
        });
    }
}