import { Controller, Post, Body, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express'
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }
    @UseGuards(AuthGuard('jwt')) 
    @Get('me')
    async getProfile(@Req() req) {
        return req.user;
    }
    @Post('login')
    async login(@Body() loginDto: any) {
        return this.usersService.login(loginDto);
    }
    
    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }
    @Post('magic-register')
    async magicRegister(@Body('email') email: string) {
        return this.usersService.registerWithMagicLink(email);
    }

    @Get('google')
    @UseGuards(AuthGuard('google'))
    async googleAuth(@Req() req) {
        
    }

    /**
     * 4. GOOGLE CALLBACK
     * Google ap voye itilizatè a tounen isit la ak done li yo.
     */
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req, @Res() res) {
        

        const result = await this.usersService.registerWithGoogle(req.user);

        
        const frontendUrl = process.env.LINK || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}?token=${result.token}`);
    }

    
    
    @Get('confirm')
    async confirm(@Query('token') token: string) {
        return this.usersService.confirmEmail(token);
    }
}