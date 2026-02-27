import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from 'generated/prisma/enums';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Non an obligatwa' })
  name: string;

  @IsEmail({}, { message: 'Fòma imèl la pa valab' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Modpas la dwe gen omwen 8 karaktè' })
  password: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  adress?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}