import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../database/entities';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    private tenantsService: TenantsService,
  ) {}

  async findAll(tenantId: string) {
    return this.driverRepo.find({
      where: { tenantId, isActive: true },
      order: { firstName: 'ASC' },
    });
  }

  async findAnyByTenant(tenantId: string) {
    return this.driverRepo.find({
      where: { tenantId },
      order: { firstName: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const driver = await this.driverRepo.findOne({ where: { id, tenantId } });
    if (!driver) throw new NotFoundException('Şoför bulunamadı');
    return driver;
  }

  async findByIdentity(tenantId: string, tcKimlikNo: string) {
    return this.driverRepo.findOne({ where: { tenantId, tcKimlikNo } });
  }

  async findByIdOptional(id: string, tenantId: string) {
    return this.driverRepo.findOne({ where: { id, tenantId } });
  }

  async create(tenantId: string, data: Partial<Driver>) {
    const driver = this.driverRepo.create({ ...data, tenantId });
    return this.driverRepo.save(driver);
  }

  async update(id: string, tenantId: string, data: Partial<Driver>) {
    const driver = await this.findOne(id, tenantId);
    Object.assign(driver, data);
    return this.driverRepo.save(driver);
  }

  async remove(id: string, tenantId: string) {
    const driver = await this.findOne(id, tenantId);
    driver.isActive = false;
    return this.driverRepo.save(driver);
  }

  async createDriverUserRecord(tenantId: string, data: Partial<Driver>) {
    await this.tenantsService.assertTenantCanCreateUser(tenantId);
    const driver = this.driverRepo.create({
      ...data,
      tenantId,
      isActive: data.isActive ?? true,
    });
    return this.driverRepo.save(driver);
  }

  async updateDriverRecord(id: string, tenantId: string, data: Partial<Driver>) {
    const driver = await this.findOne(id, tenantId);
    Object.assign(driver, data);
    return this.driverRepo.save(driver);
  }

  // Free the unique (tenantId, tcKimlikNo) slot held by a soft-deleted driver so the
  // identity can be reused, without hard-deleting the row (keeps trip history intact).
  async releaseIdentity(id: string, tenantId: string) {
    const driver = await this.findOne(id, tenantId);
    driver.isActive = false;
    driver.tcKimlikNo = `x${driver.id.replace(/-/g, '')}`.slice(0, 30);
    return this.driverRepo.save(driver);
  }

  async toggleDriverRecordActive(id: string, tenantId: string, isActive: boolean) {
    const driver = await this.findOne(id, tenantId);
    driver.isActive = isActive;
    return this.driverRepo.save(driver);
  }

  async autoMatchPlatesFromTrips(tenantId: string) {
    // Find trips with a vehicle plate — prefer UETDS-sent ones, fall back to any trip
    let sentTrips = await this.tripRepo.find({
      where: { tenantId, uetdsSeferRefNo: Not(IsNull()) },
      select: ['id', 'vehiclePlate', 'createdAt'],
      order: { createdAt: 'DESC' },
    });

    // Fallback: include all trips that have a plate assigned
    if (sentTrips.length === 0) {
      sentTrips = await this.tripRepo.find({
        where: { tenantId },
        select: ['id', 'vehiclePlate', 'createdAt'],
        order: { createdAt: 'DESC' },
      });
      sentTrips = sentTrips.filter(t => t.vehiclePlate);
    }

    if (sentTrips.length === 0) return { matched: 0, results: [] };

    const tripIds = sentTrips.map((t) => t.id);
    const plateByTripId = new Map(sentTrips.map((t) => [t.id, t.vehiclePlate]));

    // Find personnel (drivers) for these trips
    const personnel = await this.personnelRepo.find({
      where: tripIds.map((id) => ({ tripId: id, personnelType: 0 })),
    });

    // Build driverId → most recent plate map (trips are already sorted by createdAt DESC)
    const driverPlateMap = new Map<string, string>();
    for (const p of personnel) {
      if (!p.driverId) continue;
      const plate = plateByTripId.get(p.tripId);
      if (plate && !driverPlateMap.has(p.driverId)) {
        driverPlateMap.set(p.driverId, plate);
      }
    }

    const results: { driverId: string; name: string; plate: string; updated: boolean }[] = [];

    for (const [driverId, plate] of driverPlateMap) {
      const driver = await this.driverRepo.findOne({ where: { id: driverId, tenantId } });
      if (!driver) continue;

      const wasEmpty = !driver.plateNumber;
      driver.plateNumber = plate.toUpperCase();
      await this.driverRepo.save(driver);

      // Sync to linked user record
      const linkedUser = await this.userRepo.findOne({ where: { driverId, tenantId } });
      if (linkedUser) {
        linkedUser.plateNumber = plate.toUpperCase();
        await this.userRepo.save(linkedUser);
      }

      results.push({
        driverId,
        name: `${driver.firstName} ${driver.lastName}`,
        plate: plate.toUpperCase(),
        updated: wasEmpty,
      });
    }

    return { matched: results.length, results };
  }
}
