import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlaylistService {
    constructor(private prisma: PrismaService) { }

    /**
     * KREYE YON PLAYLIST
     */
    async create(userId: string, name: string, description?: string, coverUrl?: string) {
        return this.prisma.playlist.create({
            data: {
                name,
                description,
                userId,
                coverUrl,
                status: 'active',
                totalLikesCount: 0,
            },
        });
    }

    /**
     * JWENN TOP PLAYLIST POU AKÈY (RANKING LOGIC)
     * Kalkile baze sou sòm total likes mizik ki ladan l yo
     */
    async getTrending() {
        return this.prisma.playlist.findMany({
            where: {
                isPublic: true,
                status: 'active',
                tracks: {
                    some: {}
                }
            },
            orderBy: {
                totalLikesCount: 'desc'
            },
            take: 15,
            include: {
                user: {
                    select: { name: true }
                },
                //  Rekipere 4 premye mizik yo pou kouvèti a
                tracks: {
                    take: 4,
                    select: {
                        id: true,
                        coverUrl: true
                    }
                },
                _count: {
                    select: { tracks: true }
                }
            }
        });
    }
    /**
     * AJOUTE YON MIZIK NAN PLAYLIST
     * Mete ajou nòt total la otomatikman
     */
    async addTrack(playlistId: string, trackId: string) {
        try {
            const isAlreadyInPlaylist = await this.prisma.playlist.findFirst({
                where: {
                    id: playlistId,
                    tracks: { some: { id: trackId } }
                }
            });

            if (isAlreadyInPlaylist) {
                throw new ForbiddenException('Mizik sa a deja nan playlist la');
            }
            // 1. Rekipere mizik la ak KANTITE like li genyen
            const track = await this.prisma.track.findUnique({
                where: { id: trackId },
                include: {
                    _count: {
                        select: { likes: true } // Sa a ap ba ou kantite like la dirèkteman
                    }
                }
            });

            if (!track) throw new NotFoundException('Mizik sa pa egziste');

            // 2. Mizajou playlist la ak kantite sa a
            return this.prisma.playlist.update({
                where: { id: playlistId },
                data: {
                    tracks: { connect: { id: trackId } },
                    totalLikesCount: {
                        // Nou itilize track._count.likes kounye a
                        increment: track._count.likes || 0
                    }
                },
                include: { tracks: true }
            });
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * RETIRE YON MIZIK
     * Soustrè valè likes li nan nòt total la
     */
    async removeTrack(playlistId: string, trackId: string) {
        // 1. Rekipere kantite like mizik la genyen anvan nou dekonekte l
        const track = await this.prisma.track.findUnique({
            where: { id: trackId },
            include: {
                _count: {
                    select: { likes: true }
                }
            }
        });

        if (!track) throw new NotFoundException('Mizik sa pa egziste');

        // 2. Retire mizik la epi dekremente totalLikesCount la
        return this.prisma.playlist.update({
            where: { id: playlistId },
            data: {
                tracks: { disconnect: { id: trackId } },
                totalLikesCount: {
                    // Si mizik la te gen 10 likes, n ap retire 10 nan playlist la
                    decrement: track._count.likes || 0
                }
            }
        });
    }

    /**
     * SYNC SCORES (Pou TrackService)
     * Rele metòd sa a chak fwa yon moun Like/Unlike yon mizik
     */
    async syncPlaylistScores(trackId: string, isLike: boolean) {
        await this.prisma.playlist.updateMany({
            where: {
                tracks: { some: { id: trackId } }
            },
            data: {
                totalLikesCount: {
                    [isLike ? 'increment' : 'decrement']: 1
                }
            }
        });
    }

    /**
     * JWENN TOUT PLAYLIST YON ITILIZATÈ
     */
    async findAllByUser(userId: string) {
        return this.prisma.playlist.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { tracks: true } }
            }
        });
    }

    /**
     * JWENN YON PLAYLIST AK DETAY
     */
    async findOne(id: string) {
        const playlist = await this.prisma.playlist.findUnique({
            where: { id },
            include: {
                tracks: {
                    where: { isActive: true }
                },
                user: { select: { name: true, profile: true } }
            }
        });

        if (!playlist) throw new NotFoundException('Playlist sa pa egziste');
        return playlist;
    }

    /**
     * MODIFYE PLAYLIST
     */
    async update(id: string, userId: string, data: { name?: string, description?: string, isPublic?: boolean }) {
        const playlist = await this.prisma.playlist.findUnique({ where: { id } });

        if (!playlist) throw new NotFoundException('Playlist sa pa egziste');
        if (playlist.userId !== userId) throw new ForbiddenException('Ou pa mèt playlist sa a');

        return this.prisma.playlist.update({
            where: { id },
            data,
        });
    }

    /**
     * EFASE PLAYLIST
     */
    async delete(id: string, userId: string) {
        const playlist = await this.prisma.playlist.findUnique({ where: { id } });

        if (!playlist) throw new NotFoundException('Playlist sa pa egziste');
        if (playlist.userId !== userId) throw new ForbiddenException('Ou pa gen dwa sa a');

        return this.prisma.playlist.delete({ where: { id } });
    }
}