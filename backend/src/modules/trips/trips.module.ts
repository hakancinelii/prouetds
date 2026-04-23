import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { TripsPublicController } from './trips-public.controller';
import {
  Driver,
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
    TypeOrmModule.forFeature([Trip, TripGroup, TripPersonnel, Passenger, Tenant, Driver]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
    UetdsModule,
    ParserModule,
    OcrModule,
    TenantsModule,
  ],
  controllers: [TripsController, TripsPublicController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
