import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

/**
 * SECTION 37: Document Type Taxonomy Service
 *
 * Manages configurable, multi-country document types.
 * Compliance Team/SUPERADMIN can add new country/doc types without code changes.
 * Upload dropdown is a filtered query against this table.
 */

@Injectable()
export class DocumentTypeService {
  private readonly logger = new Logger(DocumentTypeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get document types filtered by country, category, and party type.
   * Used by the upload dropdown.
   */
  async getDocumentTypes(filters: {
    countryCode?: string;
    category?: string;
    partyType?: string;
  }): Promise<any[]> {
    const where: any = { isActive: true };

    if (filters.category) where.category = filters.category;

    // Filter by party type — appliesTo is an array field
    if (filters.partyType) {
      where.appliesTo = { has: filters.partyType };
    }

    // Get country-specific + universal (null) types
    if (filters.countryCode) {
      where.OR = [
        { countryCode: filters.countryCode },
        { countryCode: null },
      ];
    }

    return (await this.prisma.documentTypeDefinition.findMany({
      where,
      orderBy: [{ countryCode: 'desc' }, { category: 'asc' }, { label: 'asc' }],
    })) || [];
  }

  /**
   * Create a new document type (Compliance Team / SUPERADMIN).
   */
  async createDocumentType(data: {
    countryCode?: string;
    category: string;
    appliesTo: string[];
    code: string;
    label: string;
    requiresExpiry: boolean;
    isMandatory: boolean;
    createdByUserId?: string;
  }): Promise<any> {
    return this.prisma.documentTypeDefinition.create({
      data: {
        countryCode: data.countryCode || null,
        category: data.category as any,
        appliesTo: data.appliesTo as any,
        code: data.code,
        label: data.label,
        requiresExpiry: data.requiresExpiry,
        isMandatory: data.isMandatory,
        createdByUserId: data.createdByUserId,
      },
    });
  }

  /**
   * Get all document types (admin view).
   */
  async getAllDocumentTypes(): Promise<any[]> {
    return this.prisma.documentTypeDefinition.findMany({
      orderBy: [{ countryCode: 'asc' }, { category: 'asc' }, { label: 'asc' }],
    });
  }
}
