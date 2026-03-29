import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { CrmService } from './crm.service';

/**
 * CRM Integration API
 * Used by external CRM systems (Pro Acente) to create trips and manage passengers.
 * Authentication via X-API-Key header.
 */
@Controller('api/crm')
export class CrmController {
  constructor(private crmService: CrmService) {}

  private async auth(apiKey: string) {
    return this.crmService.validateApiKey(apiKey);
  }

  @Post('trips')
  async createTrip(
    @Headers('x-api-key') apiKey: string,
    @Body() data: any,
  ) {
    const tenant = await this.auth(apiKey);
    const trip = await this.crmService.createTrip(tenant.id, data);
    return { success: true, tripId: trip.id };
  }

  @Post('trips/:tripId/groups/:groupId/passengers')
  async addPassengers(
    @Headers('x-api-key') apiKey: string,
    @Param('tripId') tripId: string,
    @Param('groupId') groupId: string,
    @Body('passengers') passengers: any[],
  ) {
    const tenant = await this.auth(apiKey);
    const result = await this.crmService.addPassengers(
      tripId,
      tenant.id,
      groupId,
      passengers,
    );
    return { success: true, count: result.length };
  }

  @Get('trips/:tripId/status')
  async getTripStatus(
    @Headers('x-api-key') apiKey: string,
    @Param('tripId') tripId: string,
  ) {
    const tenant = await this.auth(apiKey);
    return this.crmService.getTripStatus(tripId, tenant.id);
  }

  @Post('trips/:tripId/send')
  async sendToUetds(
    @Headers('x-api-key') apiKey: string,
    @Param('tripId') tripId: string,
  ) {
    const tenant = await this.auth(apiKey);
    return this.crmService.sendToUetds(tripId, tenant.id);
  }
}
