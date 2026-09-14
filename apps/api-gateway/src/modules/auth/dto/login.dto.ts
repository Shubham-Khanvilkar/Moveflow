import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'ACME' })
  @IsString()
  @IsOptional()
  companyCode?: string;
}
