import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FollowService {
    constructor(private prisma: PrismaService) { }

    async toggleFollow(userId: string, targetUserId: string) {
    // 1. Jwenn pwofil moun k ap swiv la (moun ki konekte a)
    const followerProfile = await this.prisma.profile.findUnique({
        where: { userId: userId } // Nou chèche l ak userId ki nan JWT a
    });

    // 2. Jwenn pwofil atis moun nan vle swiv la
    const followingProfile = await this.prisma.profile.findUnique({
        where: { userId: targetUserId } // Oswa si w ap voye ProfileID dirèkteman, sèvi ak 'id'
    });

    if (!followerProfile || !followingProfile) {
        throw new NotFoundException("Yonn nan pwofil yo pa egziste.");
    }

    const followerId = followerProfile.id; // ID ki soti nan tab Profile
    const followingId = followingProfile.id; // ID ki soti nan tab Profile

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
        await this.prisma.follow.create({
            data: { followerId, followingId }
        });
        return { isFollowing: true, message: "Ou kòmanse swiv pwofil sa a." };
    }
}

    // Fonksyon pou jwenn kantite moun k ap swiv yon atis
    async getFollowersCount(profileId: string) {
        return this.prisma.follow.count({
            where: { followingId: profileId },
        });
    }
}