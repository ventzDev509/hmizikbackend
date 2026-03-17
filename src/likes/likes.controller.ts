import { Controller, Post, Get, Param, UseGuards, Request, Query, BadRequestException } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';


@Controller('likes')
export class LikesController {
  constructor(private readonly likesService: LikesService) { }

 @UseGuards(JwtAuthGuard)
@Post(':id') // Kenbe sèlman sa a
async toggle(
  @Request() req,
  @Param('id') id: string, // 'id' sa a ap toujou matche ak ':id' ki anlè a
  @Query('type') type: 'track' | 'album' = 'track' 
) {
  // Debug pou w asire w ID a rive
  console.log(`Log: Like ${type} ak ID: ${id}`);
  
  if (!id || id === 'undefined') {
    throw new BadRequestException("ID a manke nan rekèt la");
  }

  return this.likesService.toggleLike(req.user.id, id, type);
}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAllLiked(@Request() req) {
    return this.likesService.getUserFavorites(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check/:trackId')
  async check(@Request() req, @Param('trackId') trackId: string) {
    return this.likesService.checkIfLiked(req.user.id, trackId);
  }
}