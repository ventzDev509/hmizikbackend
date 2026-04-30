import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class RecommendationService {
  constructor(private prisma: PrismaService) {}

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
      genre: track.genre || 'Unknown',
      duration: track.duration || 0,
      bpm: track.bpm || 0, // BPM nou te kalkile anvan an
      plays: track.playCount || track._count?.plays || 0, // Kantite fwa moun koute l
      liked: track.likes.length > 0 ? 1 : 0,
    }));

    // 3. Voye done yo bay Python
    const response = await axios.post(
      'https://py-5mwv.onrender.com/train-recommendation',
      trainingData,
    );

    return response.data;
  }

  async getSuggestions(trackId: string) {
  // 1. Rale tout tracks yo pou AI a ka konpare yo
  const allTracks = await this.prisma.track.findMany();
  
  const payload = allTracks.map(t => ({
    trackId: t.id,
    genre: t.genre || 'Unknown',
    duration: t.duration || 0,
    bpm: t.bpm || 0,
    plays: t.playCount || 0
  }));

  // 2. Mande Python ki sa k sanble ak trackId sa a
  try {
    // const res = await axios.get(`http://127.0.0.1:8000/recommend/${trackId}`, {
    //   data: payload // FastAPI ka resevwa body nan GET pafwa, oswa chanje l an POST
    // });
    const res = await axios.get(`https://py-5mwv.onrender.com/recommend/${trackId}`, {
      data: payload // FastAPI ka resevwa body nan GET pafwa, oswa chanje l an POST
    });

    const recommendedIds = res.data.recommendations;

    // 3. Rale detay mizik sa yo nan Database la pou voye yo bay Front-end la
    return await this.prisma.track.findMany({
      where: { id: { in: recommendedIds } }
    });
  } catch (error) {
    console.error("AI Prediction Error:", error.message);
    return []; // Retounen yon lis vid si AI a gen pwoblèm
  }
}
}