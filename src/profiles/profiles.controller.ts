// src/profiles/profiles.controller.ts
import { Controller, Get, Patch, Body, Param, UseGuards, Req, UploadedFiles, UseInterceptors, Query, ParseIntPipe } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('profiles')
export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) { }

    // Wè pwofil 
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Req() req) {
        return this.profilesService.getMyProfile(req.user.id);
    }
    @Get('/p/:id')
    async getById(@Param('id') id: string) {
        return this.profilesService.getMyProfile(id);
    }
    // Wè pwofil yon lòt moun (Piblik)
    @Get(':username')
    async getByUsername(@Param('username') username: string) {
        return this.profilesService.findByUsername(username);
    }



    // Edit pwofil mwen (Bezwen konekte)
    @UseGuards(JwtAuthGuard)
    @Patch('update')
    @UseGuards(JwtAuthGuard) // Asire w ou gen auth
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'avatar', maxCount: 1 },
        { name: 'banner', maxCount: 1 },
    ]))
    async update(
        @Req() req,
        @Body() body: any, // Kounye a NestJS ap ka ranpli 'body' a
        @UploadedFiles() files: { avatar?: Express.Multer.File[], banner?: Express.Multer.File[] },
    ) {
        // req.user.id soti nan JWT la
        return this.profilesService.updateProfile(req.user.id, body, files);
    }

    @Get()
    async getAll(@Query('artists') artists?: string) {
        // Si url la gen ?artists=true, n ap voye true nan sèvis la
        const onlyArtists = artists === 'true';
        return this.profilesService.getAllProfiles(onlyArtists);
    }

    @Get('paginated')
    async findAll(
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    ) {
        // Nou rele fonksyon ou te ekri a nan Sèvis la
        return this.profilesService.getPaginatedProfiles(page, limit);
    }

}