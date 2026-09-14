import { PartialType } from '@nestjs/swagger';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class UpdateTransportScheduleConfigDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allowMultipleAdditional?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  maxAdditionalMovementsPerDay?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allowAdHocShifts?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  adHocShiftApprovalRequired?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  allowOvernightShifts?: boolean;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  bookingCutoffMinutes?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsNumber()
  @IsOptional()
  defaultSlotIntervalMinutes?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsNumber()
  @IsOptional()
  defaultEarlyPickupOffsetMinutes?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsNumber()
  @IsOptional()
  defaultEarlyPickupBufferMinutes?: number;

  @ApiPropertyOptional({ example: 'FIXED', enum: ['FIXED', 'WAIT_ALL'] })
  @IsString()
  @IsIn(['FIXED', 'WAIT_ALL'])
  @IsOptional()
  defaultDropDepartureMode?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  defaultDropWaitTimeoutMinutes?: number;
}
