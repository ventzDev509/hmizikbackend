import { Controller, Post, Body, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express'
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }
    @UseGuards(AuthGuard('jwt')) // Pwoteje route la ak JWT
    @Get('me')
    async getProfile(@Req() req) {
        return req.user;
    }
    @Post('login')
    async login(@Body() loginDto: any) {
        return this.usersService.login(loginDto);
    }
    // 1. Route pou Register (Email + Modpas)
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
        // Passport ap jere redirection otomatikman isit la
    }

    /**
     * 4. GOOGLE CALLBACK
     * Google ap voye itilizatè a tounen isit la ak done li yo.
     */
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthRedirect(@Req() req, @Res() res) {
        // Done Google yo ap nan req.user gras ak Strategy la

        const result = await this.usersService.registerWithGoogle(req.user);

        // Redireksyon sou Frontend lan ak Token an
        const frontendUrl = process.env.LINK || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}?token=${result.token}`);
    }

    // 2. Route pou konfime imèl (sa moun nan ap klike nan imèl li a)
    // GET /users/confirm?token=...
    @Get('confirm')
    async confirm(@Query('token') token: string) {
        return this.usersService.confirmEmail(token);
    }
}