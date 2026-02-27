// src/profiles/profiles.controller.ts
import { Controller, Get, Patch, Body, Param, UseGuards, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
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

    // Wè pwofil yon lòt moun (Piblik)
    @Get(':username')
    async getByUsername(@Param('username') username: string) {
        return this.profilesService.findByUsername(username);
    }

    // Edit pwofil mwen (Bezwen konekte)
    @UseGuards(JwtAuthGuard)
    @Patch('update')
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
}