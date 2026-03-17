// src/album/album.controller.ts
import {
    Controller,
    Post,
    Body,
    Param,
    Patch,
    Get,
    UploadedFile,
    UploadedFiles,
    UseInterceptors,
    HttpException,
    HttpStatus
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { AlbumService } from './album.service';

@Controller('album')
export class AlbumController {
    constructor(private readonly albumService: AlbumService) { }

    /**
     * 1. KREYE ALBUM LAN (KOKI A + COVER)
     * POST /album/create
     */
    @Post('create')
    @UseInterceptors(FileInterceptor('cover')) // Resevwa imaj kouvèti album lan
    async createAlbum(
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { title: string; artistId: string; releaseDate: string; genre?: string; description?: string }
    ) {
        try {
            return await this.albumService.createEmptyAlbum(file, body);
        } catch (error) {
            console.log(error)
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * 2. AJOUTE YON MIZIK NAN ALBUM LAN (AUDIO + OPTIONAL COVER)
     * POST /album/:id/add-track
     */
    @Post(':id/add-track')
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'audio', maxCount: 1 },
        { name: 'cover', maxCount: 1 }, // Opsyonèl si atis la vle yon foto diferan
    ]))
    async addTrack(
        @Param('id') albumId: string,
        @UploadedFiles() files: { audio?: Express.Multer.File[], cover?: Express.Multer.File[] },
        @Body() body: { title: string; artistId: string; duration?: string }
    ) {
        const audioFile = files.audio?.[0];
        const trackCoverFile = files.cover?.[0];

        if (!audioFile) {
            throw new HttpException('Fichye audio a manke', HttpStatus.BAD_REQUEST);
        }

        try {
            return await this.albumService.addTrackToAlbum(albumId, audioFile, body, trackCoverFile);
        } catch (error) {
            console.log(error)
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * 3. FINALIZE ALBUM
     * PATCH /album/:id/finalize
     */
    @Patch(':id/finalize')
    async finalize(@Param('id') id: string) {
        try {
            return await this.albumService.finalizeAlbum(id);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * GET /album/user/:userId
     */
    @Get('user/:userId')
    async getUserAlbums(@Param('userId') userId: string) {
        return this.albumService.getAlbumsByUser(userId);
    }

    /**
     * 4. JWENN ALBUM NAN AK TOUT TRACKS LI YO
     * GET /album/:id
     */
    @Get(':id')
    async getAlbum(@Param('id') id: string) {
        try {
            return await this.albumService.getAlbumWithTracks(id);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
    }
}