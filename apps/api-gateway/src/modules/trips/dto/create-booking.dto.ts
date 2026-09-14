import { IsString, IsNumber, IsOptional, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'user_emp_001' })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: 19.076 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  pickupLatitude: number;

  @ApiProperty({ example: 72.8777 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  pickupLongitude: number;

  @ApiProperty({ example: 19.0596 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  dropLatitude: number;

  @ApiProperty({ example: 72.8656 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  dropLongitude: number;

  @ApiPropertyOptional({ example: 'shift_morning' })
  @IsString()
  @IsOptional()
  shiftId?: string;

  @ApiPropertyOptional({ example: 'SEDAN' })
  @IsString()
  @IsOptional()
  vehicleType?: string;

  @ApiProperty({ example: '2026-09-10T08:00:00.000Z' })
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional({ example: 'BKC Complex' })
  @IsString()
  @IsOptional()
  pickupAddress?: string;

  @ApiPropertyOptional({ example: 'Andheri West' })
  @IsString()
  @IsOptional()
  dropAddress?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(50)
  passengerCount?: number;

  @ApiPropertyOptional({ example: 'Monthly pass request' })
  @IsString()
  @IsOptional()
  notes?: string;
}
