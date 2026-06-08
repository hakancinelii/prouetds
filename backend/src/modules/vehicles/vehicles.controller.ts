import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { VehiclesService } from './vehicles.service';
import { TenantId } from '../../common/decorators/user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';

interface BulkVehicleBody {
  text: string;
}

@Controller('api/vehicles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.vehiclesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.vehiclesService.findOne(id, tenantId);
  }

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  create(@TenantId() tenantId: string, @Body() data: any) {
    return this.vehiclesService.create(tenantId, data);
  }

  @Post('bulk')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  createBulk(@TenantId() tenantId: string, @Body() body: BulkVehicleBody) {
    return this.vehiclesService.createBulk(tenantId, body.text || '');
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  update(@Param('id') id: string, @TenantId() tenantId: string, @Body() data: any) {
    return this.vehiclesService.update(id, tenantId, data);
  }

  @Delete(':id')
  @Roles(UserRole.COMPANY_ADMIN)
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.vehiclesService.remove(id, tenantId);
  }
}
