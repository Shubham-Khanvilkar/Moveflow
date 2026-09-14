import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScheduleDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsString()
  userId: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiProperty({ example: '2026-01-01' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  loginTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  logoutTime: string;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  loginBuffer?: number = 15;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  logoutBuffer?: number = 15;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  loginArrivalBuffer?: number = 15;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  logoutDepartureBuffer?: number = 15;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean = true;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5] })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  recurringDays?: number[];

  @ApiPropertyOptional({ example: ['Saturday', 'Sunday'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  weeklyOffs?: string[];

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440002' })
  @IsString()
  @IsOptional()
  nodalPointId?: string;

  @ApiPropertyOptional({ example: 'Zone-A' })
  @IsString()
  @IsOptional()
  billingZone?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440003' })
  @IsString()
  @IsOptional()
  routeId?: string;

  @ApiPropertyOptional({ description: 'Link to PickupDropTiming for shift rules' })
  @IsString()
  @IsOptional()
  shiftTimingId?: string;
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

export class WeeklyGridQueryDto {
  @ApiProperty({ example: '2026-01-06' })
  @IsDateString()
  weekStart: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsString()
  @IsOptional()
  siteId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440004' })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440005' })
  @IsString()
  @IsOptional()
  teamId?: string;
}

export class SwapScheduleDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440010' })
  @IsString()
  scheduleId1: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440011' })
  @IsString()
  scheduleId2: string;

  @ApiPropertyOptional({ example: 'Employee request' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkCreateScheduleDto {
  @ApiProperty({ type: [CreateScheduleDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateScheduleDto)
  schedules: CreateScheduleDto[];
}

export class ScheduleHistoryQueryDto {
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

  @ApiPropertyOptional({ example: 'CREATE' })
  @IsString()
  @IsOptional()
  changeType?: string;
}
