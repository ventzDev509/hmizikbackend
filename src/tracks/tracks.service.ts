import { Injectable, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from 'src/common/supabase.service';
import { Prisma } from '@prisma/client';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
@Injectable()
export class TracksService {
    private supabase: SupabaseClient;
    constructor(
        private prisma: PrismaService,
        private supabaseService: SupabaseService,

    ) {

        this.supabase = createClient(
            process.env.SUPABASE_URL || "",
            process.env.SUPABASE_ANON_KEY || ""
        );
    }

    // 1. KREYE YON TRACK (UPLOAD)
    async create(userId: string, body: any, files: { audio?: Express.Multer.File[], cover?: Express.Multer.File[] }) {
        const profile = await this.prisma.profile.findUnique({ where: { userId } });

        if (!profile || !profile.isArtist) {
            throw new BadRequestException("Sèlman atis ki ka pibliye mizik.");
        }

        if (!files.audio || !files.audio[0]) {
            throw new BadRequestException("Fichye audio a obligatwa.");
        }

        try {
            const audioUrl = await this.supabaseService.uploadFile(files.audio[0], 'tracks');
            let coverUrl: string | null = null;
            if (files.cover && files.cover[0]) {
                coverUrl = await this.supabaseService.uploadFile(files.cover[0], 'covers');
            }

            return await this.prisma.track.create({
                data: {
                    title: body.title,
                    genre: body.genre || "Konpa",
                    duration: body.duration ? parseFloat(body.duration) : 0,
                    audioUrl,
                    coverUrl,
                    artistId: profile.id,
                },
                include: { artist: true }
            });
        } catch (error) {
            throw new BadRequestException(`Erè kreyasyon: ${error.message}`);
        }
    }

    // 2. JWENN TOUT TRACK YO (AK PAGINATION POU INFINITE SCROLL)
    // limit: kantite done pou l pote, cursor: pwen kote l ap kòmanse a
    async findAll(limit: number = 10, page: number = 1) {
        const skip = (page - 1) * limit;

        const [tracks, total] = await Promise.all([
            this.prisma.track.findMany({
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    artist: {
                        select: { username: true, user: { select: { name: true } } }
                    }
                }
            }),
            this.prisma.track.count()
        ]);

        return {
            data: tracks,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit)
            }
        };
    }

    // 3. JWENN TRACK YON ATIS PRESI (Pwofil)
    async findByArtist(artistId: string) {
        return await this.prisma.track.findMany({
            where: { artistId },
            orderBy: { createdAt: 'desc' }
        });
    }

    // 8. JWENN TOUT MIZIK YON ITILIZATÈ PRESI (POU PWOFIL LI)
    async findTracksByUserProfile(userId: string, limit: number = 10, page: number = 1) {
        // a. Nou chèche pwofil la anvan pou nou jwenn artistId (profile.id)
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException("Pwofil sa a pa egziste.");
        }

        const skip = (page - 1) * limit;

        // b. Nou rale mizik ki lye ak pwofil sa a sèlman
        const [tracks, total] = await Promise.all([
            this.prisma.track.findMany({
                where: { artistId: profile.id }, // Se isit la filtè a fèt
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' }, // Pi nouvo yo anlè
                include: {
                    artist: {
                        select: {
                            username: true,
                            avatarUrl: true,
                            user: { select: { name: true } }
                        }
                    }
                }
            }),
            this.prisma.track.count({ where: { artistId: profile.id } })
        ]);

        return {
            tracks,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit),
                hasMore: page < Math.ceil(total / limit)
            }
        };
    }

    // 4. JWENN YON SÈL TRACK PA ID
    async findOne(id: string) {
        const track = await this.prisma.track.findUnique({
            where: { id },
            include: { artist: true }
        });
        if (!track) throw new NotFoundException("Mizik sa a pa egziste.");
        return track;
    }

    // 5. MOUTE KANTITE FWA YO KOUTE YON MIZIK (PLAYS)


    async incrementPlays(trackId: string, userId?: string, ip?: string) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        // Nou di TypeScript array sa a se yon lis kondisyon 'Play'
        const orConditions: Prisma.PlayWhereInput[] = [];

        if (userId) orConditions.push({ userId });
        if (ip) orConditions.push({ userIp: ip });

        const recentPlay = orConditions.length > 0
            ? await this.prisma.play.findFirst({
                where: {
                    trackId,
                    OR: orConditions,
                    createdAt: { gte: thirtyMinutesAgo },
                },
            })
            : null;

        if (recentPlay) {
            return await this.prisma.play.create({
                data: { trackId, userId, userIp: ip },
            });
        }

        return await this.prisma.$transaction([
            this.prisma.play.create({
                data: { trackId, userId, userIp: ip },
            }),
            this.prisma.track.update({
                where: { id: trackId },
                data: { playCount: { increment: 1 } },
            }),
        ]);
    }
    // 9. JWENN MIZIK KI GEN PLIS EKOUT (TRENDING)
    async findTrending(limit: number = 10) {
        return await this.prisma.track.findMany({
            take: limit,
            orderBy: {
                // Sèvi ak playCount (ki se yon Int) olye de plays (ki se yon relasyon)
                playCount: 'desc',
            },
            include: {
                artist: {
                    select: {
                        username: true,
                        user: { select: { name: true } }
                    }
                }
            }
        });
    }
    // 6. MODIFYE YON TRACK
    async update(userId: string, id: string, updateData: any) {
        const track = await this.findOne(id);
        const profile = await this.prisma.profile.findUnique({ where: { userId } });

        if (track.artistId !== profile?.id) {
            throw new ForbiddenException("Ou pa gen dwa modifye mizik sa a.");
        }

        return await this.prisma.track.update({
            where: { id },
            data: updateData
        });
    }



    // Nan yon SupabaseService oswa dirèkteman nan TrackService la
    async deleteFileFromStorage(fileUrl: string, bucketName: string) {

        const filePath = fileUrl.split(`${bucketName}/`)[1];

        if (!filePath) return;

        const { data, error } = await this.supabase.storage
            .from(bucketName)
            .remove([filePath]);


        if (error) {
            console.error(`Erè lè n ap efase nan ${bucketName}:`, error.message);
        }
        return data;
    }

    // Fonksyon pou rale "path" la nan URL Supabase la
    private getFilePathFromUrl(url: string, bucket: string) {
        // Sa ap rale tout sa ki apre non bucket la nan URL la
        const parts = url.split(`${bucket}/`);
       
        return parts.length > 1 ? parts[1] : null;
    }

  async remove(userId: string, id: string) {
    const track = await this.prisma.track.findUnique({ where: { id } });
    const profile = await this.prisma.profile.findUnique({ where: { userId } });

    if (!track || track.artistId !== profile?.id) {
        throw new ForbiddenException("Ou pa gen dwa oswa mizik sa a pa egziste.");
    }

    try {
        // 1. Netwaye Likes/Playlists (Kòd ou a te bon la)
        await this.prisma.like.deleteMany({ where: { trackId: id } });

        // 2. EFASE SOU SUPABASE (Nou sèvi ak bucket 'hmizik' la)
        const BUCKET_NAME = 'hmizik'; // Non ki nan URL ou a

        // Efase Audio
        if (track.audioUrl) {
            const audioPath = this.getFilePathFromUrl(track.audioUrl, BUCKET_NAME);
            if (audioPath) {
                const { data, error } = await this.supabase.storage
                    .from(BUCKET_NAME)
                    .remove([audioPath]);
                console.log("Supabase Audio Delete:", data, error);
            }
        }

        // Efase Cover
        if (track.coverUrl) {
            const coverPath = this.getFilePathFromUrl(track.coverUrl, BUCKET_NAME);
            if (coverPath) {
                const { data, error } = await this.supabase.storage
                    .from(BUCKET_NAME)
                    .remove([coverPath]);
                console.log("Supabase Cover Delete:", data, error);
            }
        }

        // 3. Efase nan DB
        return await this.prisma.track.delete({ where: { id } });

    } catch (error) {
        console.error("Erè Efasman:", error);
        throw new InternalServerErrorException("Efasman echwe: " + error.message);
    }
}


}