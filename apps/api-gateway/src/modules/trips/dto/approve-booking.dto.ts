import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BookingAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ApproveBookingDto {
  @ApiProperty({ enum: BookingAction, example: BookingAction.APPROVE })
  @IsEnum(BookingAction)
  action: BookingAction;

  @ApiPropertyOptional({ example: 'Budget constraint exceeded' })
  @IsString()
  @IsOptional()
  reason?: string;
}
