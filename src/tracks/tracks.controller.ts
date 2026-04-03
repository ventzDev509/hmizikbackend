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

    // 1. KREYE YON MIZIK (Pwoteje ak JWT)
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

    // 2. JWENN TOUT MIZIK (Feed jeneral ak Infinite Scroll)
    @Get()
    async getAllTracks(
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    ) {
        return this.tracksService.findAll(limit, page);
    }

    // 3. JWENN MIZIK YON ITILIZATÈ PRESI (Pou Paj Pwofil la)

    @Get('user/:userId')
    async getTracksByProfile(
        @Param('userId') userId: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    ) {
        return this.tracksService.findTracksByUserProfile(userId, limit, page);
    }


    @Post(':id/play')
    async incrementPlay(
        @Param('id') id: string,
        @Req() req: any
    ) {
        // 1. Rekipere valè brut la
        const rawIp = req.headers['x-forwarded-for'] ||
            req.ip ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress;

        // 2. Netwaye IP a (Pran sèlman premye a si gen vigil, epi retire prefiks IPv6 la)
        let ip = '';
        if (typeof rawIp === 'string') {
            // Si gen vigil, nou pran premye eleman an
            ip = rawIp.split(',')[0].trim();
            // Retire prefiks ::ffff: ki konn parèt sou sèvè Node
            ip = ip.replace(/^.*:/, '');
        }

        console.log("Vrè IP k ap teste a:", ip); // W ap wè "200.113.230.158" sèlman kounye a

        const userId = req.user?.id;

        return this.tracksService.incrementPlays(id, userId, ip);
    }

    // Wout pou rale mizik ki Trending yo
    @Get('trending')
    async getTrending(@Query('limit') limit: string) {
        // Nou konvèti limit la an nimewo
        const take = limit ? parseInt(limit, 10) : 10;
        return this.tracksService.findTrending(take);
    }
    // 4. JWENN YON SÈL MIZIK PA ID
    @Get(':id')
    async getOneTrack(@Param('id') id: string) {
        return this.tracksService.findOne(id);
    }

    // 5. MOUTE KANTITE PLAYS (Lè yon moun koute)
    @Patch(':id/play')
    async addPlay(@Param('id') id: string) {
        return this.tracksService.incrementPlays(id);
    }

    // 6. MODIFYE ENFÒMASYON MIZIK (Pwoteje)
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async updateTrack(@Request() req, @Param('id') id: string, @Body() updateData: any) {
        return this.tracksService.update(req.user.id, id, updateData);
    }

    // 3. SIPRIME YON MIZIK (Pwoteksyon ak JWT)
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