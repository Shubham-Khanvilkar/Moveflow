import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from '../modules/auth/strategies/jwt.strategy';
import { PrismaService } from './prisma.service';

@WebSocketGateway({ cors: { origin: process.env.CORS_ORIGIN?.split(',').map(o => o.trim()) || ['http://localhost:3000'] } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(EventsGateway.name);
  private clientCompanyMap = new Map<string, string>();
  private clientUserMap = new Map<string, string>();
  private clientReady = new Set<string>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private jwtService: JwtService,
    private jwtStrategy: JwtStrategy,
  ) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      if (!token) {
        this.logger.warn(`Client connected without token: ${client.id}`);
        client.disconnect();
        return;
      }

      this.verifyToken(String(token)).then((user) => {
        if (user) {
          client.join(`company:${user.companyId}`);
           this.clientCompanyMap.set(client.id, user.companyId);
           this.clientUserMap.set(client.id, user.sub);
           this.clientReady.add(client.id);
          this.logger.log(`Client connected: ${client.id} (company: ${user.companyId})`);
        } else {
          this.logger.warn(`Client connection rejected: ${client.id}`);
          client.disconnect();
        }
      }).catch((err) => {
        this.logger.warn(`Client connection rejected: ${client.id} - ${err.message}`);
        client.disconnect();
      });
    } catch (err) {
      this.logger.warn(`Client connection rejected: ${client.id}`);
      client.disconnect();
    }
  }

  private async verifyToken(token: string): Promise<any> {
    const payload = this.jwtService.verify(token);
    return this.jwtStrategy.validate(payload);
  }

  handleDisconnect(client: Socket) {
    this.clientCompanyMap.delete(client.id);
    this.clientUserMap.delete(client.id);
    this.clientReady.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-trip')
  async handleSubscribeTrip(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string }) {
    const companyId = this.clientCompanyMap.get(client.id);
    const userId = this.clientUserMap.get(client.id);
    if (!this.clientReady.has(client.id) || !companyId || !userId || !data?.tripId) {
      return { event: 'error', data: { message: 'Socket authentication is not ready' } };
    }
    const trip = await this.prisma.trip.findFirst({
      where: { id: data.tripId, companyId },
      select: { id: true, driverId: true, companyId: true },
    });
    if (!trip) return { event: 'error', data: { message: 'Trip not found in your company' } };
    client.join(`trip:${data.tripId}`);
    return { event: 'subscribed', data: { tripId: data.tripId } };
  }

  @SubscribeMessage('unsubscribe-trip')
  handleUnsubscribeTrip(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string }) {
    client.leave(`trip:${data.tripId}`);
    return { event: 'unsubscribed', data: { tripId: data.tripId } };
  }

  @SubscribeMessage('driver-location-update')
  async handleDriverLocation(@ConnectedSocket() client: Socket, @MessageBody() data: { tripId: string; latitude: number; longitude: number; speed?: number; heading?: number }) {
    const companyId = this.clientCompanyMap.get(client.id);
    const userId = this.clientUserMap.get(client.id);
    if (!this.clientReady.has(client.id) || !companyId || !userId) return { event: 'error', data: { message: 'Socket authentication is not ready' } };
    const trip = await this.prisma.trip.findFirst({ where: { id: data.tripId, companyId }, select: { driverId: true } });
    if (!trip || trip.driverId !== userId) return { event: 'error', data: { message: 'Only the assigned driver can publish location' } };
    if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude) || data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180) {
      return { event: 'error', data: { message: 'Invalid coordinates' } };
    }
    await this.broadcastToTrip(data.tripId, 'driver-location', {
      tripId: data.tripId,
      latitude: data.latitude,
      longitude: data.longitude,
      speed: data.speed,
      heading: data.heading,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('subscribe-live-status')
  handleSubscribeLiveStatus(@ConnectedSocket() client: Socket) {
    const companyId = this.clientCompanyMap.get(client.id);
    if (!this.clientReady.has(client.id) || !companyId) return { event: 'error', data: { message: 'Socket authentication is not ready' } };
    client.join(`live-status:${companyId}`);
    return { event: 'subscribed', data: { channel: `live-status:${companyId}` } };
  }

  @SubscribeMessage('unsubscribe-live-status')
  handleUnsubscribeLiveStatus(@ConnectedSocket() client: Socket) {
    const companyId = this.clientCompanyMap.get(client.id);
    if (companyId) client.leave(`live-status:${companyId}`);
    return { event: 'unsubscribed', data: { channel: 'live-status' } };
  }

  broadcastToCompany(companyId: string, event: string, data: any) {
    this.server.to(`company:${companyId}`).emit(event, data);
  }

  async broadcastToTrip(tripId: string, event: string, data: any) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { companyId: true } });
    if (!trip) return;
    this.server.to(`company:${trip.companyId}`).to(`trip:${tripId}`).emit(event, data);
  }

  broadcastToUser(userId: string, event: string, data: any) {
    for (const [clientId, uid] of this.clientUserMap.entries()) {
      if (uid === userId) {
        this.server.to(clientId).emit(event, data);
      }
    }
  }

  broadcastToDriver(driverId: string, event: string, data: any) {
    this.broadcastToUser(driverId, event, data);
  }

  broadcastLiveStatus(event: string, data: any) {
    if (data?.companyId) this.server.to(`live-status:${data.companyId}`).emit(event, data);
  }

  async broadcastTripStatus(tripId: string, status: string, data: any) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { companyId: true } });
    if (trip) this.server.to(`live-status:${trip.companyId}`).emit('trip-status-change', { tripId, status, ...data, timestamp: new Date().toISOString() });
  }

  async broadcastDriverStatus(driverId: string, status: string, data: any) {
    const driver = await this.prisma.driverProfile.findUnique({ where: { id: driverId }, select: { companyId: true } });
    if (driver) this.server.to(`live-status:${driver.companyId}`).emit('driver-status-change', { driverId, status, ...data, timestamp: new Date().toISOString() });
  }

  async broadcastVehicleStatus(vehicleId: string, status: string, data: any) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { companyId: true } });
    if (vehicle) this.server.to(`live-status:${vehicle.companyId}`).emit('vehicle-status-change', { vehicleId, status, ...data, timestamp: new Date().toISOString() });
  }

  async broadcastArrivalUpdate(tripId: string, data: any) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, select: { companyId: true } });
    if (trip) this.server.to(`live-status:${trip.companyId}`).emit('arrival-update', { tripId, ...data, timestamp: new Date().toISOString() });
  }
}
