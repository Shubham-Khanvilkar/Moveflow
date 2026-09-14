import { IsString, IsEmail, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDriverDto {
  @ApiProperty({ example: 'Rajesh Kumar' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'rajesh@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^\d{10}$/, { message: 'phone must be exactly 10 digits' })
  phone: string;

  @ApiProperty({ example: 'DL-2026-0001' })
  @IsString()
  @MaxLength(50)
  licenseNo: string;
}
