import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import {
  Driver,
  Passenger,
  PassengerSource,
  Tenant,
  Trip,
  TripGroup,
  TripPersonnel,
  TripStatus,
  User,
  UserRole,
  Vehicle,
} from '../../database/entities';
import { v4 as uuid } from 'uuid';

const DEMO_TENANT_TAX_NUMBER = '9999999999';
const DEMO_ADMIN_EMAIL = 'demo@prouetds.com';
const DEMO_ADMIN_PASSWORD = 'Demo123!';
const DEMO_SETTINGS = {
  isDemo: true,
  readOnlyHint: true,
  seededAt: '2026-04-19',
};

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(TripGroup) private groupRepo: Repository<TripGroup>,
    @InjectRepository(TripPersonnel) private personnelRepo: Repository<TripPersonnel>,
    @InjectRepository(Passenger) private passengerRepo: Repository<Passenger>,
  ) {}

  private buildDemoVehicles(tenantId: string) {
    return [
      {
        tenantId,
        plateNumber: '34PRO001',
        brand: 'Mercedes-Benz',
        model: 'Sprinter VIP',
        seatCapacity: 16,
        inspectionExpiry: '2026-11-12',
        isActive: true,
      },
      {
        tenantId,
        plateNumber: '34PRO002',
        brand: 'Volkswagen',
        model: 'Crafter Premium',
        seatCapacity: 19,
        inspectionExpiry: '2026-09-20',
        isActive: true,
      },
      {
        tenantId,
        plateNumber: '34PRO003',
        brand: 'Mercedes-Benz',
        model: 'Vito Tourer',
        seatCapacity: 8,
        inspectionExpiry: '2026-08-05',
        isActive: true,
      },
    ];
  }

  private buildDemoDrivers(tenantId: string) {
    return [
      {
        tenantId,
        firstName: 'Ahmet',
        lastName: 'Demir',
        tcKimlikNo: '10000000001',
        phone: '05321234567',
        nationalityCode: 'TR',
        gender: 'E',
        srcCertificate: 'SRC2',
        address: 'Başakşehir / İstanbul',
        isActive: true,
      },
      {
        tenantId,
        firstName: 'Mehmet',
        lastName: 'Kara',
        tcKimlikNo: '10000000002',
        phone: '05329876543',
        nationalityCode: 'TR',
        gender: 'E',
        srcCertificate: 'SRC2',
        address: 'Pendik / İstanbul',
        isActive: true,
      },
      {
        tenantId,
        firstName: 'Zeynep',
        lastName: 'Yılmaz',
        tcKimlikNo: '10000000003',
        phone: '05324567890',
        nationalityCode: 'TR',
        gender: 'K',
        srcCertificate: 'SRC2',
        address: 'Kadıköy / İstanbul',
        isActive: true,
      },
    ];
  }

  private buildDemoTrips(tenantId: string, createdById: string, vehicles: Vehicle[]) {
    return [
      {
        tenantId,
        createdById,
        firmTripNumber: 'DMO-2026-001',
        vehiclePlate: vehicles[0].plateNumber,
        vehicleId: vehicles[0].id,
        departureDate: '2026-04-19',
        departureTime: '09:30',
        endDate: '2026-04-19',
        endTime: '11:15',
        description: 'İstanbul Havalimanı karşılama transferi',
        vehiclePhone: '05321234567',
        originIlCode: 34,
        originIlceCode: 2048,
        destIlCode: 34,
        destIlceCode: 1835,
        originPlace: 'İstanbul Havalimanı Dış Hatlar',
        destPlace: 'Sabiha Gökçen Havalimanı İç Hatlar',
        status: TripStatus.SENT,
        uetdsSeferRefNo: 20260419001,
        uetdsSentAt: new Date('2026-04-19T09:40:00.000Z'),
      },
      {
        tenantId,
        createdById,
        firmTripNumber: 'DMO-2026-002',
        vehiclePlate: vehicles[1].plateNumber,
        vehicleId: vehicles[1].id,
        departureDate: '2026-04-20',
        departureTime: '13:00',
        endDate: '2026-04-20',
        endTime: '15:30',
        description: 'Kongre merkezi shuttle operasyonu',
        vehiclePhone: '05329876543',
        originIlCode: 34,
        originIlceCode: 1231,
        destIlCode: 34,
        destIlceCode: 966,
        originPlace: 'Tüyap Fuar ve Kongre Merkezi',
        destPlace: 'Beşiktaş İskele Bölgesi',
        status: TripStatus.READY,
      },
      {
        tenantId,
        createdById,
        firmTripNumber: 'DMO-2026-003',
        vehiclePlate: vehicles[2].plateNumber,
        vehicleId: vehicles[2].id,
        departureDate: '2026-04-21',
        departureTime: '18:45',
        endDate: '2026-04-21',
        endTime: '20:00',
        description: 'Otel çıkışlı şehir içi transfer',
        vehiclePhone: '05324567890',
        originIlCode: 34,
        originIlceCode: 1604,
        destIlCode: 34,
        destIlceCode: 1183,
        originPlace: 'Şişli Oteller Bölgesi',
        destPlace: 'Kadıköy Rıhtım',
        status: TripStatus.DRAFT,
      },
    ];
  }

  private buildDemoGroupData(trip: Trip) {
    return {
      tripId: trip.id,
      tenantId: trip.tenantId,
      groupName: 'Kurumsal Misafirler',
      groupDescription: trip.description || 'Demo grup',
      originCountryCode: 'TR',
      originIlCode: trip.originIlCode,
      originIlceCode: trip.originIlceCode,
      originPlace: trip.originPlace,
      destCountryCode: 'TR',
      destIlCode: trip.destIlCode,
      destIlceCode: trip.destIlceCode,
      destPlace: trip.destPlace,
      groupFee: 18500,
      uetdsGrupRefNo: trip.status === TripStatus.SENT ? 880000 + Number(trip.firmTripNumber?.slice(-1) || 1) : null,
      status: 'active',
    };
  }

  private buildDemoPersonnel(trip: Trip, drivers: Driver[]) {
    const [primaryDriver, secondaryDriver] = drivers;
    return [
      {
        tripId: trip.id,
        tenantId: trip.tenantId,
        driverId: primaryDriver.id,
        personnelType: 0,
        tcPassportNo: primaryDriver.tcKimlikNo,
        nationalityCode: primaryDriver.nationalityCode,
        firstName: primaryDriver.firstName,
        lastName: primaryDriver.lastName,
        gender: primaryDriver.gender,
        phone: primaryDriver.phone,
        address: primaryDriver.address,
        status: 'active',
      },
      {
        tripId: trip.id,
        tenantId: trip.tenantId,
        driverId: secondaryDriver.id,
        personnelType: 5,
        tcPassportNo: secondaryDriver.tcKimlikNo,
        nationalityCode: secondaryDriver.nationalityCode,
        firstName: secondaryDriver.firstName,
        lastName: secondaryDriver.lastName,
        gender: secondaryDriver.gender,
        phone: secondaryDriver.phone,
        address: secondaryDriver.address,
        status: 'active',
      },
    ];
  }

  private buildDemoPassengers(group: TripGroup) {
    const suffix = group.tripId.slice(0, 4).toUpperCase();
    return [
      {
        tripGroupId: group.id,
        tenantId: group.tenantId,
        firstName: 'Selin',
        lastName: 'Arslan',
        tcPassportNo: `P${suffix}01`,
        nationalityCode: 'TR',
        gender: 'K',
        phone: '05331230001',
        seatNumber: '1A',
        status: 'active',
        source: PassengerSource.MANUAL,
      },
      {
        tripGroupId: group.id,
        tenantId: group.tenantId,
        firstName: 'Can',
        lastName: 'Öztürk',
        tcPassportNo: `P${suffix}02`,
        nationalityCode: 'TR',
        gender: 'E',
        phone: '05331230002',
        seatNumber: '1B',
        status: 'active',
        source: PassengerSource.EXCEL,
      },
      {
        tripGroupId: group.id,
        tenantId: group.tenantId,
        firstName: 'Elif',
        lastName: 'Koç',
        tcPassportNo: `P${suffix}03`,
        nationalityCode: 'TR',
        gender: 'K',
        phone: '05331230003',
        seatNumber: '2A',
        status: 'active',
        source: PassengerSource.TEXT_PARSER,
      },
    ];
  }

  private async seedDemoTenantData(tenant: Tenant, adminUser: User) {
    const vehicles = await this.vehicleRepo.save(
      this.vehicleRepo.create(this.buildDemoVehicles(tenant.id)),
    );
    const drivers = await this.driverRepo.save(
      this.driverRepo.create(this.buildDemoDrivers(tenant.id)),
    );
    const trips = await this.tripRepo.save(
      this.tripRepo.create(this.buildDemoTrips(tenant.id, adminUser.id, vehicles)),
    );

    for (const trip of trips) {
      const group = await this.groupRepo.save(
        this.groupRepo.create(this.buildDemoGroupData(trip)),
      );

      await this.personnelRepo.save(
        this.personnelRepo.create(this.buildDemoPersonnel(trip, drivers)),
      );

      await this.passengerRepo.save(
        this.passengerRepo.create(this.buildDemoPassengers(group)),
      );
    }
  }

  async ensureDemoTenant() {
    const existingTenant = await this.tenantRepo.findOne({
      where: { taxNumber: DEMO_TENANT_TAX_NUMBER },
    });

    if (existingTenant) {
      let existingUser = await this.userRepo.findOne({
        where: { tenantId: existingTenant.id, email: DEMO_ADMIN_EMAIL },
      });

      if (!existingUser) {
        existingUser = await this.userRepo.save(
          this.userRepo.create({
            email: DEMO_ADMIN_EMAIL,
            passwordHash: await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12),
            firstName: 'Demo',
            lastName: 'Yönetici',
            role: UserRole.COMPANY_ADMIN,
            tenantId: existingTenant.id,
            isActive: true,
          }),
        );
      } else {
        existingUser.passwordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12);
        existingUser.isActive = true;
        await this.userRepo.save(existingUser);
      }

      const [vehicleCount, driverCount, tripCount] = await Promise.all([
        this.vehicleRepo.count({ where: { tenantId: existingTenant.id } }),
        this.driverRepo.count({ where: { tenantId: existingTenant.id } }),
        this.tripRepo.count({ where: { tenantId: existingTenant.id } }),
      ]);

      if (vehicleCount === 0 && driverCount === 0 && tripCount === 0) {
        await this.seedDemoTenantData(existingTenant, existingUser);
      }

      return {
        tenant: existingTenant,
        credentials: {
          email: DEMO_ADMIN_EMAIL,
          password: DEMO_ADMIN_PASSWORD,
        },
        alreadyExists: true,
        userId: existingUser.id,
      };
    }

    const tenant = this.tenantRepo.create({
      companyName: 'ProUETDS Demo Turizm',
      taxNumber: DEMO_TENANT_TAX_NUMBER,
      contactEmail: DEMO_ADMIN_EMAIL,
      contactPhone: '+90 554 581 20 34',
      address: 'Başakşehir / İstanbul',
      isActive: true,
      subscriptionPlan: 'demo',
      settings: {
        ...DEMO_SETTINGS,
        crmApiKey: uuid().replace(/-/g, ''),
      },
    });
    const savedTenant = await this.tenantRepo.save(tenant);

    const adminUser = await this.userRepo.save(
      this.userRepo.create({
        email: DEMO_ADMIN_EMAIL,
        passwordHash: await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12),
        firstName: 'Demo',
        lastName: 'Yönetici',
        role: UserRole.COMPANY_ADMIN,
        tenantId: savedTenant.id,
        isActive: true,
      }),
    );

    await this.seedDemoTenantData(savedTenant, adminUser);

    return {
      tenant: savedTenant,
      credentials: {
        email: DEMO_ADMIN_EMAIL,
        password: DEMO_ADMIN_PASSWORD,
      },
      alreadyExists: false,
      userId: adminUser.id,
    };
  }

  async findAll(query: any = {}) {
    const qb = this.tenantRepo
      .createQueryBuilder('t')
      .orderBy('t.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere('t.companyName ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('t.isActive = :isActive', { isActive: query.isActive });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [tenants, total] = await qb.getManyAndCount();
    return { tenants, total, page, limit };
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Firma bulunamadı');
    return tenant;
  }

  async create(data: Partial<Tenant> & { adminEmail?: string; adminPassword?: string }) {
    const existing = await this.tenantRepo.findOne({
      where: { taxNumber: data.taxNumber },
    });
    if (existing && data.taxNumber) {
      throw new ConflictException('Bu vergi numarası zaten kayıtlı');
    }

    // Generate CRM API key
    const crmApiKey = uuid().replace(/-/g, '');

    const tenant = this.tenantRepo.create({
      ...data,
      settings: { crmApiKey, ...data.settings },
    });
    const savedTenant = await this.tenantRepo.save(tenant);

    // Create admin user for the tenant
    if (data.adminEmail && data.adminPassword) {
      const adminUser = this.userRepo.create({
        email: data.adminEmail,
        passwordHash: await bcrypt.hash(data.adminPassword, 12),
        firstName: data.adminFirstName || 'Admin',
        lastName: data.adminLastName || data.companyName || 'Admin',
        role: UserRole.COMPANY_ADMIN,
        tenantId: savedTenant.id,
      });
      await this.userRepo.save(adminUser);
    }

    return savedTenant;
  }

  async update(id: string, data: Partial<Tenant>) {
    const tenant = await this.findOne(id);
    
    // Safely merge settings if provided
    if (data.settings) {
      data.settings = { ...tenant.settings, ...data.settings };
    }
    
    Object.assign(tenant, data);
    return this.tenantRepo.save(tenant);
  }

  async toggleActive(id: string) {
    const tenant = await this.findOne(id);
    tenant.isActive = !tenant.isActive;
    return this.tenantRepo.save(tenant);
  }
}
