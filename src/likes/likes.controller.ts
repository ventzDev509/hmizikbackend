import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';


@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':trackId')
  async toggle(@Request() req, @Param('trackId') trackId: string) {
    return this.likesService.toggleLike(req.user.id, trackId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAllLiked(@Request() req) {
    return this.likesService.getLikedTracks(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check/:trackId')
  async check(@Request() req, @Param('trackId') trackId: string) {
    return this.likesService.checkIfLiked(req.user.id, trackId);
  }
}