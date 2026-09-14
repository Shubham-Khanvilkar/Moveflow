import { IsString, IsOptional, IsBoolean, IsUUID, IsNumber, MinLength, MaxLength, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNodalPointDto {
  @ApiProperty({ example: 'NP-001' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nodalCode: string;

  @ApiProperty({ example: 'Main Gate' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nodalName: string;

  @ApiProperty({ example: 12.9716 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 77.5946 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Bangalore' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Near city park' })
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  radius?: number;

  @ApiPropertyOptional({ example: 'Zone-A' })
  @IsOptional()
  @IsString()
  billingZone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shuttleStopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: '+91-9876543210' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Parking,Wifi' })
  @IsOptional()
  @IsString()
  facilities?: string;

  @ApiPropertyOptional({ example: 'North Zone' })
  @IsOptional()
  @IsString()
  zoneName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneId?: string;
}

export class UpdateNodalPointDto extends PartialType(CreateNodalPointDto) {}

export class NodalPointQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingZone?: string;
}
