import { IsString, IsOptional, IsArray, ValidateNested, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportScheduleRowDto {
  @ApiProperty({ example: 'EMP-001' })
  @IsString() employeeId: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString() @IsOptional() employeeName?: string;

  @ApiProperty({ example: '09:00' })
  @IsString() loginTime: string;

  @ApiProperty({ example: '18:00' })
  @IsString() logoutTime: string;

  @ApiPropertyOptional({ example: ['Saturday', 'Sunday'] })
  @IsArray() @IsOptional() weeklyOffs?: string[];

  @ApiPropertyOptional({ example: 'Main Gate' })
  @IsString() @IsOptional() nodalPoint?: string;

  @ApiPropertyOptional({ example: 'Zone-A' })
  @IsString() @IsOptional() billingZone?: string;

  @ApiPropertyOptional({ example: '123 Main Street' })
  @IsString() @IsOptional() addressLine1?: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsNumber() @IsOptional() latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsNumber() @IsOptional() longitude?: number;
}

export class ImportScheduleJobDto {
  @ApiProperty({ example: 'schedule_jan_2026.csv' })
  @IsString() fileName: string;

  @ApiProperty({ example: 1024 })
  @IsNumber() fileSize: number;

  @ApiProperty({ type: [ImportScheduleRowDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ImportScheduleRowDto) rows: ImportScheduleRowDto[];
}

export class ExportScheduleQueryDto {
  @ApiProperty({ example: '2026-01-01' })
  @IsDateString() startDate: string;

  @ApiProperty({ example: '2026-01-31' })
  @IsDateString() endDate: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsString() @IsOptional() siteId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440005' })
  @IsString() @IsOptional() teamId?: string;

  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440004' })
  @IsString() @IsOptional() departmentId?: string;

  @ApiPropertyOptional({ example: 'CSV', description: 'Export format: CSV or JSON' })
  @IsString() @IsOptional() format?: string;
}

export class ExportTeamQueryDto {
  @ApiPropertyOptional({ example: '550e8400-e29b-41d4-a716-446655440001' })
  @IsString() @IsOptional() siteId?: string;

  @ApiPropertyOptional({ example: 'CSV', description: 'Export format: CSV or JSON' })
  @IsString() @IsOptional() format?: string;
}
