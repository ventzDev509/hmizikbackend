import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class LikesService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService // 2. Enjekte sèvis la
    ) { }

    async toggleLike(userId: string, targetId: string, type: 'track' | 'album' = 'track') {
        try {
            let recipientId: string | null = null;

            if (type === 'track') {
                const track = await this.prisma.track.findUnique({
                    where: { id: targetId },
                    include: { artist: true } // Nou include artist pou n ka jwenn userId a
                });
                if (!track) throw new NotFoundException("Mizik pa egziste.");

                // Isit la, tcheke si se track.artist.userId oswa track.userId
                recipientId = track.artist?.userId || (track as any).userId;
            } else {
                const album = await this.prisma.album.findUnique({
                    where: { id: targetId },
                    include: { artist: true }
                });
                if (!album) throw new NotFoundException("Album pa egziste.");
                recipientId = album.artist?.userId || (album as any).userId;
            }

            // ... rès lojik Like/Unlike la ...
            const existingLike = await this.prisma.like.findFirst({
                where: {
                    userId: userId,
                    trackId: type === 'track' ? targetId : null,
                    albumId: type === 'album' ? targetId : null,
                },
            });

            if (existingLike) {
                await this.prisma.like.delete({ where: { id: existingLike.id } });
                return { liked: false, message: "Retire." };
            } else {
                await this.prisma.like.create({
                    data: {
                        userId: userId,
                        trackId: type === 'track' ? targetId : null,
                        albumId: type === 'album' ? targetId : null,
                    },
                });

                // VOYE NOTIFIKASYON
                if (recipientId && recipientId !== userId) {
                    await this.notificationService.createNotification({
                        recipientId: recipientId,
                        senderId: userId,
                        type: type === 'track' ? 'LIKE_TRACK' : 'LIKE_ALBUM',
                        relatedId: targetId,
                    });
                }
                return { liked: true, message: "Ajoute." };
            }
        } catch (error) {
            throw error;
        }
    }
    // B. JWENN TOUT FAVORIS (MIZIK AK ALBUM)
    async getUserFavorites(userId: string) {
        const likes = await this.prisma.like.findMany({
            where: { userId },
            include: {
                // Rale Mizik yo
                track: {
                    include: {
                        artist: {
                            select: { username: true, avatarUrl: true }
                        }
                    }
                },
                // Rale Album yo
                album: {
                    include: {
                        artist: {
                            select: { username: true } // Ajoute select ou bezwen yo
                        },
                        tracks: true // Si w vle tracks ki nan album nan tou
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Filtre ak map done yo pou nou separe yo
        return {
            tracks: likes.filter(like => like.track).map(like => like.track),
            albums: likes.filter(like => like.album).map(like => like.album)
        };
    }

    async checkIfLiked(userId: string, trackId: string) {
        const like = await this.prisma.like.findUnique({
            where: {
                userId_trackId: { userId, trackId },
            },
        });
        return { isLiked: !!like };
    }
}