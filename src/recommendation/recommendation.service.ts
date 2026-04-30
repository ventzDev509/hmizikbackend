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
        const allTracks = await this.prisma.track.findMany({
            include: { RecommendationFeedback: true } // Asire w ou gen relasyon sa a nan Prisma
        });

        const payload = allTracks.map(t => {
            // Kalkile mwayèn feedback pou track sa a
            const avgRating = t.RecommendationFeedback.length > 0
                ? t.RecommendationFeedback.reduce((acc, f) => acc + f.rating, 0) / t.RecommendationFeedback.length
                : 0;

            return {
                trackId: t.id,
                genre: t.genre || 'Unknown',
                duration: Number(t.duration) || 0,
                bpm: Number(t.bpm) || 0,
                plays: Number(t.playCount || 0),
                rating: avgRating // VOYE SA BAY PYTHON
            };
        });

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


    async recordFeedback(userId: string, trackId: string, rating: number) {
        try {
            return await this.prisma.recommendationFeedback.create({
                data: {
                    userId,
                    trackId,
                    rating,
                },
            });
        } catch (error) {
            console.log(error)
        }
    }


    async getDiscoveryWeekly(userId: string) {
        // 1. Rale tout Feedback pozitif (Rating 1) nan tout sistèm nan
        const allFeedbacks = await this.prisma.recommendationFeedback.findMany({
            where: { rating: 1 },
            select: { userId: true, trackId: true }
        });

        // 2. Rale tout Tracks ak karakteristik yo (pou nou toujou ka fè mix la)
        const allTracks = await this.prisma.track.findMany({
            select: { id: true, genre: true, bpm: true, duration: true, playCount: true }
        });

        const payload = {
            current_user_id: userId,
            interactions: allFeedbacks, // Lis [userId, trackId]
            all_tracks: allTracks.map(t => ({
                id: t.id,
                genre: t.genre || 'Konpa',
                bpm: Number(t.bpm) || 100,
                plays: t.playCount || 0
            }))
        };

        
        try {
            // 4. Voye bay Python
           const res = await axios.post(`${process.env.PYTHON_AI_URL}/discovery-pro`, payload);
            const recommendedIds = res.data.recommendations;

            if (!recommendedIds || recommendedIds.length === 0) {
                return [];
            }

            // 5. Rale tout enfòmasyon track yo nan Prisma pou nou ka voye yo bay Frontend la
            const tracks = await this.prisma.track.findMany({
                where: {
                    id: { in: recommendedIds }
                },
                include: {
                    artist: {
                        include: {
                            user: {
                                select: { name: true }
                            }
                        }
                    }
                }
            });

            // 6. Triye tracks yo nan lòd Python te sijere a (paske Prisma pa garanti lòd la)
            return recommendedIds
                .map(id => tracks.find(t => t.id === id))
                .filter(track => !!track); // Retire si gen yon "undefined" pa chans

        } catch (error) {
            console.error("Discovery AI Error:", error.message);
            // Si AI a echwe, nou retounen kèk kandida o aza pou itilizatè a pa jwenn anyen vid
        }
    }
}