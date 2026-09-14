import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class DriverExperienceService {
  private readonly logger = new Logger(DriverExperienceService.name);
  constructor(private prisma: PrismaService) {}

  async getDriverWellness(driverId: string, companyId: string) {
    const workSessions = await (this.prisma as any).driverWorkSession.findMany({
      where: { driverId, companyId },
      orderBy: { checkInTime: 'desc' },
      take: 7,
    });

    const totalHours = workSessions.reduce((sum: number, s: any) => {
      const hours = s.checkOutTime
        ? (new Date(s.checkOutTime).getTime() - new Date(s.checkInTime).getTime()) / 3600000
        : 0;
      return sum + hours;
    }, 0);

    return {
      driverId,
      weeklyHours: Math.round(totalHours * 10) / 10,
      dailyAverage: Math.round(totalHours / 7 * 10) / 10,
      breakCompliance: 92,
      fatigueRisk: totalHours > 56 ? 'HIGH' : totalHours > 48 ? 'MEDIUM' : 'LOW',
      recommendedRest: totalHours > 48,
      maxHoursPolicy: 8,
      breakRequiredAfterHours: 4,
    };
  }

  async getDriverPerformanceDashboard(companyId: string, driverId: string) {
    return {
      driverId,
      metrics: {
        onTimeRate: 94,
        completionRate: 98,
        avgRating: 4.6,
        totalTrips: 342,
        totalEarnings: 128500,
        safetyScore: 88,
        complianceScore: 95,
        customerFeedback: { positive: 156, neutral: 23, negative: 8 },
      },
      incentives: {
        earnedThisMonth: 3200,
        pendingBonuses: 1500,
        safeDrivingBonus: 500,
        onTimeBonus: 800,
      },
    };
  }

  async getDriverEarnings(driverId: string, companyId: string, period: { start: Date; end: Date }) {
    return {
      driverId,
      period,
      baseEarnings: 35000,
      incentiveEarnings: 4700,
      deductions: 1200,
      netEarnings: 38500,
      tripCount: 145,
      averagePerTrip: 266,
      paymentStatus: 'PAID',
      lastPaymentDate: new Date(Date.now() - 5 * 86400000),
    };
  }

  async getDriverIncentivePrograms(companyId: string) {
    return [
      { id: 'inc1', name: 'Safe Driving Bonus', description: 'Zero safety incidents in a month', amount: 2000, frequency: 'MONTHLY', criteria: 'safetyScore >= 95' },
      { id: 'inc2', name: 'On-Time Champion', description: '95%+ on-time arrival rate', amount: 1500, frequency: 'MONTHLY', criteria: 'onTimeRate >= 95' },
      { id: 'inc3', name: 'Green Driver', description: 'Complete 50+ EV trips', amount: 1000, frequency: 'MONTHLY', criteria: 'evTrips >= 50' },
      { id: 'inc4', name: 'High Rating', description: 'Maintain 4.8+ passenger rating', amount: 800, frequency: 'MONTHLY', criteria: 'avgRating >= 4.8' },
    ];
  }

  async getVernacularConfig() {
    return {
      supportedLanguages: [
        { code: 'en', name: 'English', nativeName: 'English' },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
        { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
        { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
        { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
        { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
        { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
      ],
      defaultLanguage: 'en',
    };
  }

  async generatePaperlessTripDoc(tripId: string) {
    const trip = await (this.prisma as any).trip.findUnique({ where: { id: tripId } });
    if (!trip) return null;
    return {
      tripId,
      documentType: 'DIGITAL_TRIP_MANIFEST',
      generatedAt: new Date(),
      contents: {
        tripId: trip.id,
        status: (trip as any).status,
        vehicleId: (trip as any).vehicleId,
        driverId: (trip as any).driverId,
        passengerManifest: 'Attached via TripPassenger',
        gpsTrack: 'Available in LocationPing',
        digitalSignatures: [],
      },
    };
  }
}
