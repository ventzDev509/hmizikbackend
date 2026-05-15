import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    UseInterceptors,
    UploadedFiles,
    Query,
    ParseIntPipe,
    Patch,
    Request,
    UseGuards,
    Req,
    ForbiddenException
} from '@nestjs/common';
import { TracksService } from './tracks.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

@Controller('tracks')
export class TracksController {
    constructor(private readonly tracksService: TracksService) { }

    
    @UseGuards(JwtAuthGuard)
    @Post('upload')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'audio', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
    ]))
    async uploadTrack(
        @Request() req,
        @Body() body: any,
        @UploadedFiles() files: { audio?: Express.Multer.File[], cover?: Express.Multer.File[] }
    ) {
        return this.tracksService.create(req.user.id, body, files);
    }

    
    @Get()
    async getAllTracks(
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    ) {
        return this.tracksService.findAll(limit, page);
    }

    

    @Get('user/:userId')
    async getTracksByProfile(
        @Param('userId') userId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    ) {
        return this.tracksService.findTracksByUserProfile(userId, limit, page);
    }

    @Patch(':id/bpm')
    async updateBpm(
        @Param('id') id: string,
        @Body() body: { bpm: number }
    ) {
        
        console.log(`📩 Resevwa soti nan Python: Track ${id} gen ${body.bpm} BPM`);

        return this.tracksService.updateBpm(id, body.bpm);
    }

    @Post(':id/play')
    async incrementPlay(
        @Param('id') id: string,
        @Req() req: any
    ) {
        
        const rawIp = req.headers['x-forwarded-for'] ||
            req.ip ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress;

        
        let ip = '';
        if (typeof rawIp === 'string') {
            
            ip = rawIp.split(',')[0].trim();
            
            ip = ip.replace(/^.*:/, '');
        }

        console.log("Vrè IP k ap teste a:", ip); 

        const userId = req.user?.id;

        return this.tracksService.incrementPlays(id, userId, ip);
    }

    
    @Get('trending')
    async getTrending(@Query('limit') limit: string) {
        
        const take = limit ? parseInt(limit, 10) : 10;
        return this.tracksService.findTrending(take);
    }
    
    @Get(':id')
    async getOneTrack(@Param('id') id: string) {
        return this.tracksService.findOne(id);
    }

    
    @Patch(':id/play')
    async addPlay(@Param('id') id: string) {
        return this.tracksService.incrementPlays(id);
    }

    
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async updateTrack(@Request() req, @Param('id') id: string, @Body() updateData: any) {
        return this.tracksService.update(req.user.id, id, updateData);
    }

    
    @UseGuards(JwtAuthGuard)
    @Delete('remove/:id')
    async remove(@Param('id') id: string, @Req() req) {
        const userId = req.user.id;

        if (!userId) {
            throw new ForbiddenException("Ou dwe konekte pou w efase yon mizik.");
        }

        return this.tracksService.remove(userId, id);
    }
}