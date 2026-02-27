import {
    Injectable,
    ConflictException,
    NotFoundException,
    InternalServerErrorException,
    BadRequestException,
    Logger
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        private prisma: PrismaService,
        private mailService: MailService,
        private jwtService: JwtService,
    ) { }

    /**
     * 1. REGISTER (Kreyasyon kont + Imèl konfimasyon)
     * Nou sove moun nan epi nou voye yon "Welcome Email" ak yon token inik.
     */
    async create(createUserDto: CreateUserDto) {
        const { password, email, ...rest } = createUserDto;

        const userEmailTaken = await this.prisma.user.findUnique({
            where: { email },
        });

        if (userEmailTaken) {
            this.logger.warn(`Email collision: ${email}`);
            throw new ConflictException({
                errorCode: 'ERR_AUTH_EMAIL_ALREADY_EXISTS',
                message: 'This email is already registered.',
            });
        }

        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Nou kreye yon token inik pou konfime imèl la
            const confirmationToken = uuidv4();

            const user = await this.prisma.user.create({
                data: {
                    ...rest,
                    email,
                    password: hashedPassword,
                    confirmationToken: confirmationToken,
                    isEmailConfirmed: false, // Li dwe konfime l anvan li ka konekte
                    profile: {
                        create: {
                            username: email.split('@')[0] + Math.floor(1000 + Math.random() * 9000),
                        },
                    },
                },
                include: { profile: true },
            });

            // Nou voye imèl la an background (san n pa bloke API a)
            this.mailService.sendUserConfirmation(user, confirmationToken).catch((err) => {
                
                this.logger.error(`Mail failed for ${email}: ${err.message}`);
            });

            const { password: _, ...cleanUser } = user;
            return {
                success: true,
                errorCode: 'SUCCESS_USER_CREATED',
                message: 'Kon ou an kreye pliz verifye emel ou pou yon lyen konfimation',
                data: cleanUser
            };

        } catch (error) {
            this.logger.error(`Create Error: ${error.message}`);
            throw new InternalServerErrorException({
                errorCode: 'ERR_SERVER_DATABASE_ERROR',
                message: 'Something went wrong on our end.',
            });
        }
    }

    // src/users/users.service.ts

    async registerWithGoogle(googleUser: any) {
        const { email, firstName, lastName, picture } = googleUser;

        // 1. Tcheke si imèl sa a deja nan baz done a
        let user = await this.prisma.user.findUnique({
            where: { email },
            include: { profile: true }
        });

        if (!user) {
            this.logger.log(`Nouvo itilizatè Google: ${email}`);

            // 2. KREYE ITILIZATÈ A SI L PA EGZISTE
            user = await this.prisma.user.create({
                data: {
                    email,
                    name: `${firstName} ${lastName}`,
                    password: '', // Google pa bezwen modpas
                    isEmailConfirmed: true,
                    provider: 'google',
                    profile: {
                        create: {
                            username: email.split('@')[0] + Math.floor(Math.random() * 1000),
                            avatarUrl: picture
                        }
                    }
                },
                include: { profile: true }
            });
        }

        // 3. Jenere JWT Token an
        const token = await this.jwtService.signAsync({
            sub: user?.id,
            email: user?.email
        });

        return { token, user };
    }

    /**
     * 8. LOGIN KLASIK (Email + Password)
     */
    async login(loginDto: any) {
        const { email, password } = loginDto;
      
        if (!loginDto?.email) {
            throw new BadRequestException({
                errorCode: 'ERR_AUTH_EMAIL_REQUIRED',
                message: 'Imèl la obligatwa.',
            });
        }
        const user = await this.prisma.user.findUnique({
            where: { email: email },
            include: { profile: true },
        });

        if (!user) {
            throw new BadRequestException({
                errorCode: 'ERR_AUTH_INVALID_CREDENTIALS',
                message: 'Email oswa modpas la pa kòrèk.',
            });
        }

        // 2. Si se yon kont Google oswa Magic Link, li pa gen modpas
        if (!user.password) {
            throw new BadRequestException({
                errorCode: 'ERR_AUTH_NO_PASSWORD',
                message: 'Kont sa a itilize Google oswa Magic Link. Tanpri konekte ak metòd sa yo.',
            });
        }

        // 3. Verifye modpas la
        
        const isPasswordValid = await bcrypt.compare(password, user.password);
       
        if (!isPasswordValid) {
            throw new BadRequestException({
                errorCode: 'ERR_AUTH_INVALID_CREDENTIALS',
                message: 'Email oswa modpas la pa kòrèk.',
            });
        }

        // 4. Verifye si imèl la konfime
        
        if (!user.isEmailConfirmed) {
            throw new BadRequestException({
                errorCode: 'ERR_AUTH_EMAIL_NOT_CONFIRMED',
                message: 'Tanpri konfime imèl ou anvan ou konekte.',
            });
        }

        // 5. Jenere Token JWT
        const token = await this.jwtService.signAsync({
            sub: user.id,
            email: user.email,
        });

        const { password: _, ...safeUser } = user;
        return {
            success: true,
            token,
            user: safeUser,
        };
    }



    /**
     * 2. KONFIME IMÈL (Lè user a klike lyen an)
     * Sa a se "Login with Email link" validation an.
     */
    async confirmEmail(token: string) {
        const user = await this.prisma.user.findFirst({
            where: { confirmationToken: token },
        });

        if (!user) {
            throw new BadRequestException({
                errorCode: 'ERR_INVALID_TOKEN',
                message: 'The confirmation link is invalid or expired.',
            });
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailConfirmed: true,
                confirmationToken: null, // Nou efase l piske l fin itilize
            },
        });

        return {
            success: true,
            errorCode: 'SUCCESS_EMAIL_CONFIRMED',
            message: 'Email confirmed! You can now log in.',
        };
    }

    /**
 * 3. LOGIC POU MAGIC LINK (REGISTER/LOGIN VIA EMAIL)
 * Si user a pa egziste, nou kreye l. Si l egziste, nou voye lyen an sèlman.
 */
    async registerWithMagicLink(email: string) {
        // 1. Nou tcheke si user a deja egziste
        let user = await this.prisma.user.findUnique({
            where: { email },
        });

        const magicToken = uuidv4();

        if (!user) {
            // Si user a nèf, nou kreye l san modpas (li ka mete youn pita nan Profile li)
            // Nou ba li yon "provider" ki rele 'magic-link'
            user = await this.prisma.user.create({
                data: {
                    email,
                    name: '',
                    password: '',
                    confirmationToken: magicToken,
                    isEmailConfirmed: false,
                    provider: 'magic-link',
                    profile: {
                        create: {
                            username: email.split('@')[0] + Math.floor(1000 + Math.random() * 9000),
                        },
                    },
                },
                include: { profile: true },
            });
        } else {
            // Si l te deja egziste, nou mete ajou token li a pou nouvo koneksyon an
            await this.prisma.user.update({
                where: { id: user.id },
                data: { confirmationToken: magicToken },
            });
        }

        // 2. Voye imèl la ak lyen majik la
        // Ou ka kreye yon lòt template nan MailService espesyal pou Magic Link
        this.mailService.sendUserConfirmation(email, magicToken).catch((err) => {
            this.logger.error(`Magic Link failed for ${email}: ${err.message}`);
        });

        return {
            success: true,
            message: 'Yon lyen majik voye nan imèl ou. Klike sou li pou w konekte.',
        };
    }

    /**
     * 3. FIND BY EMAIL (Pou lojik Login an)
     * Nou asire nou ke n ap rale modpas la isit la pou n ka verifye l apre.
     */
    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email },
            include: { profile: true },
        });
    }

    /**
     * 4. FIND ONE (Pa ID)
     */
    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { profile: true },
        });

        if (!user) {
            throw new NotFoundException({
                errorCode: 'ERR_USER_NOT_FOUND',
                message: 'User not found.',
            });
        }

        const { password, ...safeUser } = user;
        return safeUser;
    }

    /**
     * 5. UPDATE USER
     */
    async update(id: string, updateData: any) {
        await this.findOne(id);

        try {
            const updatedUser = await this.prisma.user.update({
                where: { id },
                data: updateData,
            });

            const { password: _, ...result } = updatedUser;
            return {
                success: true,
                errorCode: 'SUCCESS_USER_UPDATED',
                data: result
            };
        } catch (error) {
            throw new InternalServerErrorException({
                errorCode: 'ERR_USER_UPDATE_FAILED',
                message: 'Could not update user info.',
            });
        }
    }

    /**
     * 6. UPDATE PASSWORD
     */
    async updatePassword(id: string, newPass: string) {
        await this.findOne(id);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPass, salt);

        await this.prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });

        return {
            success: true,
            errorCode: 'SUCCESS_PASSWORD_UPDATED',
            message: 'Password updated successfully.',
        };
    }

    /**
     * 7. REMOVE USER
     */
    async remove(id: string) {
        await this.findOne(id);
        try {
            await this.prisma.user.delete({ where: { id } });
            return {
                success: true,
                errorCode: 'SUCCESS_USER_DELETED',
                message: 'Account deleted successfully.'
            };
        } catch (error) {
            throw new InternalServerErrorException({
                errorCode: 'ERR_USER_DELETE_FAILED',
                message: 'Error while deleting the account.',
            });
        }
    }
}