import { IsString, IsNotEmpty, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum NotificationType {
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_APPROVED = 'BOOKING_APPROVED',
  BOOKING_REJECTED = 'BOOKING_REJECTED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  VEHICLE_APPROACHING = 'VEHICLE_APPROACHING',
  VEHICLE_ARRIVED = 'VEHICLE_ARRIVED',
  TRIP_DELAYED = 'TRIP_DELAYED',
  TRIP_COMPLETED = 'TRIP_COMPLETED',
  BOOKING_CANCELLED = 'BOOKING_CANCELLED',
  SOS_ALERT = 'SOS_ALERT',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  PUSH = 'PUSH',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type!: NotificationType;

  @IsEnum(NotificationChannel)
  @IsNotEmpty()
  channel!: NotificationChannel;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;
}
