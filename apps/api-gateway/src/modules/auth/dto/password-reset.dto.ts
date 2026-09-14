import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-abc123' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
