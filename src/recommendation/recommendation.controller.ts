import { Controller, Post, Get, HttpCode, HttpStatus, Param, Body, InternalServerErrorException, UseGuards, Req } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

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

    @Post('feedback')
    async saveFeedback(
        @Body() body: { userId: string; trackId: string; rating: number }
    ) {
        return await this.recommendationService.recordFeedback(
            body.userId,
            body.trackId,
            body.rating
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get('discovery')
    async getDiscovery(@Req() req) {
        try {
            // Nou rekipere userId ki nan Token JWT a
            const userId = req.user.id

            const tracks = await this.recommendationService.getDiscoveryWeekly(userId);

            return tracks;
        } catch (error) {
            console.error("Erè nan Discovery Controller:", error);
            throw new InternalServerErrorException("Nou pa kapab jenere Discovery Weekly a pou kounye a.");
        }
    }
}