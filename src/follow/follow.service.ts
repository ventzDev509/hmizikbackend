import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class FollowService {
    constructor(private prisma: PrismaService, private notificationService: NotificationService,) { }

   async toggleFollow(userId: string, targetUserId: string) {
  try {
    
    const followerProfile = await this.prisma.profile.findUnique({
      where: { userId: userId } 
    });

    
    
    const followingProfile = await this.prisma.profile.findUnique({
      where: { id: targetUserId },
      include: { user: true } 
    });

    if (!followerProfile || !followingProfile) {
      throw new NotFoundException("Yonn nan pwofil yo pa egziste.");
    }

    const followerId = followerProfile.id; 
    const followingId = followingProfile.id; 

    if (followerId === followingId) {
      throw new BadRequestException("Ou pa ka swiv tèt ou.");
    }

    
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId }
      }
    });

    if (existingFollow) {
      await this.prisma.follow.delete({ where: { id: existingFollow.id } });
      return { isFollowing: false, message: "Ou pa swiv pwofil sa a ankò." };
    } else {
      
      await this.prisma.follow.create({
        data: { followerId, followingId }
      });

      
      await this.notificationService.createNotification({
        
        recipientId: followingProfile.userId, 
        
        
        senderId: userId, 
        
        type: 'FOLLOW',
        relatedId: followerId,
      });

      return { isFollowing: true, message: "Ou kòmanse swiv pwofil sa a." };
    }

  } catch (error) {
    console.log("Erè nan toggleFollow:", error);
    throw error;
  }
}

    
    async getFollowersCount(profileId: string) {
        return this.prisma.follow.count({
            where: { followingId: profileId },
        });
    }
}