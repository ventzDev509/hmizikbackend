import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Req
} from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

@Controller('playlists')
export class PlaylistController {
    constructor(private readonly playlistService: PlaylistService) { }

    /**
     * 1. JWENN PLAYLIST KI GEN PLIS LIKES (AKÈY)
     * Sa a piblik, li pa bezwen Guard
     */
    @Get('trending')
    async getTrending() {
        return this.playlistService.getTrending();
    }

    /**
     * 2. KREYE YON PLAYLIST
     */
    @UseGuards(JwtAuthGuard)
    @Post()
    async create(
        @Req() req,
        @Body() body: { name: string; description?: string; coverUrl?: string }
    ) {
        return this.playlistService.create(
            req.user.id,
            body.name,
            body.description,
            body.coverUrl
        );
    }

    /**
     * 3. JWENN PLAYLIST PA ITILIZATÈ (MY LIBRARY)
     */
    @UseGuards(JwtAuthGuard)
    @Get('my-library')
    async findAllByUser(@Req() req) {
        return this.playlistService.findAllByUser(req.user.id);
    }

    /**
     * 4. JWENN DETAY YON PLAYLIST
     */
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.playlistService.findOne(id);
    }

    /**
     * 5. AJOUTE YON MIZIK NAN PLAYLIST
     */
    @UseGuards(JwtAuthGuard)
    @Post(':id/tracks/:trackId')
    async addTrack(
        @Param('id') id: string,
        @Param('trackId') trackId: string
    ) {
        return this.playlistService.addTrack(id, trackId);
    }

    /**
     * 6. RETIRE YON MIZIK NAN PLAYLIST
     */
    @UseGuards(JwtAuthGuard)
    @Delete(':id/tracks/:trackId')
    async removeTrack(
        @Param('id') id: string,
        @Param('trackId') trackId: string
    ) {
        return this.playlistService.removeTrack(id, trackId);
    }

    /**
     * 7. MODIFYE PLAYLIST (NAME, DESC, PUBLIC/PRIVATE)
     */
    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Req() req,
        @Body() body: { name?: string; description?: string; isPublic?: boolean }
    ) {
        return this.playlistService.update(id, req.user.id, body);
    }

    /**
     * 8. EFASE PLAYLIST
     */
    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async delete(@Param('id') id: string, @Req() req) {
        return this.playlistService.delete(id, req.user.id);
    }
}