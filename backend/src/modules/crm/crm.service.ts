import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, Trip, TripGroup, Passenger } from '../../database/entities';
import { TripsService } from '../trips/trips.service';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    private tripsService: TripsService,
  ) {}

  /** Validate API key and return tenant */
  async validateApiKey(apiKey: string): Promise<Tenant> {
    // API key is stored in tenant settings
    const tenant = await this.tenantRepo
      .createQueryBuilder('t')
      .where("t.settings->>'crmApiKey' = :apiKey", { apiKey })
      .andWhere('t.isActive = true')
      .getOne();

    if (!tenant) {
      throw new UnauthorizedException('Geçersiz API anahtarı');
    }
    return tenant;
  }

  /** Create trip via CRM */
  async createTrip(tenantId: string, data: any) {
    return this.tripsService.create(tenantId, null, {
      vehiclePlate: data.vehiclePlate,
      departureDate: data.departureDate,
      departureTime: data.departureTime,
      endDate: data.endDate,
      endTime: data.endTime,
      description: data.description || `CRM - ${data.crmReservationId}`,
      firmTripNumber: data.crmReservationId,
    });
  }

  /** Add passengers from CRM */
  async addPassengers(
    tripId: string,
    tenantId: string,
    groupId: string,
    passengers: any[],
  ) {
    return this.tripsService.addPassengersBulk(
      groupId,
      tenantId,
      passengers.map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        tcPassportNo: p.passportNo || p.tcNo,
        nationalityCode: p.nationality || 'TR',
        gender: p.gender,
        phone: p.phone,
        source: 'crm',
      })),
    );
  }

  /** Get trip status for CRM */
  async getTripStatus(tripId: string, tenantId: string) {
    const trip = await this.tripsService.findOne(tripId, tenantId);
    return {
      tripId: trip.id,
      status: trip.status,
      uetdsRefNo: trip.uetdsSeferRefNo,
      uetdsError: trip.uetdsErrorMessage,
      uetdsSentAt: trip.uetdsSentAt,
      passengerCount: trip.groups?.reduce(
        (sum, g) => sum + (g.passengers?.length || 0),
        0,
      ),
    };
  }

  /** Send trip to UETDS via CRM trigger */
  async sendToUetds(tripId: string, tenantId: string) {
    return this.tripsService.sendToUetds(tripId, tenantId);
  }
}
