import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import {
  Driver,
  Passenger,
  Tenant,
  Trip,
  TripGroup,
  TripPersonnel,
  User,
  Vehicle,
} from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User, Vehicle, Driver, Trip, TripGroup, TripPersonnel, Passenger])],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
