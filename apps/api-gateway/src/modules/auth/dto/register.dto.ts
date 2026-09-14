import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'ACME' })
  @IsString()
  companyCode: string;

  @ApiProperty({ description: 'User password (min 8 characters)' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'EMPLOYEE' })
  @IsString()
  @IsOptional()
  role?: string;
}
