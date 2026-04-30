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
    // 1. Rale tout Feedback pozitif (Rating 1) nan tout sistèm nan pou AI a ka travay
    const allFeedbacks = await this.prisma.recommendationFeedback.findMany({
        where: { rating: 1 },
        select: { userId: true, trackId: true }
    });

    // 2. Rale istwa itilizatè a (sa li te dejà tande/Like) pou nou ka filtre yo
    const userHistory = await this.prisma.recommendationFeedback.findMany({
        where: { userId: userId },
        select: { trackId: true }
    });
    const listenedIds = userHistory.map(h => h.trackId);

    // 3. Rale tout Tracks yo
    const allTracks = await this.prisma.track.findMany({
        include: {
            artist: {
                include: {
                    user: { select: { name: true } }
                }
            }
        }
    });

    // 4. FILTRAJ: Retire mizik itilizatè a te dejà koute
    const freshTracks = allTracks.filter(track => !listenedIds.includes(track.id));

    // 5. Prepare Payload pou Python (Sèlman ak mizik li poko tande)
    const payload = {
        current_user_id: userId,
        interactions: allFeedbacks,
        all_tracks: freshTracks.map(t => ({
            id: t.id,
            genre: t.genre || 'Konpa',
            bpm: Number(t.bpm) || 100,
            plays: t.playCount || 0
        }))
    };

    try {
        // 6. Voye bay Python
        const res = await axios.post(`${process.env.PYTHON_AI_URL}/discovery-pro`, payload);
        const recommendedIds = res.data.recommendations;

        if (!recommendedIds || recommendedIds.length === 0) {
            // Si AI a pa bay anyen, nou bay 10 mizik o aza nan sa li poko tande
            return freshTracks.sort(() => 0.5 - Math.random()).slice(0, 10);
        }

        // 7. Map ID yo tounen nan objè track konplè yo epi kenbe lòd Python an
        return recommendedIds
            .map(id => allTracks.find(t => t.id === id))
            .filter(track => !!track);

    } catch (error) {
        console.error("Discovery AI Error:", error.message);
        // Fallback: Si AI a echwe, bay kèk mizik fre (poko tande) o aza
        return freshTracks.sort(() => 0.5 - Math.random()).slice(0, 10);
    }
}

    async getDiscoveryPro(userId: string) {
  // 1. Rale tout feedback (interactions) pou AI a ka konprann relasyon yo
  const allFeedbacks = await this.prisma.recommendationFeedback.findMany();

  // 2. Rale ID mizik itilizatè sa a te deja koute (Rating 1 oswa nenpòt feedback)
  const userHistory = await this.prisma.recommendationFeedback.findMany({
    where: { userId: userId },
    select: { trackId: true }
  });
  
  const listenedIds = userHistory.map(h => h.trackId);

  // 3. Rale tout mizik ki nan DB a
  const allTracks = await this.prisma.track.findMany({
    include: {
      artist: {
        include: { user: { select: { name: true } } }
      }
    }
  });

  // 4. FILTRAJ: Nou retire mizik itilizatè a te koute deja nan lis n ap voye bay Python an
  // Konsa Python ap sèlman rekòmande mizik itilizatè a POKO konnen
  const freshTracks = allTracks.filter(track => !listenedIds.includes(track.id));

  // 5. Voye done yo bay Python
  const payload = {
    current_user_id: userId,
    interactions: allFeedbacks,
    all_tracks: freshTracks // Nou voye lis ki filtre a
  };

  try {
    const res = await axios.post(`${process.env.PYTHON_AI_URL}/discovery-pro`, payload);
    const recommendedIds = res.data.recommendations;

    // 6. Rekipere detay mizik Python rekòmande yo
    // Nou re-itilize allTracks pou nou ka jwenn objè konplè yo rapidman
    return allTracks.filter(t => recommendedIds.includes(t.id));
    
  } catch (error) {
    console.error("AI Error:", error);
    // Fallback: si AI a bay erè, bay 10 mizik itilizatè a poko tande
    return freshTracks.slice(0, 10);
  }
}
}