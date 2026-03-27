import { Controller, Post, Param, UseGuards, Req, Get } from '@nestjs/common';
import { FollowService } from './follow.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

@Controller('follow')
export class FollowController {
  constructor(private readonly followService: FollowService) {}

  @Post(':id')
  @UseGuards(JwtAuthGuard) 
  async toggleFollow(
    @Param('id') followingId: string, 
    @Req() req: any
  ) {
    const followerId = req.user.id; 
    return this.followService.toggleFollow(followerId, followingId);
  }

  @Get('count/:id')
  async getCount(@Param('id') profileId: string) {
    const count = await this.followService.getFollowersCount(profileId);
    return { count };
  }
}