import { IsString, IsOptional, IsInt, IsEnum, MinLength, MaxLength, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UsageType {
  CAB = 'CAB',
  SHUTTLE = 'SHUTTLE',
}

export enum FuelTypeEnum {
  CNG = 'CNG',
  DIESEL = 'DIESEL',
  PETROL = 'PETROL',
  ELECTRIC = 'ELECTRIC',
}

export class CreateVehicleTypeDto {
  @ApiProperty({ example: 'Executive Sedan' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Premium sedan for executive travel' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: UsageType, example: UsageType.CAB })
  @IsOptional()
  @IsEnum(UsageType)
  usageType?: UsageType;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  totalCapacity: number;

  @ApiPropertyOptional({ enum: FuelTypeEnum, example: FuelTypeEnum.DIESEL })
  @IsOptional()
  @IsEnum(FuelTypeEnum)
  fuelType?: FuelTypeEnum;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateVehicleTypeDto extends PartialType(CreateVehicleTypeDto) {}

export class VehicleTypeQueryDto {
  @ApiPropertyOptional({ enum: UsageType })
  @IsOptional()
  @IsEnum(UsageType)
  usageType?: UsageType;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
