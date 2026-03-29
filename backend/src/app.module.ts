import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';

import appConfig from './config/app.config';
import { getDatabaseConfig } from './config/database.config';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { TripsModule } from './modules/trips/trips.module';
import { UetdsModule } from './modules/uetds/uetds.module';
import { ParserModule } from './modules/parser/parser.module';
import { LogsModule } from './modules/logs/logs.module';
import { CrmModule } from './modules/crm/crm.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    TenantsModule,
    DriversModule,
    VehiclesModule,
    TripsModule,
    UetdsModule,
    ParserModule,
    LogsModule,
    CrmModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}
