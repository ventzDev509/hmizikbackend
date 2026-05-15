
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
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

        
        const profile = await this.prisma.profile.findFirst({
            where: {
                OR: [
                    { id: data.artistId },    
                    { userId: data.artistId } 
                ]
            }
        });

        
        if (!profile) {
            throw new BadRequestException(`Nou pa jwenn okenn pwofil pou ID: ${data.artistId}`);
        }

        
        const coverUrl = await this.supabaseService.uploadFile(file, 'covers');

        
        const scheduledDate = new Date(data.releaseDate);
        if (isNaN(scheduledDate.getTime())) {
            throw new BadRequestException('Dat piblikasyon an pa valid');
        }

        
        return this.prisma.album.create({
            data: {
                title: data.title,
                description: data.description || "",
                coverUrl: coverUrl,
                genre: data.genre || "Unknown",
                artistId: profile.id, 
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
        trackCoverFile?: Express.Multer.File 
    ) {
        const album = await this.prisma.album.findUnique({ where: { id: albumId } });
        if (!album) throw new NotFoundException('Album pa jwenn');

        
        const audioUrl = await this.supabaseService.uploadFile(audioFile, 'tracks');

        
        let finalCoverUrl = album.coverUrl; 

        if (trackCoverFile) {
            
            finalCoverUrl = await this.supabaseService.uploadFile(trackCoverFile, 'tracks/covers');
        }

        
        return this.prisma.track.create({
            data: {
                title: trackData.title,
                audioUrl: audioUrl,
                duration: trackData.duration ? parseFloat(trackData.duration) : 0,
                coverUrl: finalCoverUrl, 

                albumId: album.id, 
                artistId: album.artistId,
            },
        });
    }






    /**
     * 3. MODIFYE ALBUM (TIT, COVER, GENRE)
     * Fonksyon sa a ap pèmèt mèt album nan chanje enfòmasyon yo
     */
    async updateAlbum(
        albumId: string,
        data: { title?: string; genre?: string; description?: string },
        file?: Express.Multer.File
    ) {
        const album = await this.prisma.album.findUnique({ where: { id: albumId } });
        if (!album) throw new NotFoundException('Album pa jwenn');

        let coverUrl = album.coverUrl;

        
        if (file) {
            coverUrl = await this.supabaseService.uploadFile(file, 'covers');
        }

        return this.prisma.album.update({
            where: { id: albumId },
            data: {
                ...data,
                coverUrl,
                updatedAt: new Date(),
            },
            include: { artist: true, tracks: true }
        });
    }

    /**
     * 4. EFASE YON MIZIK NAN ALBUM NAN
     * Sa a enpòtan pou bouton "Trash" ou a nan edit mode la
     */
    async deleteTrack(trackId: string) {
        const track = await this.prisma.track.findUnique({ where: { id: trackId } });
        if (!track) throw new NotFoundException('Mizik sa a pa egziste');

        
        

        return this.prisma.track.delete({
            where: { id: trackId }
        });
    }


    /**
     * EFASE YON ALBUM NÈT (Storage + Database)
     */
    async deleteAlbum(albumId: string, userId: string) {
        
        const album = await this.prisma.album.findUnique({
            where: { id: albumId },
            include: { tracks: true }
        });

        if (!album) throw new NotFoundException('Album sa a pa egziste');

        
        const profile = await this.prisma.profile.findUnique({ where: { userId } });
        if (!profile || album.artistId !== profile.id) {
            throw new ForbiddenException("Ou pa gen dwa efase album sa a.");
        }

        try {
            const BUCKET_NAME = 'hmizik';

            
            const rawFiles = album.tracks.flatMap(track => [
                this.getFilePathFromUrl(track.audioUrl, BUCKET_NAME),
                
                track.coverUrl !== album.coverUrl ? this.getFilePathFromUrl(track.coverUrl, BUCKET_NAME) : null
            ]);

            
            rawFiles.push(this.getFilePathFromUrl(album.coverUrl, BUCKET_NAME));

            
            const filesToDelete: string[] = rawFiles.filter((path): path is string => path !== null);

            
            if (filesToDelete.length > 0) {
                console.log(`H-MIZIK: Ap efase ${filesToDelete.length} fichye sou Storage...`);
                
                
                const { error: storageError } = await this.supabaseService['supabase'].storage
                    .from(BUCKET_NAME)
                    .remove(filesToDelete);

                if (storageError) {
                    console.error("Erè Storage Supabase:", storageError.message);
                }
            }

            
            
            await this.prisma.track.deleteMany({ where: { albumId: albumId } });

            return await this.prisma.album.delete({
                where: { id: albumId }
            });

        } catch (error) {
            console.error("Erè Efasman Album:", error);
            throw new BadRequestException("Nou pa ka efase album nan: " + error.message);
        }
    }

    /**
     * Fonksyon Helper pou rale "path" la nan URL la
     */
    private getFilePathFromUrl(url: string | null, bucket: string = 'hmizik'): string | null {
        if (!url) return null;
        const marker = `${bucket}/`;
        const parts = url.split(marker);
        return parts.length > 1 ? parts[1] : null;
    }

    /**
     * 6. FINALIZASYON (Mizajou pou pibliye l)
     */
    async finalizeAlbum(albumId: string) {
        const trackCount = await this.prisma.track.count({ where: { albumId } });
        if (trackCount === 0) throw new BadRequestException('Album sa a pa gen mizik ladan l');

        return this.prisma.album.update({
            where: { id: albumId },
            data: {
                isPublished: true, 
                updatedAt: new Date()
            },
            include: { tracks: true }
        });
    }




    /**
  * 5. JWENN TOUT ALBUM YON ATIS (POU PWOFIL LA)
  */
    async getAlbums() {
        return this.prisma.album.findMany({
            orderBy: {
                createdAt: 'desc' 
            },
            include: {
                artist: true,
                tracks: true,
                _count: {
                    select: { tracks: true }
                }
            }
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
                createdAt: 'desc' 
            },
            include: {
                artist: true,
                _count: {
                    select: { tracks: true } 
                }
            }
        });
    }


    /**
   * JWENN YON ALBUM AK TOUT TRACKS LI YO
   * Fonksyon sa rale tout done ki lye ak album nan
   */
    async getAlbumWithTracks(albumId: string) {
        const album = await this.prisma.album.findUnique({
            where: { id: albumId },
            
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
                        createdAt: 'asc', 
                    },
                    include: {
                        _count: {
                            select: { likes: true, plays: true } 
                        }
                    }
                },
                _count: {
                    select: { tracks: true } 
                }
            },
        });

        
        if (!album) {
            throw new NotFoundException(`Nou pa jwenn okenn album ak ID: ${albumId}`);
        }

        return album;
    }
}