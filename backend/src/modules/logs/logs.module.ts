import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { UetdsLog, AuditLog } from '../../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([UetdsLog, AuditLog])],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
