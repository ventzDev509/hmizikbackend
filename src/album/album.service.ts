// src/album/album.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from 'src/common/supabase.service';

@Injectable()
export class AlbumService {
    constructor(
        private prisma: PrismaService,
        private supabaseService: SupabaseService,
    ) { }

    /**
     * 1. KREYE KOKI ALBUM LAN + UPLOAD COVER
     */
    async createEmptyAlbum(
        file: Express.Multer.File,
        data: { title: string; artistId: string; releaseDate: string; genre?: string; description?: string }
    ) {
        console.log("Done ki rive:", data);

        if (!file) throw new BadRequestException('Ou dwe voye yon foto kouvèti (cover)');

        // 1. Nou chèche pwofil la an premye (paske se li ki mèt album nan)
        const profile = await this.prisma.profile.findFirst({
            where: {
                OR: [
                    { id: data.artistId },    // Si se ID pwofil la
                    { userId: data.artistId } // Si se ID itilizatè a
                ]
            }
        });

        // Si nou pa jwenn pwofil, la nou kanpe
        if (!profile) {
            throw new BadRequestException(`Nou pa jwenn okenn pwofil pou ID: ${data.artistId}`);
        }

        // 2. Upload cover la
        const coverUrl = await this.supabaseService.uploadFile(file, 'covers');

        // 3. Jere dat la
        const scheduledDate = new Date(data.releaseDate);
        if (isNaN(scheduledDate.getTime())) {
            throw new BadRequestException('Dat piblikasyon an pa valid');
        }

        // 4. Kreye album nan ak Profile ID a (profile.id)
        return this.prisma.album.create({
            data: {
                title: data.title,
                description: data.description || "",
                coverUrl: coverUrl,
                genre: data.genre || "Unknown",
                artistId: profile.id, // <--- Men kote maji a fèt
                releaseDate: scheduledDate,
                isPublished: false,
            },
        });
    }

    /**
     * 2. AJOUTE YON MIZIK + KONPRESYON MP3
     */
    async addTrackToAlbum(
        albumId: string,
        audioFile: Express.Multer.File,
        trackData: { title: string; artistId: string; duration?: string },
        trackCoverFile?: Express.Multer.File // Nou ajoute yon paramèt opsyonèl pou cover track la
    ) {
        const album = await this.prisma.album.findUnique({ where: { id: albumId } });
        if (!album) throw new NotFoundException('Album pa jwenn');

        // 1. Upload Audio
        const audioUrl = await this.supabaseService.uploadFile(audioFile, 'tracks');

        // 2. Jesyon Kouvèti a
        let finalCoverUrl = album.coverUrl; // Pa defo, se cover album nan

        if (trackCoverFile) {
            // Si atis la voye yon foto espesyal pou track sa a, nou upload li
            finalCoverUrl = await this.supabaseService.uploadFile(trackCoverFile, 'tracks/covers');
        }
        console.log(album)

        // 3. Kreye Track la
        return this.prisma.track.create({
            data: {
                title: trackData.title,
                audioUrl: audioUrl,
                duration: trackData.duration ? parseFloat(trackData.duration) : 0,
                coverUrl: finalCoverUrl, // Isit la nou mete URL final la

                albumId: album.id, // Sèvi ak ID album nan
                artistId: album.artistId,
            },
        });
    }

    /**
   * 5. JWENN TOUT ALBUM YON ATIS (POU PWOFIL LA)
   */
    async getAlbumsByUser(userId: string) {
        return this.prisma.album.findMany({
            where: {
                artistId: userId
            },
            orderBy: {
                createdAt: 'desc' // Pou dènye album yo parèt an premye
            },
            include: {
                _count: {
                    select: { tracks: true } // Sa ap bay "trackCount" nan frontend lan
                }
            }
        });
    }

    /**
     * 3. FINALIZASYON
     */
    async finalizeAlbum(albumId: string) {
        const trackCount = await this.prisma.track.count({ where: { albumId } });
        if (trackCount === 0) throw new BadRequestException('Album sa a pa gen mizik ladan l');

        return this.prisma.album.update({
            where: { id: albumId },
            data: { updatedAt: new Date() },
            include: { tracks: true }
        });
    }

    /**
   * JWENN YON ALBUM AK TOUT TRACKS LI YO
   * Fonksyon sa rale tout done ki lye ak album nan
   */
    async getAlbumWithTracks(albumId: string) {
        const album = await this.prisma.album.findUnique({
            where: { id: albumId },
            // Nou itilize "include" pou Prisma rale relasyon yo otomatikman
            include: {
                artist: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        verified: true,
                    }
                },
                tracks: {
                    orderBy: {
                        createdAt: 'asc', // Mizik yo ap parèt nan lòd yo te ajoute a
                    },
                    include: {
                        _count: {
                            select: { likes: true, plays: true } // Opsyonèl: si w vle wè kantite like/play
                        }
                    }
                },
                _count: {
                    select: { tracks: true } // Ba ou kantite mizik ki nan album nan total
                }
            },
        });

        // Si album nan pa egziste nan database la
        if (!album) {
            throw new NotFoundException(`Nou pa jwenn okenn album ak ID: ${albumId}`);
        }

        return album;
    }
}