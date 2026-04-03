import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SearchService {
    constructor(private prisma: PrismaService) { }

    async globalSearch(query: string) {
        if (!query || query.length < 2) return { tracks: [], artists: [], playlists: [], albums: [] };

        const [tracks, artists, albums, playlists] = await Promise.all([
            // 1. Tracks
            this.prisma.track.findMany({
                where: {
                    OR: [
                        { title: { contains: query, mode: 'insensitive' } },
                        { genre: { contains: query, mode: 'insensitive' } },
                    ],
                },
                include: {
                    artist: {
                        select: { username: true, avatarUrl: true, verified: true },
                    },
                },
                take: 10,
            }),

            // 2. Artists (Profiles)
            this.prisma.profile.findMany({
                where: {
                    username: { contains: query, mode: 'insensitive' },
                },
                take: 5,
            }),

            // 3. Albums (SA TE NAN 4TRÈM PLAS ANVAN)
            this.prisma.album.findMany({
                where: {
                    title: { contains: query, mode: 'insensitive' },
                    isPublished: true, 
                },
                include: {
                    artist: { select: { username: true } },
                },
                take: 5,
            }),

            // 4. Playlists (SA TE NAN 3ZYÈM PLAS ANVAN)
            this.prisma.playlist.findMany({
                where: {
                    name: { contains: query, mode: 'insensitive' },
                    isPublic: true,
                },
                include: { 
                    user: { select: { name: true,profile:true } } 
                },
                take: 5,
            }),
        ]);

        return { tracks, artists, albums, playlists };
    }
}