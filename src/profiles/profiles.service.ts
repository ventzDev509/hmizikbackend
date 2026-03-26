// src/profiles/profiles.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from 'src/common/supabase.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProfilesService {
    constructor(private prisma: PrismaService, private supabaseService: SupabaseService,) { }

    async getMyProfile(userId: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                tracks: {
                    take: 10, 
                    orderBy: { createdAt: 'desc' }, 
                }, 
                _count: {
                    select: { tracks: true } 

                }
            },
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

    async getAllProfiles(onlyArtists: boolean = false) {
        const profiles = await this.prisma.profile.findMany({
            where: onlyArtists ? { isArtist: true } : {},
            include: {
                user: {
                    select: { name: true }

                },
                tracks: true
            },
            orderBy: {
                username: 'asc'
            }
        });

        // Nou vlope l pou l match ak interface Frontend lan
        return {
            data: profiles,
            meta: {
                total: profiles.length,
                page: 1,
                lastPage: 1
            }
        };
    }

    // Si w vle yon vèsyon ki gen "Pagination" (pwofesyonèl)
    async getPaginatedProfiles(page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const [profiles, total] = await Promise.all([
            this.prisma.profile.findMany({

                take: limit,
                skip: skip,
                include: { user: { select: { name: true } } },
            }),
            this.prisma.profile.count()
        ]);

        return {
            data: profiles,
            meta: {
                total,
                page,
                lastPage: Math.ceil(total / limit)
            }
        };
    }
}