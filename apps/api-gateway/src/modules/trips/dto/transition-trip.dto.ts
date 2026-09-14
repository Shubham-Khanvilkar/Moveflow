import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const VALID_ACTIONS = [
  'START', 'COMPLETE', 'CANCEL', 'PAUSE', 'RESUME',
  'ARRIVE_AT_PICKUP', 'BOARD_PASSENGERS', 'DEPART_PICKUP',
  'ARRIVE_AT_DESTINATION', 'ALIGHT_PASSENGERS',
];

export class TransitionTripDto {
  @ApiProperty({ example: 'START', enum: VALID_ACTIONS })
  @IsString()
  @IsIn(VALID_ACTIONS)
  action: string;

  @ApiPropertyOptional({ example: 'Traffic delay' })
  @IsString()
  @IsOptional()
  reason?: string;
}
