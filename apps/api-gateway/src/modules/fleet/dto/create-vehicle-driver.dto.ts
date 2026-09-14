import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVehicleDto {
  @ApiProperty({ example: 'MH01AB1234' })
  @IsString()
  registrationNo: string;

  @ApiProperty({ example: 'Tata' })
  @IsString()
  make: string;

  @ApiProperty({ example: 'Nexon EV' })
  @IsString()
  model: string;

  @ApiProperty({ example: 'SEDAN', enum: ['SEDAN', 'SUV', 'VAN', 'BUS', 'AUTO_RICKSHAW'] })
  @IsString()
  @IsEnum(['SEDAN', 'SUV', 'VAN', 'BUS', 'AUTO_RICKSHAW'])
  vehicleType: string;

  @ApiProperty({ example: 'ELECTRIC', enum: ['PETROL', 'DIESEL', 'CNG', 'ELECTRIC'] })
  @IsString()
  @IsEnum(['PETROL', 'DIESEL', 'CNG', 'ELECTRIC'])
  fuelType: string;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  @Max(60)
  capacity: number;

  @ApiPropertyOptional({ example: 'AC', enum: ['AC', 'NON_AC'] })
  @IsString()
  @IsOptional()
  @IsEnum(['AC', 'NON_AC'])
  acType?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isEV?: boolean;
}

export class CreateDriverDto {
  @ApiProperty({ example: 'Mohammed Ali' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'driver@acme.com' })
  @IsString()
  email: string;

  @ApiProperty({ example: '+919876543240' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'MH-12-2019-1234567' })
  @IsString()
  licenseNo: string;
}
