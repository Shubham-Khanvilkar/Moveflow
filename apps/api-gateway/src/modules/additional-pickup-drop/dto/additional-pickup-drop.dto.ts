import { IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsLatitude, IsLongitude, Matches, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PickupDropType {
  PRIMARY = 'PRIMARY',
  ADDITIONAL = 'ADDITIONAL',
  AD_HOC = 'AD_HOC',
}

export class CreatePickupDropDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  userId: string;

  @ApiProperty({ example: '2026-01-06' })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: PickupDropType, example: PickupDropType.PRIMARY })
  @IsEnum(PickupDropType)
  pickupDropType: PickupDropType;

  @ApiProperty({ example: '123 Main Street' })
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 12.9716 })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ example: 77.5946 })
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'time must be in HH:mm format' })
  time: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsString()
  @IsOptional()
  nodalPointId?: string;

  @ApiPropertyOptional({ example: 'Zone-A' })
  @IsString()
  @IsOptional()
  billingZone?: string;

  @ApiPropertyOptional({ example: 'Near the gate' })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @Min(1)
  @Max(999)
  @IsOptional()
  sequenceOrder?: number;
}

export class UpdatePickupDropDto extends PartialType(CreatePickupDropDto) {}

export class PickupDropQueryDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-01-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: PickupDropType, example: PickupDropType.PRIMARY })
  @IsEnum(PickupDropType)
  @IsOptional()
  pickupDropType?: PickupDropType;
}
