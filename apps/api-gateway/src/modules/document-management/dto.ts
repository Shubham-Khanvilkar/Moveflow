import { IsString, IsOptional, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DocumentOwnerTypeDto {
  DRIVER = 'DRIVER',
  VEHICLE = 'VEHICLE',
  VENDOR = 'VENDOR',
  COMPANY = 'COMPANY',
  SITE = 'SITE',
  EMPLOYEE = 'EMPLOYEE',
  INCIDENT = 'INCIDENT',
  INVOICE = 'INVOICE',
}

export enum DocumentTypeDto {
  DRIVING_LICENSE = 'DRIVING_LICENSE',
  IDENTITY_PROOF = 'IDENTITY_PROOF',
  PERMIT = 'PERMIT',
  MEDICAL_FITNESS = 'MEDICAL_FITNESS',
  VENDOR_DOCUMENT = 'VENDOR_DOCUMENT',
  REGISTRATION = 'REGISTRATION',
  FITNESS_CERTIFICATE = 'FITNESS_CERTIFICATE',
  PUCC = 'PUCC',
  INSURANCE = 'INSURANCE',
  COMPANY_CONTRACT = 'COMPANY_CONTRACT',
  SITE_CONTRACT = 'SITE_CONTRACT',
  INCIDENT_EVIDENCE = 'INCIDENT_EVIDENCE',
  INVOICE_ATTACHMENT = 'INVOICE_ATTACHMENT',
  OTHER = 'OTHER',
}

export enum DocumentVerificationStatusDto {
  UPLOADED = 'UPLOADED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  REPLACED = 'REPLACED',
  ARCHIVED = 'ARCHIVED',
}

export class UploadDocumentDto {
  @ApiProperty({ example: 'DRIVER' })
  @IsEnum(DocumentOwnerTypeDto)
  ownerType: DocumentOwnerTypeDto;

  @ApiProperty({ example: 'uuid-of-entity' })
  @IsString()
  ownerId: string;

  @ApiProperty({ example: 'DRIVING_LICENSE' })
  @IsEnum(DocumentTypeDto)
  documentType: DocumentTypeDto;

  @ApiProperty({ example: 'DL-123456' })
  @IsString()
  documentNumber: string;

  @ApiPropertyOptional({ example: 'Regional Transport Office' })
  @IsOptional()
  @IsString()
  issuingAuthority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  manuallyEnteredDate?: boolean;

  @ApiPropertyOptional({ example: 'user-entered' })
  @IsOptional()
  @IsString()
  dateSource?: string;

  @ApiPropertyOptional({ example: 'license-file.pdf' })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiPropertyOptional({ example: '/uploads/license-file.pdf' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 1024000 })
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VerifyDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDocumentDto {
  @ApiProperty({ example: 'Document is blurry and unreadable' })
  @IsString()
  reason: string;
}

export class ReplaceDocumentDto {
  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class DocumentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(DocumentOwnerTypeDto)
  ownerType?: DocumentOwnerTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(DocumentTypeDto)
  documentType?: DocumentTypeDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(DocumentVerificationStatusDto)
  status?: DocumentVerificationStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  limit?: number;
}
