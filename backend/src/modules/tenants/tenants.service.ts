import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
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
const DEMO_COMPANY_NAME =
  'ALYA KARDEŞLER TURİZM OTOMOTİV İNŞAAT İÇ VE DIŞ TİCARET LİMİTED ŞİRKETİ';
const DEMO_TRIP_NUMBER = 'DMO-2026-001';
const DEMO_TRIP_REF = 2604206112446680;
const DEMO_PDF_TEMPLATE_PATH =
  'src/modules/pdf/uetdsresmidokuman/demo-trip-template.pdf';

const DEMO_SETTINGS = {
  isDemo: true,
  readOnlyHint: true,
  seededAt: '2026-04-20',
  demoPdfTemplatePath: DEMO_PDF_TEMPLATE_PATH,
};

export const TENANT_PACKAGE_DEFINITIONS = {
  'A-10': { code: 'A-10', label: 'A-10 Paketi', maxVehicles: 10, maxUsers: 10 },
  'A-25': { code: 'A-25', label: 'A-25 Paketi', maxVehicles: 25, maxUsers: 25 },
  'A-50': { code: 'A-50', label: 'A-50 Paketi', maxVehicles: 50, maxUsers: 50 },
  'A-SINIRSIZ': {
    code: 'A-SINIRSIZ',
    label: 'A-Sınırsız Paketi',
    maxVehicles: null,
    maxUsers: null,
  },
} as const;

export type TenantPackageCode = keyof typeof TENANT_PACKAGE_DEFINITIONS;
export type TenantLimitTarget = 'vehicle' | 'user';

const DEFAULT_TENANT_PACKAGE: TenantPackageCode = 'A-10';

export type TenantCapacitySnapshot = {
  activeVehicleCount: number;
  activeUserCount: number;
  remainingVehicleSlots: number | null;
  remainingUserSlots: number | null;
  package: {
    code: TenantPackageCode;
    label: string;
    maxVehicles: number | null;
    maxUsers: number | null;
  };
};

export type TenantWithUsage = Tenant & {
  activeVehicleCount: number;
  activeUserCount: number;
  remainingVehicleSlots: number | null;
  remainingUserSlots: number | null;
  package: TenantCapacitySnapshot['package'];
};

type CreateTenantInput = Partial<Tenant> & {
  adminEmail?: string;
  adminPassword?: string;
  adminFirstName?: string;
  adminLastName?: string;
};

const normalizePlanString = (value?: string | null) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/İ/g, 'I')
    .replace(/Ş/g, 'S')
    .replace(/Ü/g, 'U')
    .replace(/Ğ/g, 'G')
    .replace(/Ö/g, 'O')
    .replace(/Ç/g, 'C');

export const normalizeTenantPackage = (value?: string | null): TenantPackageCode => {
  const normalized = normalizePlanString(value);

  if (
    !normalized ||
    normalized === 'BASIC' ||
    normalized === 'DEMO' ||
    normalized === 'REVIEW_PENDING' ||
    normalized === 'REVIEW PENDING' ||
    normalized === 'PENDING' ||
    normalized === 'INACTIVE'
  ) {
    return DEFAULT_TENANT_PACKAGE;
  }

  if (normalized === 'A-10') return 'A-10';
  if (normalized === 'A-25') return 'A-25';
  if (normalized === 'A-50') return 'A-50';
  if (normalized === 'A-SINIRSIZ' || normalized === 'A-SINIRSIZ PAKETI') {
    return 'A-SINIRSIZ';
  }

  return DEFAULT_TENANT_PACKAGE;
};

export const getTenantPackageDefinition = (plan?: string | null) => {
  const code = normalizeTenantPackage(plan);
  return TENANT_PACKAGE_DEFINITIONS[code];
};

const sanitizeTenantSettings = (settings?: Record<string, any> | null) => {
  if (!settings) return settings;

  const {
    packageLabel,
    packageMaxVehicles,
    packageMaxUsers,
    activeVehicleCount,
    activeUserCount,
    remainingVehicleSlots,
    remainingUserSlots,
    ...rest
  } = settings;

  return rest;
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase();
const normalizeText = (value?: string | null) => value?.trim() || null;
const normalizeName = (value?: string | null, fallback = '') => value?.trim() || fallback;
const toActiveFlag = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return undefined;
};

const mergeTenantSettings = (
  current?: Record<string, any> | null,
  next?: Record<string, any> | null,
) => ({
  ...(sanitizeTenantSettings(current) || {}),
  ...(sanitizeTenantSettings(next) || {}),
});

const calculateRemainingCapacity = (max: number | null, used: number) =>
  max === null ? null : Math.max(max - used, 0);

export const buildTenantCapacitySnapshot = (
  plan: string | null | undefined,
  activeVehicleCount: number,
  activeUserCount: number,
): TenantCapacitySnapshot => {
  const pkg = getTenantPackageDefinition(plan);

  return {
    activeVehicleCount,
    activeUserCount,
    remainingVehicleSlots: calculateRemainingCapacity(pkg.maxVehicles, activeVehicleCount),
    remainingUserSlots: calculateRemainingCapacity(pkg.maxUsers, activeUserCount),
    package: { ...pkg },
  };
};

export const assertTenantCapacity = (
  snapshot: TenantCapacitySnapshot,
  target: TenantLimitTarget,
) => {
  const max = target === 'vehicle' ? snapshot.package.maxVehicles : snapshot.package.maxUsers;
  const used =
    target === 'vehicle' ? snapshot.activeVehicleCount : snapshot.activeUserCount;
  const label = target === 'vehicle' ? 'araç' : 'kullanıcı';

  if (max !== null && used >= max) {
    throw new BadRequestException(
      `${snapshot.package.label} en fazla ${max} aktif ${label} destekliyor`,
    );
  }
};

const decorateTenantEntity = (
  tenant: Tenant,
  activeVehicleCount: number,
  activeUserCount: number,
): TenantWithUsage => {
  const snapshot = buildTenantCapacitySnapshot(
    tenant.subscriptionPlan,
    activeVehicleCount,
    activeUserCount,
  );

  return {
    ...tenant,
    subscriptionPlan: snapshot.package.code,
    settings: sanitizeTenantSettings(tenant.settings),
    activeVehicleCount: snapshot.activeVehicleCount,
    activeUserCount: snapshot.activeUserCount,
    remainingVehicleSlots: snapshot.remainingVehicleSlots,
    remainingUserSlots: snapshot.remainingUserSlots,
    package: snapshot.package,
  } as TenantWithUsage;
};

export const getTenantPackageSeedPlan = () => 'A-50' as TenantPackageCode;

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(TripGroup) private groupRepo: Repository<TripGroup>,
    @InjectRepository(TripPersonnel)
    private personnelRepo: Repository<TripPersonnel>,
    @InjectRepository(Passenger) private passengerRepo: Repository<Passenger>,
  ) {}

  private async getTenantCounts(tenantId: string) {
    const [activeVehicleCount, activeUserCount] = await Promise.all([
      this.vehicleRepo.count({ where: { tenantId, isActive: true } }),
      this.userRepo.count({ where: { tenantId, isActive: true } }),
    ]);

    return { activeVehicleCount, activeUserCount };
  }

  async getTenantCapacity(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Firma bulunamadı');

    const counts = await this.getTenantCounts(tenantId);
    return buildTenantCapacitySnapshot(
      tenant.subscriptionPlan,
      counts.activeVehicleCount,
      counts.activeUserCount,
    );
  }

  async assertTenantCanCreateUser(tenantId: string) {
    const snapshot = await this.getTenantCapacity(tenantId);
    assertTenantCapacity(snapshot, 'user');
    return snapshot;
  }

  async assertTenantCanCreateVehicle(tenantId: string) {
    const snapshot = await this.getTenantCapacity(tenantId);
    assertTenantCapacity(snapshot, 'vehicle');
    return snapshot;
  }

  async decorateTenant(tenant: Tenant) {
    const counts = await this.getTenantCounts(tenant.id);
    return decorateTenantEntity(tenant, counts.activeVehicleCount, counts.activeUserCount);
  }

  async decorateTenants(tenants: Tenant[]) {
    return Promise.all(tenants.map((tenant) => this.decorateTenant(tenant)));
  }

  private buildDemoVehicles(tenantId: string) {
    return [
      {
        tenantId,
        plateNumber: '34RD3388',
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
        firstName: 'Şehir',
        lastName: 'Alya',
        tcKimlikNo: '38700000772',
        phone: '05321234567',
        nationalityCode: 'TR',
        gender: 'E',
        srcCertificate: 'SRC2',
        address: 'Bağcılar / İstanbul',
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

  private buildDemoTrips(
    tenantId: string,
    createdById: string,
    vehicles: Vehicle[],
  ) {
    return [
      {
        tenantId,
        createdById,
        firmTripNumber: DEMO_TRIP_NUMBER,
        vehiclePlate: vehicles[0].plateNumber,
        vehicleId: vehicles[0].id,
        departureDate: '2026-04-20',
        departureTime: '10:00',
        endDate: '2026-04-20',
        endTime: '23:59',
        description: 'İstanbul içi transfer',
        vehiclePhone: '05321234567',
        originIlCode: 34,
        originIlceCode: 1135,
        destIlCode: 34,
        destIlceCode: 1835,
        originPlace: 'Bağcılar / İstanbul',
        destPlace: 'Sabiha Gökçen Havalimanı / İstanbul',
        status: TripStatus.SENT,
        uetdsSeferRefNo: DEMO_TRIP_REF,
        uetdsSentAt: new Date('2026-04-20T09:52:48.000Z'),
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
    const isSentDemoTrip = trip.firmTripNumber === DEMO_TRIP_NUMBER;

    return {
      tripId: trip.id,
      tenantId: trip.tenantId,
      groupName: isSentDemoTrip ? '1' : 'Kurumsal Misafirler',
      groupDescription: trip.description || 'Demo grup',
      originCountryCode: 'TR',
      originIlCode: trip.originIlCode,
      originIlceCode: trip.originIlceCode,
      originPlace: trip.originPlace,
      destCountryCode: 'TR',
      destIlCode: trip.destIlCode,
      destIlceCode: trip.destIlceCode,
      destPlace: trip.destPlace,
      groupFee: isSentDemoTrip ? 500 : 18500,
      uetdsGrupRefNo: isSentDemoTrip ? 1 : null,
      status: 'active',
    };
  }

  private buildDemoPersonnel(trip: Trip, drivers: Driver[]) {
    const [primaryDriver, secondaryDriver] = drivers;

    if (trip.firmTripNumber === DEMO_TRIP_NUMBER) {
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
      ];
    }

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
    if (group.groupName === '1') {
      return [
        {
          tripGroupId: group.id,
          tenantId: group.tenantId,
          firstName: 'Orhan',
          lastName: 'Güneş',
          tcPassportNo: '000000',
          nationalityCode: 'BILINMIYOR',
          gender: 'E',
          seatNumber: '1',
          status: 'active',
          source: PassengerSource.MANUAL,
          uetdsYolcuRefNo: 1,
        },
      ];
    }

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

  async refreshDemoTenantSnapshot(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant?.settings?.isDemo) return;

    const sentTrip = await this.tripRepo.findOne({
      where: { tenantId, firmTripNumber: DEMO_TRIP_NUMBER },
      relations: ['groups'],
    });

    const vehicles = await this.vehicleRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
    const drivers = await this.driverRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });

    if (!sentTrip || vehicles.length === 0 || drivers.length === 0) return;

    const [primaryVehicle] = vehicles;
    Object.assign(primaryVehicle, this.buildDemoVehicles(tenantId)[0]);
    await this.vehicleRepo.save(primaryVehicle);

    const driverTemplates = this.buildDemoDrivers(tenantId);
    const savedDrivers: Driver[] = [];
    for (const [index, template] of driverTemplates.entries()) {
      const driver = drivers[index] || this.driverRepo.create({ tenantId });
      Object.assign(driver, {
        ...template,
        tenantId,
        tcKimlikNo: driver.tcKimlikNo || template.tcKimlikNo,
        isActive: true,
      });
      savedDrivers.push(await this.driverRepo.save(driver));
    }

    Object.assign(sentTrip, {
      vehicleId: primaryVehicle.id,
      vehiclePlate: primaryVehicle.plateNumber,
      departureDate: '2026-04-20',
      departureTime: '10:00',
      endDate: '2026-04-20',
      endTime: '23:59',
      description: 'İstanbul içi transfer',
      vehiclePhone: '05321234567',
      originIlCode: 34,
      originIlceCode: 1135,
      destIlCode: 34,
      destIlceCode: 1835,
      originPlace: 'Bağcılar / İstanbul',
      destPlace: 'Sabiha Gökçen Havalimanı / İstanbul',
      status: TripStatus.SENT,
      uetdsSeferRefNo: DEMO_TRIP_REF,
      uetdsSentAt: new Date('2026-04-20T09:52:48.000Z'),
    });
    await this.tripRepo.save(sentTrip);

    await this.personnelRepo.delete({ tripId: sentTrip.id });

    const groupIds = sentTrip.groups?.map((group) => group.id) || [];
    if (groupIds.length > 0) {
      await this.passengerRepo
        .createQueryBuilder()
        .delete()
        .where('tripGroupId IN (:...groupIds)', { groupIds })
        .execute();
      await this.groupRepo.delete({ tripId: sentTrip.id });
    }

    const group = await this.groupRepo.save(
      this.groupRepo.create(this.buildDemoGroupData(sentTrip)),
    );

    await this.personnelRepo.save(
      this.personnelRepo.create(this.buildDemoPersonnel(sentTrip, savedDrivers)),
    );
    await this.passengerRepo.save(
      this.passengerRepo.create(this.buildDemoPassengers(group)),
    );
  }

  async isDemoTenant(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    return Boolean(tenant?.settings?.isDemo);
  }

  async getDemoPdfTemplateBuffer() {
    return readFile(join(process.cwd(), DEMO_PDF_TEMPLATE_PATH));
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

      await this.refreshDemoTenantSnapshot(existingTenant.id);

      return {
        tenant: await this.decorateTenant(existingTenant),
        credentials: {
          email: DEMO_ADMIN_EMAIL,
          password: DEMO_ADMIN_PASSWORD,
        },
        alreadyExists: true,
        userId: existingUser.id,
      };
    }

    const tenant = this.tenantRepo.create({
      companyName: DEMO_COMPANY_NAME,
      taxNumber: DEMO_TENANT_TAX_NUMBER,
      contactEmail: DEMO_ADMIN_EMAIL,
      contactPhone: '+90 554 581 20 34',
      address: 'Bağcılar / İstanbul',
      isActive: true,
      subscriptionPlan: getTenantPackageSeedPlan(),
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
      tenant: await this.decorateTenant(savedTenant),
      credentials: {
        email: DEMO_ADMIN_EMAIL,
        password: DEMO_ADMIN_PASSWORD,
      },
      alreadyExists: false,
      userId: adminUser.id,
    };
  }

  async findAll(query: any = {}) {
    const qb = this.tenantRepo.createQueryBuilder('t').orderBy('t.createdAt', 'DESC');

    if (query.search) {
      qb.andWhere('t.companyName ILIKE :search', {
        search: `%${query.search}%`,
      });
    }
    if (query.isActive !== undefined) {
      qb.andWhere('t.isActive = :isActive', {
        isActive: toActiveFlag(query.isActive) ?? query.isActive,
      });
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [tenants, total] = await qb.getManyAndCount();
    return { tenants: await this.decorateTenants(tenants), total, page, limit };
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Firma bulunamadı');
    return this.decorateTenant(tenant);
  }

  async create(data: CreateTenantInput) {
    const normalizedData: CreateTenantInput = {
      ...data,
      subscriptionPlan: normalizeTenantPackage(data.subscriptionPlan),
      adminEmail: normalizeEmail(data.adminEmail),
      adminFirstName: normalizeName(data.adminFirstName, 'Admin'),
      adminLastName: normalizeName(data.adminLastName, data.companyName || 'Admin'),
      contactEmail: normalizeEmail(data.contactEmail),
      contactPhone: normalizeText(data.contactPhone),
      taxNumber: normalizeText(data.taxNumber),
      d2LicenseNumber: normalizeText(data.d2LicenseNumber),
      unetNumber: normalizeText(data.unetNumber),
      uetdsUsername: normalizeText(data.uetdsUsername),
      uetdsPasswordEncrypted: normalizeText(data.uetdsPasswordEncrypted),
      address: normalizeText(data.address),
      settings: sanitizeTenantSettings(data.settings),
    };

    const existing = await this.tenantRepo.findOne({
      where: { taxNumber: normalizedData.taxNumber },
    });
    if (existing && normalizedData.taxNumber) {
      throw new ConflictException('Bu vergi numarası zaten kayıtlı');
    }

    const crmApiKey = uuid().replace(/-/g, '');

    const tenant = this.tenantRepo.create({
      ...normalizedData,
      settings: { crmApiKey, ...(normalizedData.settings || {}) },
    });
    const savedTenant = await this.tenantRepo.save(tenant);

    if (normalizedData.adminEmail && normalizedData.adminPassword) {
      const adminUser = this.userRepo.create({
        email: normalizedData.adminEmail,
        passwordHash: await bcrypt.hash(normalizedData.adminPassword, 12),
        firstName: normalizedData.adminFirstName || 'Admin',
        lastName: normalizedData.adminLastName || normalizedData.companyName || 'Admin',
        role: UserRole.COMPANY_ADMIN,
        tenantId: savedTenant.id,
        isActive: normalizedData.isActive ?? true,
        phone: normalizeText(normalizedData.contactPhone),
      });
      await this.userRepo.save(adminUser);
    }

    return this.findOne(savedTenant.id);
  }

  async updateAdminPassword(id: string, password: string) {
    const normalizedPassword = password?.trim();
    if (!normalizedPassword) {
      throw new BadRequestException('Panel giriş şifresi zorunludur');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Firma bulunamadı');

    const adminUser = await this.userRepo.findOne({
      where: { tenantId: id, role: UserRole.COMPANY_ADMIN },
      order: { createdAt: 'ASC' },
    });
    if (!adminUser) throw new NotFoundException('Şirket yönetici hesabı bulunamadı');

    adminUser.passwordHash = await bcrypt.hash(normalizedPassword, 12);
    adminUser.isActive = true;
    await this.userRepo.save(adminUser);

    return { ok: true, userId: adminUser.id, email: adminUser.email };
  }

  async update(id: string, data: Partial<Tenant>, role?: UserRole) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Firma bulunamadı');

    const canUpdateUetdsCredentials =
      !role || role === UserRole.SUPER_ADMIN || role === UserRole.COMPANY_ADMIN;
    const safeData = canUpdateUetdsCredentials
      ? data
      : {
          ...data,
          uetdsUsername: undefined,
          uetdsPasswordEncrypted: undefined,
          unetNumber: undefined,
          settings: data.settings
            ? {
                ...data.settings,
                uetdsEnvironment: tenant.settings?.uetdsEnvironment,
              }
            : data.settings,
        };

    const normalizedData: Partial<Tenant> = {
      ...safeData,
      subscriptionPlan:
        safeData.subscriptionPlan !== undefined
          ? normalizeTenantPackage(safeData.subscriptionPlan)
          : tenant.subscriptionPlan,
      contactEmail:
        safeData.contactEmail !== undefined ? normalizeEmail(safeData.contactEmail) : tenant.contactEmail,
      contactPhone:
        safeData.contactPhone !== undefined ? normalizeText(safeData.contactPhone) : tenant.contactPhone,
      taxNumber: safeData.taxNumber !== undefined ? normalizeText(safeData.taxNumber) : tenant.taxNumber,
      d2LicenseNumber:
        safeData.d2LicenseNumber !== undefined
          ? normalizeText(safeData.d2LicenseNumber)
          : tenant.d2LicenseNumber,
      unetNumber:
        safeData.unetNumber !== undefined ? normalizeText(safeData.unetNumber) : tenant.unetNumber,
      uetdsUsername:
        safeData.uetdsUsername !== undefined
          ? normalizeText(safeData.uetdsUsername)
          : tenant.uetdsUsername,
      uetdsPasswordEncrypted:
        safeData.uetdsPasswordEncrypted !== undefined
          ? normalizeText(safeData.uetdsPasswordEncrypted)
          : tenant.uetdsPasswordEncrypted,
      address: safeData.address !== undefined ? normalizeText(safeData.address) : tenant.address,
      settings:
        safeData.settings !== undefined
          ? mergeTenantSettings(tenant.settings, safeData.settings)
          : tenant.settings,
    };

    Object.assign(tenant, normalizedData);
    await this.tenantRepo.save(tenant);
    return this.findOne(id);
  }

  async toggleActive(id: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException('Firma bulunamadı');
    tenant.isActive = !tenant.isActive;
    await this.tenantRepo.save(tenant);
    return this.findOne(id);
  }
}
