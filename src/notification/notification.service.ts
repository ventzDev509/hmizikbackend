import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 
import * as admin from 'firebase-admin';
@Injectable()
export class NotificationService {
    constructor(private prisma: PrismaService) { }

    
    async createNotification(data: {
        recipientId: string;
        senderId: string;
        type: string;
        relatedId?: string;
    }) {
        
        const notification = await this.prisma.notification.create({
            data: data,
        });

        
        const recipient = await this.prisma.user.findUnique({
            where: { id: data.recipientId },
            select: { pushToken: true }
        });

        
        if (recipient?.pushToken) {
            const message: admin.messaging.Message = {
                notification: {
                    title: 'H-MIZIK 🎵',
                    body: data.type === 'FOLLOW'
                        ? `Yon moun kòmanse swiv ou!`
                        : `Ou gen yon nouvo notifikasyon`,
                },
                token: recipient.pushToken,
                
                data: {
                    type: data.type,
                    relatedId: data.relatedId || '',
                }
            };


            try {
                await admin.messaging().send(message);
            } catch (err) {
                console.error("Firebase Push Error:", err);
            }
        }

        return notification;
    }

    
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

    
    async markAsRead(userId: string) {
        return this.prisma.notification.updateMany({
            where: {
                recipientId: userId,
                read: false,
            },
            data: { read: true },
        });
    }

    
    async updatePushToken(userId: string, token: string) {
        try {
            return this.prisma.user.update({
                where: { id: userId },
                data: { pushToken: token },
            });
        } catch (error) {
            console.log(error)
        }
    }
}