import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantsService } from './tenants.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';
import { TenantId, CurrentUser } from '../../common/decorators/user.decorator';

@Controller('api/tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll(@Query() query: any) {
    return this.tenantsService.findAll(query);
  }

  @Get('me')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR, UserRole.DRIVER)
  findMe(@TenantId() tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() data: any) {
    return this.tenantsService.create(data);
  }

  @Patch('me')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  updateMe(
    @Body() data: any,
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.tenantsService.update(tenantId, data, role);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() data: any,
    @TenantId() userTenantId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const normalizedId = id === 'me' ? userTenantId : id;

    // If not super admin, must match tenant ID
    if (role !== UserRole.SUPER_ADMIN && normalizedId !== userTenantId) {
      throw new ForbiddenException('Sadece kendi şirket bilgilerinizi güncelleyebilirsiniz');
    }
    return this.tenantsService.update(normalizedId, data, role);
  }

  @Post(':id/toggle-active')
  @Roles(UserRole.SUPER_ADMIN)
  toggleActive(@Param('id') id: string) {
    return this.tenantsService.toggleActive(id);
  }
}
