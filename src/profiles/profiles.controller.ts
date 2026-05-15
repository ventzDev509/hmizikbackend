
import { Controller, Get, Patch, Body, Param, UseGuards, Req, UploadedFiles, UseInterceptors, Query, ParseIntPipe, Post, Request } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('profiles')
export class ProfilesController {
    constructor(private readonly profilesService: ProfilesService) { }

    
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Req() req) {
        return this.profilesService.getMyProfile(req.user.id);
    }
    @Get('/p/:id')
    async getById(@Param('id') id: string) {
        return this.profilesService.getMyProfile(id);
    }
    
    @Get(':username')
    async getByUsername(@Param('username') username: string) {
        return this.profilesService.findByUsername(username);
    }



    
    @UseGuards(JwtAuthGuard)
    @Patch('update')
    @UseGuards(JwtAuthGuard) 
    @UseInterceptors(FileFieldsInterceptor([
        { name: 'avatar', maxCount: 1 },
        { name: 'banner', maxCount: 1 },
    ]))
    async update(
        @Req() req,
        @Body() body: any, 
        @UploadedFiles() files: { avatar?: Express.Multer.File[], banner?: Express.Multer.File[] },
    ) {
        
        return this.profilesService.updateProfile(req.user.id, body, files);
    }

    @Get()
    async getAll(@Query('artists') artists?: string) {
        
        const onlyArtists = artists === 'true';
        return this.profilesService.getAllProfiles(onlyArtists);
    }

    @Get('paginated')
    async findAll(
        @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
        @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    ) {
        
        return this.profilesService.getPaginatedProfiles(page, limit);
    }

    @Post('become-artist')
    @UseGuards(JwtAuthGuard) 
    async upgradeToArtist(@Request() req, @Body() body: any) {
        return this.profilesService.becomeArtist(req.user.id, body);
    }

}