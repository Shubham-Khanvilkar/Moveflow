import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GpsLocationDto {
  @ApiProperty({ example: 'trip_001' })
  @IsString()
  tripId: string;

  @ApiProperty({ example: 19.076 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 72.8777 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: 35.5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(300)
  speed?: number;

  @ApiPropertyOptional({ example: 180 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(360)
  heading?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  accuracy?: number;
}
