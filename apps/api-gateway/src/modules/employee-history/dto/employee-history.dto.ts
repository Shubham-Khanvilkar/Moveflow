import { IsOptional, IsString, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export enum HistoryAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  TEAM_ASSIGNED = 'TEAM_ASSIGNED',
  SCHEDULE_MODIFIED = 'SCHEDULE_MODIFIED',
  TRANSPORT_ELIGIBILITY_CHANGED = 'TRANSPORT_ELIGIBILITY_CHANGED',
  OTHER = 'OTHER',
}

export class CreateEmployeeHistoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  oldValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  newValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  correlationId?: string;
}

export class EmployeeHistoryQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: HistoryAction })
  @IsOptional()
  @IsEnum(HistoryAction)
  action?: HistoryAction;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-09-05' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
