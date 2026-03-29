import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UetdsService } from './uetds.service';
import { TenantId } from '../../common/decorators/user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../database/entities';

@Controller('api/uetds')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UetdsController {
  constructor(
    private uetdsService: UetdsService,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
  ) {}

  // Inject Tenant repo for credential lookup
  private async getTenantProps(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }
    return { 
      username: tenant.uetdsUsername, 
      password: tenant.uetdsPasswordEncrypted,
      environment: tenant.settings?.uetdsEnvironment || 'test'
    };
  }

  @Get('test')
  async testConnection(@TenantId() tenantId: string) {
    const { username, password, environment } = await this.getTenantProps(tenantId);
    return this.uetdsService.servisTest(username, password, tenantId, 'ping', environment);
  }

  @Get('validate-credentials')
  @Roles(UserRole.COMPANY_ADMIN)
  async validateCredentials(@TenantId() tenantId: string) {
    const { username, password, environment } = await this.getTenantProps(tenantId);
    return this.uetdsService.kullaniciKontrol(username, password, tenantId, environment);
  }
}
