import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsIn,
  IsArray,
  IsDateString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTransportScheduleSlotDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  processId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shiftTimingId?: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  slotTime: string;

  @ApiProperty({ example: 'CAB', enum: ['CAB', 'SHUTTLE', 'BUS'] })
  @IsString()
  @IsIn(['CAB', 'SHUTTLE', 'BUS'])
  transportType: string;

  @ApiPropertyOptional({ example: 'SEDAN' })
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isAC?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vendorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  driverPoolId?: string;

  @ApiProperty({ example: '2026-09-15' })
  @IsDateString()
  availableFrom: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  availableUntil: string;

  @ApiPropertyOptional({ example: '15' })
  @IsString()
  @IsOptional()
  bookingCutoff?: string;

  @ApiPropertyOptional({ example: '30' })
  @IsString()
  @IsOptional()
  cancellationCutoff?: string;

  @ApiPropertyOptional({ example: 'FIXED', enum: ['FIXED', 'WAIT_ALL'] })
  @IsString()
  @IsIn(['FIXED', 'WAIT_ALL'])
  @IsOptional()
  departureMode?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  waitTimeoutMinutes?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  earlyPickupOffsetMinutes?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  earlyPickupBufferMinutes?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  sequenceOrder?: number;
}

export class UpdateTransportScheduleSlotDto extends PartialType(CreateTransportScheduleSlotDto) {}

export class GenerateSlotsFromPatternDto {
  @ApiProperty({ description: 'PickupDropTiming ID to generate from' })
  @IsString()
  shiftTimingId: string;

  @ApiProperty({ example: '2026-09-15' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-09-30' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: [1, 2, 3, 4, 5], description: '0=Sun, 1=Mon, ... 6=Sat' })
  @IsArray()
  @IsNumber({}, { each: true })
  daysOfWeek: number[];

  @ApiProperty({ example: 'CAB', enum: ['CAB', 'SHUTTLE', 'BUS'] })
  @IsString()
  @IsIn(['CAB', 'SHUTTLE', 'BUS'])
  transportType: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  processId?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsNumber()
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  vendorId?: string;
}

export class BulkCreateSlotsDto {
  @ApiProperty({ type: [CreateTransportScheduleSlotDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransportScheduleSlotDto)
  slots: CreateTransportScheduleSlotDto[];
}

export class SlotQueryDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  shiftTimingId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  transportType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
