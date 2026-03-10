import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
    constructor(private prisma: PrismaService) { }

    // A. LIKE OSWA UNLIKE YON MIZIK (TOGGLE)
    async toggleLike(userId: string, trackId: string) {
        // Tcheke si mizik la egziste
        const track = await this.prisma.track.findUnique({ where: { id: trackId } });
        if (!track) throw new NotFoundException("Mizik sa a pa egziste.");
      
        // Tcheke si itilizatè a te deja like li
        const existingLike = await this.prisma.like.findUnique({
            where: {
                userId_trackId: { userId, trackId },
            },
        });

        if (existingLike) {
            // Si l te deja la, nou retire l (Unlike)
            await this.prisma.like.delete({
                where: { id: existingLike.id },
            });
            return { liked: false, message: "Ou pa renmen mizik sa a ankò." };
        } else {
            // Si l pa t la, nou kreye l (Like)
            await this.prisma.like.create({
                data: { userId, trackId },
            });
            return { liked: true, message: "Ou renmen mizik sa a." };
        }
    }

    // B. JWENN TOUT MIZIK YON MOUN LIKE (POU PLAYLIST FAVORIS)
    async getLikedTracks(userId: string) {
        const likes = await this.prisma.like.findMany({
            where: { userId },
            include: {
                track: {
                    include: {
                        artist: {
                            select: { username: true, avatarUrl: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return likes.map(like => like.track);
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