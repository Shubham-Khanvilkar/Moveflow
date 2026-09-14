import { IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsBoolean, IsLatitude, IsLongitude, Matches } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AddressType {
  RESIDENTIAL = 'RESIDENTIAL',
  PERMANENT = 'PERMANENT',
  CORRESPONDENCE = 'CORRESPONDENCE',
}

export class CreateAddressDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Home' })
  @IsString()
  label: string;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ example: 'Bangalore' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  state: string;

  @ApiProperty({ example: '560001' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'pincode must be 6 digits' })
  pincode: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ example: 12.9716 })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 77.5946 })
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ example: 'Near the park' })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiPropertyOptional({ enum: AddressType, example: AddressType.RESIDENTIAL })
  @IsEnum(AddressType)
  @IsOptional()
  addressType?: AddressType;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}

export class AddressQueryDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: AddressType, example: AddressType.RESIDENTIAL })
  @IsEnum(AddressType)
  @IsOptional()
  addressType?: AddressType;
}
