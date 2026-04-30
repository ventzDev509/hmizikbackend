import { Controller, Post, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';

@Controller('recommendation')
export class RecommendationController {
    constructor(private readonly recommendationService: RecommendationService) { }

    /**
     * Endpoint pou deklanche senkronizasyon done yo ak antrenman AI a nan Python.
     * POST http://localhost:3000/recommendation/train
     */
    @Post('train')
    @HttpCode(HttpStatus.OK)
    async trainAi() {
        console.log('--- Deklanche Antrenman AI ---');
        const result = await this.recommendationService.syncAiData();
        return {
            message: 'Done yo voye bay Python pou antrenman.',
            pythonResponse: result,
        };
    }

    @Get('suggest/:trackId')
    async getSuggestions(@Param('trackId') trackId: string) {
        return await this.recommendationService.getSuggestions(trackId);
    }

    /**
     * (Opsyonèl) Si ou ta vle tcheke status modèl la oswa yon lòt bagay
     */
    @Get('status')
    async getStatus() {
        return { status: 'Sèvis Rekòmandasyon NestJS ap kouri' };
    }
}