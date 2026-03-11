import { Controller, Post, Get, Body, Param, UseGuards, Req, Delete, Patch } from '@nestjs/common';
import { PlaylistService } from './playlist.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

@Controller('playlists')
@UseGuards(JwtAuthGuard)
export class PlaylistController {
    constructor(private readonly playlistService: PlaylistService) { }

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Req() req, @Body('name') name: string, @Body('description') description: string, @Body('coverUrl') coverUrl: string) {
        return this.playlistService.create(req.user.id, name, description, coverUrl);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    async remove(@Param('id') id: string, @Req() req: any) {
        const userId = req.user.id;
        return this.playlistService.delete(id, userId);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Req() req: any,
        @Body() body: { name: string }
    ) {
        return this.playlistService.update(id, req.user.id, body.name);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMyPlaylists(@Req() req) {
        return this.playlistService.findAllByUser(req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.playlistService.findOne(id);
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/tracks')
    addTrack(@Param('id') id: string, @Body('trackId') trackId: string) {
        return this.playlistService.addTrack(id, trackId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id/tracks/:trackId')
    removeTrack(@Param('id') id: string, @Param('trackId') trackId: string) {
        return this.playlistService.removeTrack(id, trackId);
    }
}