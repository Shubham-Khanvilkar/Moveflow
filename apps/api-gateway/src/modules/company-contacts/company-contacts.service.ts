import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import {
  CreateCompanyContactDto,
  UpdateCompanyContactDto,
  ImportContactsDto,
  CompanyContactQueryDto,
} from './dto';

@Injectable()
export class CompanyContactsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(companyId: string, dto: CreateCompanyContactDto, userId: string) {
    await this.validateCompanyExists(companyId);
    await this.validateNoDuplicateEmail(companyId, dto.officialEmail);
    await this.validateNoDuplicateMobile(companyId, dto.mobileNumber);

    if (dto.isPrimary) {
      await this.clearPrimaryForType(companyId, dto.contactType);
    }

    const contact = await this.prisma.companyContact.create({
      data: {
        companyId,
        contactType: dto.contactType,
        fullName: dto.fullName,
        designation: dto.designation,
        officialEmail: dto.officialEmail.toLowerCase().trim(),
        mobileNumber: dto.mobileNumber.trim(),
        alternateMobile: dto.alternateMobile,
        officePhone: dto.officePhone,
        alternateEmail: dto.alternateEmail?.toLowerCase().trim(),
        countryCode: dto.countryCode || '+91',
        region: dto.region,
        city: dto.city,
        siteId: dto.siteId,
        department: dto.department,
        isPrimary: dto.isPrimary || false,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validTo: dto.validTo ? new Date(dto.validTo) : null,
        notes: dto.notes,
        createdBy: userId,
        updatedBy: userId,
      },
      include: { site: true, siteLinks: { include: { site: true } } },
    });

    if (dto.siteIds && dto.siteIds.length > 0) {
      await this.prisma.companyContactSiteLink.createMany({
        data: dto.siteIds.map((siteId) => ({
          contactId: contact.id,
          siteId,
          isPrimary: false,
        })),
      });
    }

    await this.audit.log({
      userId,
      action: 'CONTACT_CREATED',
      entity: 'CompanyContact',
      entityId: contact.id,
      companyId,
      newValue: { contactType: dto.contactType, fullName: dto.fullName, email: dto.officialEmail },
    });

    return this.findById(companyId, contact.id);
  }

  async findAll(companyId: string, query: CompanyContactQueryDto) {
    const { search, contactType, status, siteId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (contactType) where.contactType = contactType;
    if (status) where.status = status;
    if (siteId) {
      where.OR = [
        { siteId },
        { siteLinks: { some: { siteId } } },
      ];
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { officialEmail: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search } },
        { designation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [contacts, total] = await Promise.all([
      this.prisma.companyContact.findMany({
        where,
        include: { site: true, siteLinks: { include: { site: true } } },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.companyContact.count({ where }),
    ]);

    return {
      contacts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(companyId: string, contactId: string) {
    const contact = await this.prisma.companyContact.findFirst({
      where: { id: contactId, companyId },
      include: { site: true, siteLinks: { include: { site: true } } },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(companyId: string, contactId: string, dto: UpdateCompanyContactDto, userId: string) {
    const existing = await this.findById(companyId, contactId);

    if (dto.officialEmail && dto.officialEmail !== existing.officialEmail) {
      await this.validateNoDuplicateEmail(companyId, dto.officialEmail, contactId);
    }
    if (dto.mobileNumber && dto.mobileNumber !== existing.mobileNumber) {
      await this.validateNoDuplicateMobile(companyId, dto.mobileNumber, contactId);
    }
    if (dto.isPrimary && !existing.isPrimary) {
      await this.clearPrimaryForType(companyId, dto.contactType || existing.contactType);
    }

    const updateData: any = { updatedBy: userId };
    if (dto.contactType !== undefined) updateData.contactType = dto.contactType;
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.designation !== undefined) updateData.designation = dto.designation;
    if (dto.officialEmail !== undefined) updateData.officialEmail = dto.officialEmail.toLowerCase().trim();
    if (dto.mobileNumber !== undefined) updateData.mobileNumber = dto.mobileNumber.trim();
    if (dto.alternateMobile !== undefined) updateData.alternateMobile = dto.alternateMobile;
    if (dto.officePhone !== undefined) updateData.officePhone = dto.officePhone;
    if (dto.alternateEmail !== undefined) updateData.alternateEmail = dto.alternateEmail?.toLowerCase().trim();
    if (dto.region !== undefined) updateData.region = dto.region;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.siteId !== undefined) updateData.siteId = dto.siteId;
    if (dto.department !== undefined) updateData.department = dto.department;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.isPrimary !== undefined) updateData.isPrimary = dto.isPrimary;
    if (dto.validFrom !== undefined) updateData.validFrom = dto.validFrom ? new Date(dto.validFrom) : null;
    if (dto.validTo !== undefined) updateData.validTo = dto.validTo ? new Date(dto.validTo) : null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.prisma.companyContact.update({
      where: { id: contactId },
      data: updateData,
      include: { site: true, siteLinks: { include: { site: true } } },
    });

    if (dto.siteIds !== undefined) {
      await this.prisma.companyContactSiteLink.deleteMany({ where: { contactId } });
      if (dto.siteIds.length > 0) {
        await this.prisma.companyContactSiteLink.createMany({
          data: dto.siteIds.map((siteId) => ({ contactId, siteId, isPrimary: false })),
        });
      }
    }

    await this.audit.log({
      userId,
      action: 'CONTACT_UPDATED',
      entity: 'CompanyContact',
      entityId: contactId,
      companyId,
      oldValue: { status: existing.status },
      newValue: { status: updated.status },
    });

    return this.findById(companyId, contactId);
  }

  async deactivate(companyId: string, contactId: string, userId: string) {
    const contact = await this.findById(companyId, contactId);
    if (contact.status === 'INACTIVE') {
      throw new BadRequestException('Contact is already inactive');
    }

    const updated = await this.prisma.companyContact.update({
      where: { id: contactId },
      data: { status: 'INACTIVE', updatedBy: userId },
    });

    await this.audit.log({
      userId,
      action: 'CONTACT_DEACTIVATED',
      entity: 'CompanyContact',
      entityId: contactId,
      companyId,
      oldValue: { status: 'ACTIVE' },
      newValue: { status: 'INACTIVE' },
    });

    return updated;
  }

  async reactivate(companyId: string, contactId: string, userId: string) {
    const contact = await this.findById(companyId, contactId);
    if (contact.status === 'ACTIVE') {
      throw new BadRequestException('Contact is already active');
    }

    const updated = await this.prisma.companyContact.update({
      where: { id: contactId },
      data: { status: 'ACTIVE', updatedBy: userId },
    });

    await this.audit.log({
      userId,
      action: 'CONTACT_REACTIVATED',
      entity: 'CompanyContact',
      entityId: contactId,
      companyId,
      oldValue: { status: 'INACTIVE' },
      newValue: { status: 'ACTIVE' },
    });

    return updated;
  }

  async import(companyId: string, dto: ImportContactsDto, userId: string) {
    const results = { created: 0, updated: 0, duplicates: 0, errors: [] as any[] };

    for (const contactDto of dto.contacts) {
      try {
        const existing = await this.findExistingContact(companyId, contactDto.officialEmail, contactDto.mobileNumber);
        if (existing) {
          results.duplicates++;
          continue;
        }
        await this.create(companyId, contactDto, userId);
        results.created++;
      } catch (error: any) {
        results.errors.push({ email: contactDto.officialEmail, error: error.message });
      }
    }

    await this.audit.log({
      userId,
      action: 'CONTACTS_IMPORTED',
      entity: 'CompanyContact',
      companyId,
      newValue: results,
    });

    return results;
  }

  async getDirectoryStats(companyId: string) {
    const [total, active, inactive, byType] = await Promise.all([
      this.prisma.companyContact.count({ where: { companyId } }),
      this.prisma.companyContact.count({ where: { companyId, status: 'ACTIVE' } }),
      this.prisma.companyContact.count({ where: { companyId, status: 'INACTIVE' } }),
      this.prisma.companyContact.groupBy({
        by: ['contactType'],
        where: { companyId },
        _count: { id: true },
      }),
    ]);

    return {
      total,
      active,
      inactive,
      byType: byType.map((t) => ({ type: t.contactType, count: t._count.id })),
    };
  }

  private async validateCompanyExists(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');
  }

  private async validateNoDuplicateEmail(companyId: string, email: string, excludeId?: string) {
    const normalized = email.toLowerCase().trim();
    const existing = await this.prisma.companyContact.findFirst({
      where: {
        companyId,
        officialEmail: normalized,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONTACT_ALREADY_EXISTS',
        message: `A contact with email ${email} already exists for this company.`,
      });
    }
  }

  private async validateNoDuplicateMobile(companyId: string, mobile: string, excludeId?: string) {
    const normalized = mobile.trim();
    const existing = await this.prisma.companyContact.findFirst({
      where: {
        companyId,
        mobileNumber: normalized,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONTACT_ALREADY_EXISTS',
        message: `A contact with mobile ${mobile} already exists for this company.`,
      });
    }
  }

  private async clearPrimaryForType(companyId: string, contactType: string) {
    await this.prisma.companyContact.updateMany({
      where: { companyId, contactType, isPrimary: true } as any,
      data: { isPrimary: false },
    });
  }

  private async findExistingContact(companyId: string, email: string, mobile: string) {
    return this.prisma.companyContact.findFirst({
      where: {
        companyId,
        OR: [
          { officialEmail: email.toLowerCase().trim() },
          { mobileNumber: mobile.trim() },
        ],
      },
    });
  }
}
