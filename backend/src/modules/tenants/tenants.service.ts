import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Tenant, User, UserRole } from '../../database/entities';
import { v4 as uuid } from 'uuid';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

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
