import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver, Vehicle } from '../../database/entities';
import { TenantsService } from '../tenants/tenants.service';

const normalizeDriverId = (value?: string | null) => value?.trim() || null;

const normalizeVehicleResponse = async (
  repo: Repository<Vehicle>,
  tenantId: string,
  id?: string,
  plateNumber?: string,
) => {
  const where = id ? { id, tenantId } : { tenantId, plateNumber };
  return repo.findOneOrFail({
    where,
    relations: ['defaultDriver'],
  });
};

const ensureTenantDriver = async (
  driverRepo: Repository<Driver>,
  tenantId: string,
  driverId?: string | null,
) => {
  const normalizedDriverId = normalizeDriverId(driverId);
  if (!normalizedDriverId) return null;
  const driver = await driverRepo.findOne({
    where: { id: normalizedDriverId, tenantId, isActive: true },
  });
  if (!driver) {
    throw new BadRequestException('Varsayılan şoför bulunamadı');
  }
  return driver.id;
};

void normalizeDriverId;
void normalizeVehicleResponse;
void ensureTenantDriver;

interface VehicleBulkResult {
  createdCount: number;
  reactivatedCount: number;
  skippedCount: number;
  errors: Array<{ line: number; message: string; raw: string }>;
}

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    private tenantsService: TenantsService,
  ) {}

  private async ensureVehicleCapacity(tenantId: string, isReactivation = false) {
    if (!isReactivation) {
      await this.tenantsService.assertTenantCanCreateVehicle(tenantId);
      return;
    }

    await this.tenantsService.assertTenantCanCreateVehicle(tenantId);
  }

  private normalizePlate(plate: string) {
    return plate.trim().toUpperCase().replace(/\s+/g, '');
  }

  private normalizeVehiclePayload(data: Partial<Vehicle>) {
    const plateNumber = data.plateNumber ? this.normalizePlate(data.plateNumber) : '';
    const brand = data.brand?.trim() || null;
    const model = data.model?.trim() || null;
    const inspectionExpiry = data.inspectionExpiry?.trim() || null;
    const defaultDriverId = normalizeDriverId(data.defaultDriverId);

    if (inspectionExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(inspectionExpiry)) {
      throw new BadRequestException('Muayene tarihi YYYY-MM-DD formatında olmalı');
    }

    return {
      plateNumber,
      brand,
      model,
      inspectionExpiry,
      defaultDriverId,
      year: data.year ?? null,
      seatCapacity: data.seatCapacity ?? null,
    };
  }

  private async upsertVehicle(
    tenantId: string,
    data: Partial<Vehicle>,
  ): Promise<'created' | 'reactivated'> {
    const normalized = this.normalizeVehiclePayload(data);

    if (!normalized.plateNumber) {
      throw new BadRequestException('Plaka zorunludur');
    }

    const existingVehicle = await this.vehicleRepo.findOne({
      where: { tenantId, plateNumber: normalized.plateNumber },
      relations: ['defaultDriver'],
    });

    const nextDefaultDriverId = await ensureTenantDriver(
      this.driverRepo,
      tenantId,
      normalized.defaultDriverId,
    );

    if (existingVehicle) {
      const needsReactivation = !existingVehicle.isActive;
      if (needsReactivation) {
        await this.ensureVehicleCapacity(tenantId, true);
      }
      existingVehicle.isActive = true;
      existingVehicle.brand = normalized.brand || existingVehicle.brand;
      existingVehicle.model = normalized.model || existingVehicle.model;
      existingVehicle.inspectionExpiry =
        normalized.inspectionExpiry === null && data.inspectionExpiry !== undefined
          ? null
          : normalized.inspectionExpiry || existingVehicle.inspectionExpiry;
      existingVehicle.defaultDriverId = nextDefaultDriverId;
      await this.vehicleRepo.save(existingVehicle);
      return 'reactivated';
    }

    await this.ensureVehicleCapacity(tenantId);

    const vehicle = this.vehicleRepo.create({
      ...normalized,
      tenantId,
      defaultDriverId: nextDefaultDriverId,
      isActive: true,
    });
    await this.vehicleRepo.save(vehicle);
    return 'created';
  }

  async findAll(tenantId: string) {
    return this.vehicleRepo.find({
      where: { tenantId, isActive: true },
      relations: ['defaultDriver'],
      order: { plateNumber: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id, tenantId },
      relations: ['defaultDriver'],
    });
    if (!vehicle) throw new NotFoundException('Araç bulunamadı');
    return vehicle;
  }

  async create(tenantId: string, data: Partial<Vehicle>) {
    await this.upsertVehicle(tenantId, data);
    const normalizedPlate = this.normalizePlate(data.plateNumber || '');
    return normalizeVehicleResponse(this.vehicleRepo, tenantId, undefined, normalizedPlate);
  }

  async createBulk(tenantId: string, text: string): Promise<VehicleBulkResult> {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      throw new BadRequestException('Toplu araç listesi boş olamaz');
    }

    const seenPlates = new Set<string>();
    const result: VehicleBulkResult = {
      createdCount: 0,
      reactivatedCount: 0,
      skippedCount: 0,
      errors: [],
    };

    for (const [index, rawLine] of lines.entries()) {
      const parts = rawLine.split(',').map((part) => part.trim());

      if (parts.length < 3) {
        result.errors.push({
          line: index + 1,
          raw: rawLine,
          message: 'Format `PLAKA, MARKA, MODEL` olmalı',
        });
        continue;
      }

      const [plateNumber, brand, model] = parts;
      const normalizedPlate = this.normalizePlate(plateNumber || '');

      if (!normalizedPlate || !brand || !model) {
        result.errors.push({
          line: index + 1,
          raw: rawLine,
          message: 'Plaka, marka ve model zorunludur',
        });
        continue;
      }

      if (seenPlates.has(normalizedPlate)) {
        result.skippedCount += 1;
        result.errors.push({
          line: index + 1,
          raw: rawLine,
          message: 'Aynı payload içinde tekrar eden plaka',
        });
        continue;
      }

      seenPlates.add(normalizedPlate);

      try {
        const action = await this.upsertVehicle(tenantId, {
          plateNumber: normalizedPlate,
          brand,
          model,
        });
        if (action === 'created') {
          result.createdCount += 1;
        } else {
          result.reactivatedCount += 1;
        }
      } catch (error: any) {
        result.errors.push({
          line: index + 1,
          raw: rawLine,
          message: error?.message || 'Araç eklenemedi',
        });
      }
    }

    return result;
  }

  async update(id: string, tenantId: string, data: Partial<Vehicle>) {
    const vehicle = await this.findOne(id, tenantId);
    const normalized = this.normalizeVehiclePayload(data);

    const nextPlate = normalized.plateNumber || vehicle.plateNumber;
    if (nextPlate !== vehicle.plateNumber) {
      const duplicate = await this.vehicleRepo.findOne({
        where: { tenantId, plateNumber: nextPlate },
      });

      if (duplicate && duplicate.id !== vehicle.id) {
        throw new BadRequestException('Bu plaka bu şirkette zaten kayıtlı');
      }
    }

    const nextDefaultDriverId = await ensureTenantDriver(
      this.driverRepo,
      tenantId,
      normalized.defaultDriverId,
    );

    Object.assign(vehicle, {
      plateNumber: nextPlate,
      brand: normalized.brand,
      model: normalized.model,
      defaultDriverId: nextDefaultDriverId,
      inspectionExpiry:
        normalized.inspectionExpiry === null && data.inspectionExpiry !== undefined
          ? null
          : normalized.inspectionExpiry || vehicle.inspectionExpiry,
    });
    await this.vehicleRepo.save(vehicle);
    return normalizeVehicleResponse(this.vehicleRepo, tenantId, vehicle.id);
  }

  async remove(id: string, tenantId: string) {
    const vehicle = await this.findOne(id, tenantId);
    vehicle.isActive = false;
    return this.vehicleRepo.save(vehicle);
  }
}
