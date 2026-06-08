import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { TripsModule } from '../trips/trips.module';
import { Tenant, Trip, TripGroup, Passenger } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Trip, TripGroup, Passenger]),
    TripsModule,
  ],
  controllers: [CrmController],
  providers: [CrmService],
})
export class CrmModule {}
