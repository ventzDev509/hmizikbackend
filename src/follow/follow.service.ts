import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';

@Injectable()
export class FollowService {
    constructor(private prisma: PrismaService, private notificationService: NotificationService,) { }

   async toggleFollow(userId: string, targetUserId: string) {
  try {
    // 1. Jwenn pwofil moun k ap swiv la (Fanatik la)
    const followerProfile = await this.prisma.profile.findUnique({
      where: { userId: userId } 
    });

    // 2. Jwenn pwofil atis moun nan vle swiv la
    // Atansyon: Isit la targetUserId se ID Profile la (depi l soti nan URL la)
    const followingProfile = await this.prisma.profile.findUnique({
      where: { id: targetUserId },
      include: { user: true } // Nou enkli user a pou n ka jwenn ID recipient an
    });

    if (!followerProfile || !followingProfile) {
      throw new NotFoundException("Yonn nan pwofil yo pa egziste.");
    }

    const followerId = followerProfile.id; 
    const followingId = followingProfile.id; 

    if (followerId === followingId) {
      throw new BadRequestException("Ou pa ka swiv tèt ou.");
    }

    // 3. Tcheke si relasyon an egziste deja
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId }
      }
    });

    if (existingFollow) {
      await this.prisma.follow.delete({ where: { id: existingFollow.id } });
      return { isFollowing: false, message: "Ou pa swiv pwofil sa a ankò." };
    } else {
      // 4. Kreye relasyon Follow la nan DB
      await this.prisma.follow.create({
        data: { followerId, followingId }
      });

      // 5. VOYE NOTIFIKASYON (Lojik ki korije a)
      await this.notificationService.createNotification({
        // Recipient se ATIS la (moun ki mèt followingProfile la)
        recipientId: followingProfile.userId, 
        
        // Sender se FANATIK la (moun ki konekte a)
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

    //  jwenn kantite moun k ap swiv yon atis
    async getFollowersCount(profileId: string) {
        return this.prisma.follow.count({
            where: { followingId: profileId },
        });
    }
}