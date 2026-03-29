import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../database/entities';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
  ) {}

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
    const vehicle = this.vehicleRepo.create({ ...data, tenantId });
    return this.vehicleRepo.save(vehicle);
  }

  async update(id: string, tenantId: string, data: Partial<Vehicle>) {
    const vehicle = await this.findOne(id, tenantId);
    Object.assign(vehicle, data);
    return this.vehicleRepo.save(vehicle);
  }

  async remove(id: string, tenantId: string) {
    const vehicle = await this.findOne(id, tenantId);
    vehicle.isActive = false;
    return this.vehicleRepo.save(vehicle);
  }
}
