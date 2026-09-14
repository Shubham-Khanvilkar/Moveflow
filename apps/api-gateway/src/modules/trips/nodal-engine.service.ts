import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class NodalEngineService {
  constructor(private prisma: PrismaService) {}

  async findNodalPoints(companyId: string, params: { siteId?: string; shiftId?: string }) {
    const employees = await this.prisma.user.findMany({
      where: {
        companyId, status: 'ACTIVE',
        homeLatitude: { not: null },
        homeLongitude: { not: null },
        ...(params.siteId ? { orgAssignments: { some: { siteId: params.siteId } } } : {}),
        ...(params.shiftId ? { shiftId: params.shiftId } : {}),
      },
      select: { id: true, homeLatitude: true, homeLongitude: true, homeAddress: true },
    });

    if (employees.length === 0) return { clusters: [], recommendations: [] };

    const clusters = this.clusterEmployees(employees);
    const recommendations = clusters.map((c, i) => ({
      id: `NODAL-${i + 1}`,
      lat: c.avgLat,
      lng: c.avgLng,
      employeeCount: c.count,
      suggestedName: `Nodal Point ${i + 1} (${c.count} employees)`,
      address: c.addresses[0] || '',
      confidence: Math.min(c.count / 5, 1),
    }));

    return { clusters, recommendations, totalEmployees: employees.length };
  }

  private clusterEmployees(employees: any[]) {
    const threshold = 0.02;
    const clusters: { avgLat: number; avgLng: number; count: number; addresses: string[] }[] = [];

    for (const emp of employees) {
      if (emp.homeLatitude == null || emp.homeLongitude == null) continue;
      const lat = emp.homeLatitude;
      const lng = emp.homeLongitude;

      let merged = false;
      for (const cluster of clusters) {
        if (Math.abs(cluster.avgLat - lat) < threshold && Math.abs(cluster.avgLng - lng) < threshold) {
          const total = cluster.count + 1;
          cluster.avgLat = (cluster.avgLat * cluster.count + lat) / total;
          cluster.avgLng = (cluster.avgLng * cluster.count + lng) / total;
          cluster.count = total;
          if (emp.homeAddress) cluster.addresses.push(emp.homeAddress);
          merged = true;
          break;
        }
      }
      if (!merged) {
        clusters.push({
          avgLat: lat, avgLng: lng, count: 1,
          addresses: emp.homeAddress ? [emp.homeAddress] : [],
        });
      }
    }

    return clusters.filter(c => c.count >= 3).sort((a, b) => b.count - a.count);
  }

  async optimizeNodalPoints(companyId: string) {
    const current = await this.prisma.nodalPoint.findMany({
      where: { companyId, isActive: true } as any,
    });
    const result = await this.findNodalPoints(companyId, {});
    return {
      currentNodals: current.length,
      suggestedNodals: result.recommendations.length,
      recommendations: result.recommendations,
    };
  }

  async createNodalPoint(companyId: string, data: { name: string; latitude: number; longitude: number; address?: string }) {
    return (this.prisma as any).nodalPoint.create({
      data: { companyId, ...data, isActive: true },
    });
  }

  async deactivateNodalPoint(companyId: string, nodalId: string) {
    return (this.prisma as any).nodalPoint.update({
      where: { id: nodalId },
      data: { isActive: false },
    });
  }
}
