import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';
import { UsersService } from './users.service';

@Controller('api/users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  list(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Query('tenantId') tenantIdQuery?: string,
  ) {
    const effectiveTenantId = role === UserRole.SUPER_ADMIN ? tenantIdQuery || tenantId : tenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('Tenant seçimi gerekli');
    }
    return this.usersService.list(effectiveTenantId);
  }

  @Post('driver')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  createDriver(
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Body() body: any,
    @Query('tenantId') tenantIdQuery?: string,
  ) {
    const effectiveTenantId = role === UserRole.SUPER_ADMIN ? tenantIdQuery || body.tenantId : tenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('Tenant seçimi gerekli');
    }
    return this.usersService.createDriverUser(effectiveTenantId, body);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Body() body: any,
    @Query('tenantId') tenantIdQuery?: string,
  ) {
    const effectiveTenantId = role === UserRole.SUPER_ADMIN ? tenantIdQuery || body.tenantId : tenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('Tenant seçimi gerekli');
    }
    return this.usersService.updateDriverUser(id, effectiveTenantId, body);
  }

  @Post(':id/toggle-active')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  toggleActive(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser('role') role: UserRole,
    @Body() body: any,
    @Query('tenantId') tenantIdQuery?: string,
  ) {
    const effectiveTenantId = role === UserRole.SUPER_ADMIN ? tenantIdQuery || body.tenantId : tenantId;
    if (!effectiveTenantId) {
      throw new ForbiddenException('Tenant seçimi gerekli');
    }
    return this.usersService.toggleActive(id, effectiveTenantId);
  }
}
