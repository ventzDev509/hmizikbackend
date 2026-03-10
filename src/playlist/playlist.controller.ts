import { Controller, Post, Get, Body, Param, UseGuards, Req, Delete } from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistController {
    constructor(private readonly playlistService: PlaylistService) { }

    @Post()
    create(@Req() req, @Body('name') name: string, @Body('description') description: string, @Body('coverUrl') coverUrl: string) {
        return this.playlistService.create(req.user.id, name, description,coverUrl);
    }

    @Get('me')
    async getMyPlaylists(@Req() req) {
        return this.playlistService.findAllByUser(req.user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.playlistService.findOne(id);
    }

    @Post(':id/tracks')
    addTrack(@Param('id') id: string, @Body('trackId') trackId: string) {
        return this.playlistService.addTrack(id, trackId);
    }

    @Delete(':id/tracks/:trackId')
    removeTrack(@Param('id') id: string, @Param('trackId') trackId: string) {
        return this.playlistService.removeTrack(id, trackId);
    }
}