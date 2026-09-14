import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum, IsArray, IsDateString, ValidateNested, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ContactTypeDto {
  COMPANY_HEAD = 'COMPANY_HEAD',
  REGIONAL_HEAD = 'REGIONAL_HEAD',
  SITE_HEAD = 'SITE_HEAD',
  HR_HEAD = 'HR_HEAD',
  TRANSPORT_HEAD = 'TRANSPORT_HEAD',
  FINANCE_HEAD = 'FINANCE_HEAD',
  SECURITY_HEAD = 'SECURITY_HEAD',
  OPERATIONS_HEAD = 'OPERATIONS_HEAD',
  EMERGENCY_CONTACT = 'EMERGENCY_CONTACT',
  PROCUREMENT_CONTACT = 'PROCUREMENT_CONTACT',
  IT_CONTACT = 'IT_CONTACT',
  OTHER = 'OTHER',
}

export enum ContactStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class CreateCompanyContactDto {
  @ApiProperty({ example: 'COMPANY_HEAD' })
  @IsEnum(ContactTypeDto)
  contactType: ContactTypeDto;

  @ApiProperty({ example: 'Amit Sharma' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName: string;

  @ApiProperty({ example: 'CEO' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  designation: string;

  @ApiProperty({ example: 'amit@abc.com' })
  @IsEmail()
  officialEmail: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  mobileNumber: string;

  @ApiPropertyOptional({ example: '+919876543211' })
  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @ApiPropertyOptional({ example: '+91112345678' })
  @IsOptional()
  @IsString()
  officePhone?: string;

  @ApiPropertyOptional({ example: 'amit.alt@abc.com' })
  @IsOptional()
  @IsEmail()
  alternateEmail?: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'West' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ example: 'Executive' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  siteIds?: string[];
}

export class UpdateCompanyContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ContactTypeDto)
  contactType?: ContactTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  officialEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alternateMobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  officePhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  alternateEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ContactStatusDto)
  status?: ContactStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  siteIds?: string[];
}

export class ImportContactsDto {
  @ApiProperty({ type: [CreateCompanyContactDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCompanyContactDto)
  contacts: CreateCompanyContactDto[];
}

export class CompanyContactQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ContactTypeDto)
  contactType?: ContactTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ContactStatusDto)
  status?: ContactStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
