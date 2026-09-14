import { IsString, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FuelTypeEnum } from '../../vehicle-type/dto/vehicle-type.dto';

export enum VehicleCategory {
  SEDAN = 'SEDAN',
  SUV = 'SUV',
  HATCHBACK = 'HATCHBACK',
  MINIVAN = 'MINIVAN',
  TEMPO = 'TEMPO',
  BUS = 'BUS',
}

export class CreateVehicleDto {
  @ApiProperty({ example: 'MH-01-AB-1234' })
  @IsString()
  @MaxLength(20)
  registrationNo: string;

  @ApiProperty({ example: 'Toyota' })
  @IsString()
  @MaxLength(100)
  make: string;

  @ApiProperty({ example: 'Innova Crysta' })
  @IsString()
  @MaxLength(100)
  model: string;

  @ApiProperty({ enum: VehicleCategory, example: VehicleCategory.SEDAN })
  @IsEnum(VehicleCategory)
  vehicleType: VehicleCategory;

  @ApiProperty({ enum: FuelTypeEnum, example: FuelTypeEnum.DIESEL })
  @IsEnum(FuelTypeEnum)
  fuelType: FuelTypeEnum;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  capacity: number;
}
