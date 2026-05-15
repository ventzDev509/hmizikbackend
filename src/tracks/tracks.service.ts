import { Injectable, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from 'src/common/supabase.service';
import { Prisma } from '@prisma/client';
import { HttpService } from '@nestjs/axios';

import * as mm from 'music-metadata';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class TracksService {
    private supabase: SupabaseClient;
    constructor(
        private prisma: PrismaService,
        private supabaseService: SupabaseService,
        private readonly httpService: HttpService,
    ) {

        this.supabase = createClient(
            process.env.SUPABASE_URL || "",
            process.env.SUPABASE_ANON_KEY || ""
        );
    }
 
    
    
    

    
    
    

    
    
    

    
    
    
    
    
    

    
    
    
    
    
    
    
    
    
    
    
    
    
    
    

    async create(userId: string, body: any, files: { audio?: Express.Multer.File[], cover?: Express.Multer.File[] }) {
        
        const profile = await this.prisma.profile.findUnique({ where: { userId } });

        if (!profile || !profile.isArtist) {
            throw new BadRequestException("Sèlman atis ki ka pibliye mizik.");
        }

        if (!files.audio || !files.audio[0]) {
            throw new BadRequestException("Fichye audio a obligatwa.");
        }

        try {
            const audioFile = files.audio[0];
            let bpmCalculated = 0;
            let durationCalculated = 0;

            
            try {
                const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype);
                durationCalculated = metadata.format.duration || 0;
                bpmCalculated = metadata.common.bpm || 0;

                
                if (bpmCalculated === 0 && body.genre === "Raboday") {
                    bpmCalculated = 150;
                }
            } catch (analysisError) {
                console.error("⚠️ Erè metadata:", analysisError.message);
            }

            
            
            const audioUrl = await this.supabaseService.uploadFile(audioFile, 'tracks');

            let coverUrl: string | null = null;
            if (files.cover && files.cover[0]) {
                coverUrl = await this.supabaseService.uploadFile(files.cover[0], 'covers');
            }

            
            const newTrack = await this.prisma.track.create({
                data: {
                    title: body.title,
                    genre: body.genre || "Konpa",
                    duration: body.duration ? parseFloat(body.duration) : durationCalculated,
                    bpm: bpmCalculated,
                    audioUrl,
                    coverUrl,
                    artistId: profile.id,
                },
                include: { artist: true }
            });

            
            
            if (newTrack.bpm === 0) {
                console.log(`🚀 Siyal voye bay Python pou analiz: ${newTrack.id}`);

                
                this.httpService.post(`${process.env.PYTHON_AI_URL}/analyze-bpm`, {
                    trackId: newTrack.id,
                    audioUrl: newTrack.audioUrl
                }).subscribe({
                    next: () => console.log('✅ Python resevwa demand lan'),
                    error: (err) => console.error('❌ Sèvè Python an pa reponn:', err.message)
                });
            }

            return newTrack;

        } catch (error) {
            throw new BadRequestException(`Erè kreyasyon track: ${error.message}`);
        }
    }

    async updateBpm(id: string, bpm: number) {
        try {
            const track = await this.prisma.track.findUnique({ where: { id } });

            if (!track) {
                throw new NotFoundException(`Track ak ID ${id} la pa egziste.`);
            }

            return await this.prisma.track.update({
                where: { id },
                data: { bpm: Math.round(bpm) }, 
            });
        } catch (error) {
            console.error(`❌ Erè nan updateBpm Service: ${error.message}`);
            throw new InternalServerErrorException("Pa kapab mete BPM nan ajou.");
        }
    }
    async findAll(limit: number = 10, page: number = 1) {
        const skip = (page - 1) * limit;

        const [tracks, total] = await Promise.all([
            this.prisma.track.findMany({
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' },
                include: {
                    artist: {
                        select: { username: true, user: { select: { name: true, } } }
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

    
    async findByArtist(artistId: string) {
        return await this.prisma.track.findMany({
            where: { artistId },
            orderBy: { createdAt: 'desc' }
        });
    }

    
    async findTracksByUserProfile(userId: string, limit: number = 10, page: number = 1) {
        
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException("Pwofil sa a pa egziste.");
        }

        const skip = (page - 1) * limit;

        
        const [tracks, total] = await Promise.all([
            this.prisma.track.findMany({
                where: { artistId: profile.id }, 
                take: limit,
                skip: skip,
                orderBy: { createdAt: 'desc' }, 
                include: {
                    artist: {
                        select: {
                            username: true,
                            avatarUrl: true,
                            user: { select: { name: true, profile: { select: { customTarif: true, payoutThreshold: true } } } }
                        }
                    }
                    ,
                    plays: true
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

    
    async findOne(id: string) {
        const track = await this.prisma.track.findUnique({
            where: { id },
            include: { artist: true }
        });
        if (!track) throw new NotFoundException("Mizik sa a pa egziste.");
        return track;
    }

    


    async incrementPlays(trackId: string, userId?: string, ip?: string) {
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
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
                data: {
                    trackId,
                    userId,
                    userIp: ip,
                    city: recentPlay.city
                },
            });
        }

        
        
        let city = "Lòt bò dlo";
        if (ip && ip !== '::1' && ip !== '127.0.0.1') {
            try {
                const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,city`);
                const data = await response.json();
                if (data.status === 'success') {
                    city = data.city;
                }
            } catch (e) {
                console.error("Lokalizasyon echwe, n ap itilize default");
            }
        } else {
            
            city = "Cap-Haïtien";
        }

        
        return await this.prisma.$transaction([
            this.prisma.play.create({
                data: {
                    trackId,
                    userId,
                    userIp: ip,
                    city: city 
                },
            }),
            this.prisma.track.update({
                where: { id: trackId },
                data: { playCount: { increment: 1 } },
            }),
        ]);
    }
    
    async findTrending(limit: number = 10) {
        return await this.prisma.track.findMany({
            take: limit,
            orderBy: {
                
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

    
    private getFilePathFromUrl(url: string, bucket: string) {
        
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
            
            await this.prisma.like.deleteMany({ where: { trackId: id } });

            
            const BUCKET_NAME = 'hmizik'; 

            
            if (track.audioUrl) {
                const audioPath = this.getFilePathFromUrl(track.audioUrl, BUCKET_NAME);
                if (audioPath) {
                    const { data, error } = await this.supabase.storage
                        .from(BUCKET_NAME)
                        .remove([audioPath]);
                    console.log("Supabase Audio Delete:", data, error);
                }
            }

            
            if (track.coverUrl) {
                const coverPath = this.getFilePathFromUrl(track.coverUrl, BUCKET_NAME);
                if (coverPath) {
                    const { data, error } = await this.supabase.storage
                        .from(BUCKET_NAME)
                        .remove([coverPath]);
                    console.log("Supabase Cover Delete:", data, error);
                }
            }

            
            return await this.prisma.track.delete({ where: { id } });

        } catch (error) {
            console.error("Erè Efasman:", error);
            throw new InternalServerErrorException("Efasman echwe: " + error.message);
        }
    }


}