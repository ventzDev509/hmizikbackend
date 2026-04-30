import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class RecommendationService {
    constructor(private prisma: PrismaService) { }

    async syncAiData() {
        // 1. Rale done konplè nan Prisma
        const tracks = await this.prisma.track.findMany({
            include: {
                likes: true,
                _count: {
                    select: { plays: true } // Si ou gen yon relasyon 'plays'
                }
            },
        });

        // 2. Map done yo pou AI a

        const trainingData = tracks.map((track) => ({
            trackId: track.id, // Ajoute sa pou evite mismatch
            genre: track.genre || 'Unknown',
            duration: Number(track.duration) || 0, // Fòse l tounen Number
            bpm: Number(track.bpm) || 0,
            plays: Number(track.playCount || track._count?.plays || 0),
            liked: track.likes.length > 0 ? 1 : 0,
        }));

        // 3. Voye done yo bay Python
        const response = await axios.post(
            `${process.env.PYTHON_AI_URL}/train-recommendation`,
            trainingData,
            {
                headers: { 'Content-Type': 'application/json' }
            }
        );

        return response.data;
    }

 async getSuggestions(trackId: string) {
    const allTracks = await this.prisma.track.findMany();

    const payload = allTracks.map(t => ({
        trackId: t.id,
        genre: t.genre || 'Unknown',
        duration: Number(t.duration) || 0,
        bpm: Number(t.bpm) || 0,
        plays: Number(t.playCount || 0)
    }));

    try {
        const res = await axios.post(`${process.env.PYTHON_AI_URL}/recommend/${trackId}`, payload);

        const recommendedIds = res.data.recommendations;

        if (!recommendedIds || recommendedIds.length === 0) return [];

        // Rale tracks yo nan Prisma
        const tracks = await this.prisma.track.findMany({
            where: { id: { in: recommendedIds } }
        });

        // TRIYAY: Remete tracks yo nan lòd Python te bay la
        return recommendedIds
            .map(id => tracks.find(t => t.id === id))
            .filter(track => !!track); // Retire si yon track pa jwenn pa azar

    } catch (error) {
        console.error("AI Prediction Error:", error.response?.data || error.message);
        return [];
    }
}
}