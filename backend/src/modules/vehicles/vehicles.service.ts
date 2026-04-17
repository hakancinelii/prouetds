import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../database/entities';

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
  ) {}

  private normalizePlate(plate: string) {
    return plate.trim().toUpperCase().replace(/\s+/g, '');
  }

  private normalizeVehiclePayload(data: Partial<Vehicle>) {
    const plateNumber = data.plateNumber ? this.normalizePlate(data.plateNumber) : '';
    const brand = data.brand?.trim() || null;
    const model = data.model?.trim() || null;

    return {
      plateNumber,
      brand,
      model,
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
    });

    if (existingVehicle) {
      existingVehicle.isActive = true;
      existingVehicle.brand = normalized.brand || existingVehicle.brand;
      existingVehicle.model = normalized.model || existingVehicle.model;
      await this.vehicleRepo.save(existingVehicle);
      return 'reactivated';
    }

    const vehicle = this.vehicleRepo.create({
      ...normalized,
      tenantId,
      isActive: true,
    });
    await this.vehicleRepo.save(vehicle);
    return 'created';
  }

  async findAll(tenantId: string) {
    return this.vehicleRepo.find({
      where: { tenantId, isActive: true },
      order: { plateNumber: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const vehicle = await this.vehicleRepo.findOne({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException('Araç bulunamadı');
    return vehicle;
  }

  async create(tenantId: string, data: Partial<Vehicle>) {
    await this.upsertVehicle(tenantId, data);
    const normalizedPlate = this.normalizePlate(data.plateNumber || '');
    return this.vehicleRepo.findOneOrFail({ where: { tenantId, plateNumber: normalizedPlate } });
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
    Object.assign(vehicle, normalized);
    return this.vehicleRepo.save(vehicle);
  }

  async remove(id: string, tenantId: string) {
    const vehicle = await this.findOne(id, tenantId);
    vehicle.isActive = false;
    return this.vehicleRepo.save(vehicle);
  }
}
