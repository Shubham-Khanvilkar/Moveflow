import { IsString, IsOptional, IsBoolean, IsUUID, MinLength, MaxLength } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTeamDto {
  @ApiProperty({ example: 'Engineering Team' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'ENG-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({ example: 'Core engineering team' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;
}

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}

export class AddTeamMemberDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}

export class TeamQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
