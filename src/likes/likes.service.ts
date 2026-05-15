import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';
import { PlaylistService } from 'src/playlist/playlist.service';

@Injectable()
export class LikesService {
    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
        private playlistService: PlaylistService
    ) { }

    async toggleLike(userId: string, targetId: string, type: 'track' | 'album' = 'track') {
        try {
            let recipientId: string | null = null;

            if (type === 'track') {
                const track = await this.prisma.track.findUnique({
                    where: { id: targetId },
                    include: { artist: true } 
                });
                if (!track) throw new NotFoundException("Mizik pa egziste.");

                
                recipientId = track.artist?.userId || (track as any).userId;
            } else {
                const album = await this.prisma.album.findUnique({
                    where: { id: targetId },
                    include: { artist: true }
                });
                if (!album) throw new NotFoundException("Album pa egziste.");
                recipientId = album.artist?.userId || (album as any).userId;
            }

            
            const existingLike = await this.prisma.like.findFirst({
                where: {
                    userId: userId,
                    trackId: type === 'track' ? targetId : null,
                    albumId: type === 'album' ? targetId : null,
                },
            });

            if (existingLike) {
                await this.prisma.like.delete({ where: { id: existingLike.id } });
                await this.playlistService.syncPlaylistScores(targetId, false);
                return { liked: false, message: "Retire." };
            } else {
                await this.prisma.like.create({
                    data: {
                        userId: userId,
                        trackId: type === 'track' ? targetId : null,
                        albumId: type === 'album' ? targetId : null,
                    },
                });
                await this.playlistService.syncPlaylistScores(targetId, true);
                
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
    
    async getUserFavorites(userId: string) {
        const likes = await this.prisma.like.findMany({
            where: { userId },
            include: {
                
                track: {
                    include: {
                        artist: {
                            select: { username: true, avatarUrl: true }
                        }
                    }
                },
                
                album: {
                    include: {
                        artist: {
                            select: { username: true } 
                        },
                        tracks: true 
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        
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