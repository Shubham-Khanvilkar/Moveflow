import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';

@Injectable()
export class TripSharingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async addContact(companyId: string, userId: string, data: { name: string; phone: string; email?: string; relationship: string }) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const contact = await this.prisma.tripSharingContact.create({
      data: { companyId, userId, contactName: data.name, contactPhone: data.phone, contactEmail: data.email, relationship: data.relationship.toUpperCase() },
    });

    await this.audit.log({ companyId, userId, action: 'SHARING_CONTACT_ADDED', entity: 'TripSharingContact', entityId: contact.id, newValue: { name: data.name } });
    return contact;
  }

  async removeContact(companyId: string, userId: string, contactId: string) {
    if (!this.prisma.isConnected()) throw new ServiceUnavailableException('Database unavailable');

    const contact = await this.prisma.tripSharingContact.findFirst({ where: { id: contactId, companyId, userId } });
    if (!contact) throw new NotFoundException('Contact not found');

    await this.prisma.tripSharingContact.delete({ where: { id: contactId } });
    await this.audit.log({ companyId, userId, action: 'SHARING_CONTACT_REMOVED', entity: 'TripSharingContact', entityId: contactId });
    return { removed: true };
  }

  async getContacts(companyId: string, userId: string) {
    if (!this.prisma.isConnected()) return [];

    return this.prisma.tripSharingContact.findMany({
      where: { companyId, userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async shareTrip(tripId: string) {
    if (!this.prisma.isConnected()) return;

    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return;

    const passengers = await this.prisma.tripPassenger.findMany({ where: { tripId } });
    for (const passenger of passengers) {
      const contacts = await this.prisma.tripSharingContact.findMany({
        where: { userId: passenger.userId, isActive: true, shareTripStatus: true },
      });
      // In production: send notification to each contact
    }
  }
}
