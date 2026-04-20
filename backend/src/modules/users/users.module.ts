import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Driver, User } from '../../database/entities';
import { DriversModule } from '../drivers/drivers.module';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Driver]), TenantsModule, DriversModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
