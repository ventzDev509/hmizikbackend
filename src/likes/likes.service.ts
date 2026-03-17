import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
    constructor(private prisma: PrismaService) { }

    // A. LIKE OSWA UNLIKE (TOGGLE) - Jere Track ak Album
    // likes.service.ts

    async toggleLike(userId: string, targetId: string, type: 'track' | 'album' = 'track') {
        try {
            // 1. VERIFIKASYON EXISTANS
            if (type === 'track') {
                const track = await this.prisma.track.findUnique({ where: { id: targetId } });
                if (!track) throw new NotFoundException("Mizik pa egziste.");
            } else {
                const album = await this.prisma.album.findUnique({
                    where: { id: targetId }
                });
                if (!album) throw new NotFoundException("Album pa egziste.");
            }

            // 2. CHÈCHE LIKE LA
            const existingLike = await this.prisma.like.findFirst({
                where: {
                    userId: userId,
                    trackId: type === 'track' ? targetId : null,
                    albumId: type === 'album' ? targetId : null,
                },
            });

            if (existingLike) {
                await this.prisma.like.delete({ where: { id: existingLike.id } });
                return { liked: false, message: "Retire nan favorites." };
            } else {
                // 3. KREYE LIKE LA
                await this.prisma.like.create({
                    data: {
                        userId: userId,
                        trackId: type === 'track' ? targetId : null,
                        albumId: type === 'album' ? targetId : null,
                    },
                });
                return { liked: true, message: "Ajoute nan favorites." };
            }
        } catch (error) {
            console.error("Erè nan toggleLike:", error);
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