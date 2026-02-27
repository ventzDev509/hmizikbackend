// src/profiles/profiles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/common/supabase.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProfilesService {
    constructor(private prisma: PrismaService,private supabaseService: SupabaseService,) { }

    // Jwenn pwofil pa ID itilizatè (pou edit)
    async getMyProfile(userId: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            include: { user: { select: { name: true, email: true } } },
        });
        if (!profile) throw new NotFoundException('Profile not found');
        return profile;
    }

    // Jwenn pwofil pa Username (pou lòt moun wè)
    async findByUsername(username: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { username },
            include: { user: { select: { name: true } } },
        });
        if (!profile) throw new NotFoundException('Itilizatè sa a pa egziste');
        return profile;
    }

    // Nan profile.service.ts
    async updateProfile(userId: string, data: any, files?: any) {
        const updateData: any = {
            bio: data.bio,
            username: data.username,
            // Pa bliye parse socialLinks paske FormData voye l kòm string
            socialLinks: data.socialLinks ? JSON.parse(data.socialLinks) : []
        };

        // Upload Avatar si li la
        if (files?.avatar) {
            updateData.avatarUrl = await this.supabaseService.uploadFile(files.avatar[0], 'avatars');
        }

        // Upload Banner si li la
        if (files?.banner) {
            updateData.bannerUrl = await this.supabaseService.uploadFile(files.banner[0], 'banners');
        }

        return this.prisma.profile.update({
            where: { userId },
            data: updateData,
            include: { user: true }
        });
    }
}