import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import {
  Trip,
  TripGroup,
  TripPersonnel,
  Passenger,
  Tenant,
} from '../../database/entities';
import { UetdsModule } from '../uetds/uetds.module';
import { ParserModule } from '../parser/parser.module';
import { OcrModule } from '../ocr/ocr.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Trip, TripGroup, TripPersonnel, Passenger, Tenant]),
    UetdsModule,
    ParserModule,
    OcrModule,
    TenantsModule,
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
