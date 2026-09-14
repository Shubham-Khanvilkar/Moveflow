import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  IsIn,
  Matches,
} from 'class-validator';

export class CreatePickupDropTimingDto {
  @ApiProperty({ example: 'Night Shift' })
  @IsString()
  shiftName: string;

  @ApiProperty({ example: 'NSHIFT' })
  @IsString()
  shiftCode: string;

  @ApiProperty({ example: '22:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'pickupStartTime must be HH:mm (24h)' })
  pickupStartTime: string;

  @ApiProperty({ example: '06:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'pickupEndTime must be HH:mm (24h)' })
  pickupEndTime: string;

  @ApiProperty({ example: '21:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'dropStartTime must be HH:mm (24h)' })
  dropStartTime: string;

  @ApiProperty({ example: '06:30' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'dropEndTime must be HH:mm (24h)' })
  dropEndTime: string;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @IsOptional()
  lastBookingCutoffMinutes?: number;

  @ApiPropertyOptional({ example: 24 })
  @IsNumber()
  @IsOptional()
  earlyBookingWindowHours?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isFlexible?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @IsOptional()
  flexWindowMinutes?: number;

  @ApiPropertyOptional({ example: 'MON,TUE,WED,THU,FRI' })
  @IsString()
  @IsOptional()
  applicableDays?: string;

  @ApiPropertyOptional({ example: 'CAB,SHUTTLE,BUS' })
  @IsString()
  @IsOptional()
  transportTypes?: string;

  @ApiPropertyOptional({ example: 60 })
  @IsNumber()
  @IsOptional()
  slotIntervalMinutes?: number;

  // Early pickup
  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  earlyPickupEnabled?: boolean;

  @ApiPropertyOptional({ example: 120, description: 'Minutes before shift pickup to actually pick employee' })
  @IsNumber()
  @IsOptional()
  earlyPickupOffsetMinutes?: number;

  @ApiPropertyOptional({ example: 30, description: 'Minutes buffer for employee to be ready at pickup' })
  @IsNumber()
  @IsOptional()
  earlyPickupBufferMinutes?: number;

  // Drop departure
  @ApiPropertyOptional({ example: 'FIXED', enum: ['FIXED', 'WAIT_ALL'] })
  @IsString()
  @IsIn(['FIXED', 'WAIT_ALL'])
  @IsOptional()
  dropDepartureMode?: string;

  @ApiPropertyOptional({ example: 15, description: 'Max minutes to wait for late passengers (WAIT_ALL mode)' })
  @IsNumber()
  @IsOptional()
  dropWaitTimeoutMinutes?: number;

  @ApiPropertyOptional({ example: 0, description: 'Additional minutes after drop time before departure' })
  @IsNumber()
  @IsOptional()
  dropDepartureOffsetMinutes?: number;

  // Pattern
  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  patternEnabled?: boolean;
}

export class UpdatePickupDropTimingDto extends PartialType(CreatePickupDropTimingDto) {}

export class PickupDropTimingQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  transportType?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
