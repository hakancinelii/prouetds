import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../../database/entities';

import { TenantsService } from '../tenants/tenants.service';

const DEMO_ADMIN_EMAIL = 'demo@prouetds.com';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private tenantsService: TenantsService, // Enjekte ettik
  ) {}

  async login(email: string, password: string) {
    if (email?.trim().toLowerCase() === DEMO_ADMIN_EMAIL) {
      await this.tenantsService.ensureDemoTenant();
    }

    const user = await this.userRepo.findOne({
      where: { email, isActive: true },
      relations: ['tenant'],
    });

    if (!user) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Geçersiz e-posta veya şifre');
    }

    // Update last login
    await this.userRepo.update(user.id, { lastLogin: new Date() });

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      driverId: user.driverId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    // Save refresh token hash
    await this.userRepo.update(user.id, {
      refreshToken: await bcrypt.hash(refreshToken, 10),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        tenant: user.tenant
          ? {
              id: user.tenant.id,
              companyName: user.tenant.companyName,
            }
          : null,
      },
    };
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    tenantId?: string,
  ) {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Bu e-posta adresi zaten kullanılıyor');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.userRepo.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      tenantId,
    });

    return this.userRepo.save(user);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepo.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Geçersiz token');
      }

      const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Geçersiz token');
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        driverId: user.driverId,
      };

      return {
        accessToken: this.jwtService.sign(newPayload),
      };
    } catch {
      throw new UnauthorizedException('Geçersiz token');
    }
  }

  async registerTenant(data: any) {
    // This creates both the tenant and the admin user
    // adminEmail and adminPassword should be in the data
    return this.tenantsService.create({
      companyName: data.companyName,
      taxNumber: data.taxNumber,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      address: data.address,
      isActive: data.isActive ?? false,
      subscriptionPlan: data.subscriptionPlan ?? 'review_pending',
      adminEmail: data.email, // We'll map 'email' from frontend to adminEmail
      adminPassword: data.password,
      adminFirstName: data.firstName,
      adminLastName: data.lastName,
    });
  }
}
