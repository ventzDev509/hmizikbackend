
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

    
    async findByUsername(username: string) {
        const profile = await this.prisma.profile.findUnique({
            where: { username },
            include: { user: { select: { name: true } } },
        });
        if (!profile) throw new NotFoundException('Itilizatè sa a pa egziste');
        return profile;

    }

    
    async updateProfile(userId: string, data: any, files?: any) {
        const updateData: any = {
            bio: data.bio,
            username: data.username,
            
            socialLinks: data.socialLinks ? JSON.parse(data.socialLinks) : []
        };

        
        if (files?.avatar) {
            updateData.avatarUrl = await this.supabaseService.uploadFile(files.avatar[0], 'avatars');
        }

        
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

        
        return {
            data: profiles,
            meta: {
                total: profiles.length,
                page: 1,
                lastPage: 1
            }
        };
    }

    
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



    async becomeArtist(userId: string, data: { stageName: string; bio?: string; location?: string; socialLinks?: any }) {
        
        const profile = await this.prisma.profile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new NotFoundException('Pwofil sa a pa egziste');
        }

        
        return this.prisma.$transaction(async (tx) => {

            
            await tx.user.update({
                where: { id: userId },
                data: { role: 'ARTIST' }, 
            });

            
            return tx.profile.update({
                where: { userId },
                data: {
                    isArtist: true,
                    username: data.stageName, 
                    bio: data.bio || profile.bio,
                    location: data.location || profile.location,
                    socialLinks: data.socialLinks ? data.socialLinks : profile.socialLinks,
                    verified: false, 
                },
                include: { user: true }
            });
        });
    }
}