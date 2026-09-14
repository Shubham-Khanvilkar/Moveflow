import { Controller, Post, Body, HttpCode, HttpStatus, HttpException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import * as bcrypt from 'bcryptjs';

@Controller('auth')
export class SignupController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Post('signup')
  @Throttle(3, 300)
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: {
    companyName: string;
    companyCode?: string;
    adminEmail: string;
    adminName: string;
    password: string;
    phone?: string;
  }) {
    // Validation
    if (!dto.companyName || !dto.adminEmail || !dto.adminName || !dto.password) {
      throw new HttpException({ statusCode: 400, message: 'companyName, adminEmail, adminName, and password are required' }, 400);
    }
    if (dto.password.length < 8) {
      throw new HttpException({ statusCode: 400, message: 'Password must be at least 8 characters' }, 400);
    }

    // Check email not already used
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
    if (existingUser) {
      throw new HttpException({ statusCode: 409, message: 'A user with this email already exists' }, 409);
    }

    // Generate company code if not provided
    const companyCode = dto.companyCode || dto.companyName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);

    // Check company code unique
    const existingCompany = await this.prisma.company.findUnique({ where: { code: companyCode } });
    if (existingCompany) {
      throw new HttpException({ statusCode: 409, message: 'Company code already exists' }, 409);
    }

    // Create company
    const company = await this.prisma.company.create({
      data: {
        name: dto.companyName,
        code: companyCode,
        slug: companyCode.toLowerCase(),
        contactEmail: dto.adminEmail,
        status: 'ACTIVE',
        country: 'India',
      },
    });

    // Create admin user
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const adminUser = await this.prisma.user.create({
      data: {
        email: dto.adminEmail,
        name: dto.adminName,
        phone: dto.phone,
        companyId: company.id,
        passwordHash,
        status: 'ACTIVE',
        passwordChangedAt: new Date(),
      },
    });

    // Create company membership
    await this.prisma.companyMembership.create({
      data: { userId: adminUser.id, companyId: company.id, role: 'COMPANY_ADMIN', status: 'ACTIVE' },
    });

    // Auto-create 14-day trial subscription
    try {
      const plan = await this.prisma.subscriptionPlan.findFirst({ where: { name: 'STARTER', isActive: true } })
        || await this.prisma.subscriptionPlan.findFirst({ where: { isActive: true }, orderBy: { monthlyPrice: 'asc' } });
      if (plan) {
        const trialEnds = new Date();
        trialEnds.setDate(trialEnds.getDate() + 14);
        await (this.prisma as any).subscription.create({
          data: {
            companyId: company.id, planId: plan.id, status: 'TRIAL',
            billingCycle: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: trialEnds, trialEndsAt: trialEnds,
          },
        });
      }
    } catch (e: any) { /* subscription plan may not exist */ }

    // Audit log
    await this.audit.log({
      companyId: company.id,
      userId: adminUser.id,
      action: 'COMPANY_SELF_SIGNUP',
      entity: 'Company',
      entityId: company.id,
      newValue: { companyName: dto.companyName, adminEmail: dto.adminEmail },
    });

    return {
      success: true,
      message: 'Company created successfully. Your 14-day trial has started.',
      data: {
        company: { id: company.id, name: company.name, code: company.code },
        admin: { id: adminUser.id, email: adminUser.email, name: adminUser.name },
        trial: { days: 14, plan: 'STARTER' },
      },
    };
  }
}
