import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UetdsService } from './uetds.service';
import { UetdsController } from './uetds.controller';
import { UetdsLog, Tenant } from '../../database/entities';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([UetdsLog, Tenant]), LogsModule],
  controllers: [UetdsController],
  providers: [UetdsService],
  exports: [UetdsService],
})
export class UetdsModule {}
