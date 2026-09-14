import { IsOptional, IsString, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum LiveStatusFilter {
  ALL = 'ALL',
  ON_TIME = 'ON_TIME',
  DELAYED = 'DELAYED',
  NO_SHOW = 'NO_SHOW',
  YET_TO_START = 'YET_TO_START',
  TRAVELLING = 'TRAVELLING',
  ARRIVED = 'ARRIVED',
}

export class LiveStatusQueryDto {
  @ApiPropertyOptional({ example: '2026-09-05' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiPropertyOptional({ enum: LiveStatusFilter, default: LiveStatusFilter.ALL })
  @IsOptional()
  @IsEnum(LiveStatusFilter)
  status?: LiveStatusFilter;
}

export class LiveStatusFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: LiveStatusFilter, default: LiveStatusFilter.ALL })
  @IsOptional()
  @IsEnum(LiveStatusFilter)
  status?: LiveStatusFilter;
}
