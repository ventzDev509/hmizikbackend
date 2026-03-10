import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Asire w chemen sa a bon

@Injectable()
export class PlaylistService {
  constructor(private prisma: PrismaService) {}

  // Kreye yon nouvo playlist
  async create(userId: string, name: string, description?: string, coverUrl?:string) {
    return this.prisma.playlist.create({
      data: {
        name,
        description,
        userId,
        coverUrl,
      },
    });
  }

  // Jwenn tout playlist yon itilizatè
  async findAllByUser(userId: string) {
    return this.prisma.playlist.findMany({
      where: { userId },
      include: {
        _count: {
          select: { tracks: true }
        }
      }
    });
  }

  // Jwenn yon sèl playlist ak tout mizik ki ladan l
  async findOne(id: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id },
      include: { tracks: true, user: { select: { name: true } } }
    });
    if (!playlist) throw new NotFoundException('Playlist sa pa egziste');
    return playlist;
  }

  // Ajoute yon mizik nan yon playlist (Many-to-Many)
  async addTrack(playlistId: string, trackId: string) {
    return this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        tracks: {
          connect: { id: trackId }
        }
      },
      include: { tracks: true }
    });
  }

  // Retire yon mizik nan yon playlist
  async removeTrack(playlistId: string, trackId: string) {
    return this.prisma.playlist.update({
      where: { id: playlistId },
      data: {
        tracks: {
          disconnect: { id: trackId }
        }
      }
    });
  }
}