import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class RecommendationService {
    constructor(private prisma: PrismaService) { }

    async syncAiData() {
        
        const tracks = await this.prisma.track.findMany({
            include: {
                likes: true,
                _count: {
                    select: { plays: true }
                }
            },
        });

        

        const trainingData = tracks.map((track) => ({
            trackId: track.id, 
            genre: track.genre || 'Unknown',
            duration: Number(track.duration) || 0, 
            bpm: Number(track.bpm) || 0,
            plays: Number(track.playCount || track._count?.plays || 0),
            liked: track.likes.length > 0 ? 1 : 0,
        }));

        
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
            include: { RecommendationFeedback: true }
        });

        const payload = allTracks.map(t => {
            
            const avgRating = t.RecommendationFeedback.length > 0
                ? t.RecommendationFeedback.reduce((acc, f) => acc + f.rating, 0) / t.RecommendationFeedback.length
                : 0;

            return {
                trackId: t.id,
                genre: t.genre || 'Unknown',
                duration: Number(t.duration) || 0,
                bpm: Number(t.bpm) || 0,
                plays: Number(t.playCount || 0),
                rating: avgRating 
            };
        });

        try {
            const res = await axios.post(`${process.env.PYTHON_AI_URL}/recommend/${trackId}`, payload);

            const recommendedIds = res.data.recommendations;

            if (!recommendedIds || recommendedIds.length === 0) return [];

            
            const tracks = await this.prisma.track.findMany({
                where: { id: { in: recommendedIds } }
            });

            
            return recommendedIds
                .map(id => tracks.find(t => t.id === id))
                .filter(track => !!track); 

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
    
    const allFeedbacks = await this.prisma.recommendationFeedback.findMany({
        where: { rating: 1 },
        select: { userId: true, trackId: true }
    });

    
    const userHistory = await this.prisma.recommendationFeedback.findMany({
        where: { userId: userId },
        select: { trackId: true }
    });
    const listenedIds = userHistory.map(h => h.trackId);

    
    const allTracks = await this.prisma.track.findMany({
        include: {
            artist: {
                include: {
                    user: { select: { name: true } }
                }
            }
        }
    });

    
    const freshTracks = allTracks.filter(track => !listenedIds.includes(track.id));

    
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
        
        const res = await axios.post(`${process.env.PYTHON_AI_URL}/discovery-pro`, payload);
        const recommendedIds = res.data.recommendations;

        if (!recommendedIds || recommendedIds.length === 0) {
            
            return freshTracks.sort(() => 0.5 - Math.random()).slice(0, 10);
        }

        
        return recommendedIds
            .map(id => allTracks.find(t => t.id === id))
            .filter(track => !!track);

    } catch (error) {
        console.error("Discovery AI Error:", error.message);
        
        return freshTracks.sort(() => 0.5 - Math.random()).slice(0, 10);
    }
}

    async getDiscoveryPro(userId: string) {
  
  const allFeedbacks = await this.prisma.recommendationFeedback.findMany();

  
  const userHistory = await this.prisma.recommendationFeedback.findMany({
    where: { userId: userId },
    select: { trackId: true }
  });
  
  const listenedIds = userHistory.map(h => h.trackId);

  
  const allTracks = await this.prisma.track.findMany({
    include: {
      artist: {
        include: { user: { select: { name: true } } }
      }
    }
  });

  
  
  const freshTracks = allTracks.filter(track => !listenedIds.includes(track.id));

  
  const payload = {
    current_user_id: userId,
    interactions: allFeedbacks,
    all_tracks: freshTracks 
  };

  try {
    const res = await axios.post(`${process.env.PYTHON_AI_URL}/discovery-pro`, payload);
    const recommendedIds = res.data.recommendations;

    
    
    return allTracks.filter(t => recommendedIds.includes(t.id));
    
  } catch (error) {
    console.error("AI Error:", error);
    
    return freshTracks.slice(0, 10);
  }
}
}