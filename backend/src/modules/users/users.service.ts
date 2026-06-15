import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Driver, User, UserRole } from '../../database/entities';
import { DriversService } from '../drivers/drivers.service';
import { TenantsService } from '../tenants/tenants.service';

type DriverUserCreateInput = {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  phone?: string | null;
  plateNumber?: string | null;
  tcKimlikNo: string;
  nationalityCode?: string | null;
  gender?: string | null;
  srcCertificate?: string | null;
  address?: string | null;
  isActive?: boolean;
};

type DriverUserUpdateInput = Partial<DriverUserCreateInput>;

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase();
const normalizeText = (value?: string | null) => value?.trim() || null;
const normalizeName = (value?: string | null, field = 'Ad') => {
  const normalized = value?.trim();
  if (!normalized) throw new BadRequestException(`${field} zorunludur`);
  return normalized;
};
const normalizeTc = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) throw new BadRequestException('TC Kimlik No zorunludur');
  return normalized;
};
const normalizePassword = (value?: string | null) => {
  const normalized = value?.trim();
  if (!normalized) throw new BadRequestException('Şifre zorunludur');
  return normalized;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    private tenantsService: TenantsService,
    private driversService: DriversService,
  ) {}

  private buildListItem(user: User, driver: Driver | null) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      plateNumber: user.plateNumber,
      role: user.role,
      tenantId: user.tenantId,
      driverId: user.driverId,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      driver: driver
        ? {
            id: driver.id,
            tcKimlikNo: driver.tcKimlikNo,
            nationalityCode: driver.nationalityCode,
            gender: driver.gender,
            srcCertificate: driver.srcCertificate,
            address: driver.address,
            isActive: driver.isActive,
          }
        : null,
    };
  }

  private async ensureEmailAvailable(email: string, excludeUserId?: string) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException('Bu e-posta adresi zaten kullanılıyor');
    }
  }

  private async ensureDriverIdentityAvailable(
    tenantId: string,
    tcKimlikNo: string,
    excludeDriverId?: string,
  ) {
    const existing = await this.driversService.findByIdentity(tenantId, tcKimlikNo);
    if (existing && existing.id !== excludeDriverId) {
      throw new ConflictException('Bu TC Kimlik No ile kayıtlı bir şoför zaten var');
    }
  }

  // Convert a Postgres unique violation (drivers tenantId+tcKimlikNo) into a clean
  // 409 so a concurrent/edge case can never surface as a raw 500.
  private async guardDriverIdentity<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error: any) {
      if (error?.code === '23505' || /duplicate key/i.test(error?.message || '')) {
        throw new ConflictException('Bu TC Kimlik No başka bir şoförde kayıtlı');
      }
      throw error;
    }
  }

  private async getUserEntity(id: string, tenantId: string) {
    const user = await this.userRepo.findOne({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı');
    return user;
  }

  async list(tenantId: string) {
    const users = await this.userRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });

    const driverMap = new Map<string, Driver>();
    for (const user of users) {
      if (!user.driverId) continue;
      const driver = await this.driversService.findByIdOptional(user.driverId, tenantId);
      if (driver) driverMap.set(driver.id, driver);
    }
    const capacity = await this.tenantsService.getTenantCapacity(tenantId);

    return {
      items: users
        .filter((user) => user.role !== UserRole.SUPER_ADMIN)
        .map((user) => this.buildListItem(user, user.driverId ? driverMap.get(user.driverId) || null : null)),
      capacity,
    };
  }

  async createDriverUser(tenantId: string, data: DriverUserCreateInput) {
    await this.tenantsService.assertTenantCanCreateUser(tenantId);

    const email = normalizeEmail(data.email);
    if (!email) throw new BadRequestException('E-posta zorunludur');
    const firstName = normalizeName(data.firstName, 'Ad');
    const lastName = normalizeName(data.lastName, 'Soyad');
    const password = normalizePassword(data.password);
    const tcKimlikNo = normalizeTc(data.tcKimlikNo);

    await this.ensureEmailAvailable(email);

    const normalizedPlateNumber =
      normalizeText(data.plateNumber)?.toUpperCase() || null;

    // If a driver with this TC already exists in the tenant, link the new user to it
    // (no duplicate driver). Only block when that driver already has a user account.
    const existingDriver = await this.driversService.findByIdentity(tenantId, tcKimlikNo);
    let driver: Driver;
    if (existingDriver && existingDriver.isActive) {
      const linkedUser = await this.userRepo.findOne({
        where: { tenantId, driverId: existingDriver.id },
      });
      if (linkedUser) {
        throw new ConflictException(
          'Bu TC Kimlik No ile kayıtlı şoförün zaten bir kullanıcı hesabı var',
        );
      }
      driver = await this.guardDriverIdentity(() =>
        this.driversService.updateDriverRecord(existingDriver.id, tenantId, {
          firstName,
          lastName,
          tcKimlikNo,
          phone: normalizeText(data.phone) ?? existingDriver.phone,
          plateNumber: normalizedPlateNumber ?? existingDriver.plateNumber,
          nationalityCode:
            normalizeText(data.nationalityCode)?.toUpperCase() ||
            existingDriver.nationalityCode ||
            'TR',
          gender: normalizeText(data.gender) ?? existingDriver.gender,
          srcCertificate:
            normalizeText(data.srcCertificate) ?? existingDriver.srcCertificate,
          address: normalizeText(data.address) ?? existingDriver.address,
          isActive: data.isActive ?? true,
        }),
      );
    } else {
      // A soft-deleted driver may still hold this TC in the unique index; free it.
      if (existingDriver) {
        await this.driversService.releaseIdentity(existingDriver.id, tenantId);
      }
      driver = await this.guardDriverIdentity(() =>
        this.driversService.createDriverUserRecord(tenantId, {
          firstName,
          lastName,
          tcKimlikNo,
          phone: normalizeText(data.phone),
          plateNumber: normalizedPlateNumber,
          nationalityCode: normalizeText(data.nationalityCode)?.toUpperCase() || 'TR',
          gender: normalizeText(data.gender),
          srcCertificate: normalizeText(data.srcCertificate),
          address: normalizeText(data.address),
          isActive: data.isActive ?? true,
        }),
      );
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        tenantId,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName,
        lastName,
        phone: normalizeText(data.phone),
        plateNumber: normalizedPlateNumber,
        role: UserRole.DRIVER,
        driverId: driver.id,
        isActive: data.isActive ?? true,
      }),
    );

    return {
      item: this.buildListItem(user, driver),
      capacity: await this.tenantsService.getTenantCapacity(tenantId),
    };
  }

  async updateDriverUser(id: string, tenantId: string, data: DriverUserUpdateInput) {
    const user = await this.getUserEntity(id, tenantId);
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Süper admin bu ekrandan güncellenemez');
    }

    const nextEmail = data.email !== undefined ? normalizeEmail(data.email) : user.email;
    if (!nextEmail) throw new BadRequestException('E-posta zorunludur');
    await this.ensureEmailAvailable(nextEmail, user.id);

    const driver = user.driverId
      ? await this.driversService.findByIdOptional(user.driverId, tenantId)
      : null;

    const nextFirstName = data.firstName !== undefined ? normalizeName(data.firstName, 'Ad') : user.firstName;
    const nextLastName = data.lastName !== undefined ? normalizeName(data.lastName, 'Soyad') : user.lastName;
    const nextTc = data.tcKimlikNo !== undefined ? normalizeTc(data.tcKimlikNo) : driver?.tcKimlikNo;

    if (nextTc) {
      const clash = await this.driversService.findByIdentity(tenantId, nextTc);
      if (clash && clash.id !== driver?.id) {
        if (clash.isActive) {
          throw new ConflictException(
            'Bu TC Kimlik No başka bir aktif şoförde kayıtlı',
          );
        }
        // TC belongs to a soft-deleted driver — free it so it can be reused.
        await this.driversService.releaseIdentity(clash.id, tenantId);
      }
    }

    user.email = nextEmail;
    user.firstName = nextFirstName;
    user.lastName = nextLastName;
    if (data.phone !== undefined) user.phone = normalizeText(data.phone);
    if (data.plateNumber !== undefined) {
      user.plateNumber = normalizeText(data.plateNumber)?.toUpperCase() || null;
    }
    if (data.isActive !== undefined) user.isActive = data.isActive;
    if (data.password !== undefined) {
      user.passwordHash = await bcrypt.hash(normalizePassword(data.password), 12);
    }
    await this.userRepo.save(user);

    let nextDriver = driver;
    if (driver) {
      nextDriver = await this.guardDriverIdentity(() =>
        this.driversService.updateDriverRecord(driver.id, tenantId, {
          firstName: nextFirstName,
          lastName: nextLastName,
          tcKimlikNo: nextTc || driver.tcKimlikNo,
          phone: data.phone !== undefined ? normalizeText(data.phone) : user.phone,
          plateNumber:
            data.plateNumber !== undefined
              ? normalizeText(data.plateNumber)?.toUpperCase() || null
              : driver.plateNumber || user.plateNumber,
          nationalityCode:
            data.nationalityCode !== undefined
              ? normalizeText(data.nationalityCode)?.toUpperCase() || 'TR'
              : driver.nationalityCode,
          gender: data.gender !== undefined ? normalizeText(data.gender) : driver.gender,
          srcCertificate:
            data.srcCertificate !== undefined ? normalizeText(data.srcCertificate) : driver.srcCertificate,
          address: data.address !== undefined ? normalizeText(data.address) : driver.address,
          isActive: data.isActive !== undefined ? data.isActive : driver.isActive,
        }),
      );
    }

    return {
      item: this.buildListItem(user, nextDriver || null),
      capacity: await this.tenantsService.getTenantCapacity(tenantId),
    };
  }

  async toggleActive(id: string, tenantId: string) {
    const user = await this.getUserEntity(id, tenantId);
    user.isActive = !user.isActive;
    await this.userRepo.save(user);

    let driver = null;
    if (user.driverId) {
      driver = await this.driversService.toggleDriverRecordActive(
        user.driverId,
        tenantId,
        user.isActive,
      );
    }

    return {
      item: this.buildListItem(user, driver),
      capacity: await this.tenantsService.getTenantCapacity(tenantId),
    };
  }
}
