import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LogsService } from './logs.service';
import { TenantId } from '../../common/decorators/user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';

@Controller('api/logs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.COMPANY_ADMIN)
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Get('uetds')
  getUetdsLogs(@TenantId() tenantId: string, @Query() query: any) {
    return this.logsService.getUetdsLogs(tenantId, query);
  }

  @Get('uetds/trip/:tripId')
  getUetdsLogsByTrip(
    @Param('tripId') tripId: string,
    @TenantId() tenantId: string,
  ) {
    return this.logsService.getUetdsLogsByTrip(tripId, tenantId);
  }

  @Get('audit')
  getAuditLogs(@TenantId() tenantId: string, @Query() query: any) {
    return this.logsService.getAuditLogs(tenantId, query);
  }

  @Get('stats')
  getStats(@TenantId() tenantId: string) {
    return this.logsService.getStats(tenantId);
  }
}
