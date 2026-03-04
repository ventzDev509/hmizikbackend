import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from 'src/common/supabase.service';

@Injectable()
export class TracksService {
    constructor(
        private prisma: PrismaService,
        private supabaseService: SupabaseService,
    ) { }

    async create(userId: string, body: any, files: { audio?: Express.Multer.File[], cover?: Express.Multer.File[] }) {
        // 1. Nou verifye si atis la gen yon pwofil AK si li gen dwa upload (isArtist)
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new BadRequestException("Profil pa jwenn. Ou dwe kreye yon pwofil anvan.");
        }

        // Chèk sekirite: Èske se yon atis?
        if (!profile.isArtist) {
            throw new BadRequestException("Sèlman atis ki verifye ki ka pibliye mizik.");
        }

        if (!files.audio || !files.audio[0]) {
            throw new BadRequestException("Fichye audio a obligatwa.");
        }

        try {
            // 2. Upload Audio sou Supabase (Lojik konpresyon an anndan sèvis sa a deja)
            const audioUrl = await this.supabaseService.uploadFile(files.audio[0], 'tracks');

            // 3. Upload Cover sou Supabase (si li egziste)
            let coverUrl: string | null = null;
            if (files.cover && files.cover[0]) {
                coverUrl = await this.supabaseService.uploadFile(files.cover[0], 'covers');
            }

            // 4. Kreye Track la nan Database la ak Prisma
            return await this.prisma.track.create({
                data: {
                    title: body.title,
                    genre: body.genre || "Konpa",
                    // Asire nou ke duration se yon nimewo float pou player a
                    duration: body.duration ? parseFloat(body.duration) : 0,
                    audioUrl: audioUrl,
                    coverUrl: coverUrl,
                    artistId: profile.id,
                },
                // Nou ka mande Prisma retounen pwofil atis la tou si nou vle
                include: {
                    artist: true
                }
            });
        } catch (error) {
            console.log(error)
            throw new BadRequestException(`Erè pandan kreyasyon track la: ${error.message}`);
        }
    }
}