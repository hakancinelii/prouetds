import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Driver } from '../../database/entities';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
  ) {}

  async findAll(tenantId: string) {
    return this.driverRepo.find({
      where: { tenantId, isActive: true },
      order: { firstName: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const driver = await this.driverRepo.findOne({ where: { id, tenantId } });
    if (!driver) throw new NotFoundException('Şoför bulunamadı');
    return driver;
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
}
