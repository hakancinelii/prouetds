import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UetdsLog, AuditLog } from '../../database/entities';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(UetdsLog) private uetdsLogRepo: Repository<UetdsLog>,
    @InjectRepository(AuditLog) private auditLogRepo: Repository<AuditLog>,
  ) {}

  async getUetdsLogs(tenantId: string, query: any = {}) {
    const qb = this.uetdsLogRepo
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .orderBy('log.createdAt', 'DESC');

    if (query.tripId) {
      qb.andWhere('log.tripId = :tripId', { tripId: query.tripId });
    }
    if (query.methodName) {
      qb.andWhere('log.methodName = :methodName', { methodName: query.methodName });
    }
    if (query.fromDate && query.toDate) {
      qb.andWhere('log.createdAt BETWEEN :from AND :to', {
        from: query.fromDate,
        to: query.toDate,
      });
    }
    if (query.onlyErrors) {
      qb.andWhere('log.resultCode != 0');
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    qb.skip((page - 1) * limit).take(limit);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total, page, limit };
  }

  async getUetdsLogsByTrip(tripId: string, tenantId: string) {
    return this.uetdsLogRepo.find({
      where: { tripId, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  async createAuditLog(data: Partial<AuditLog>) {
    const log = this.auditLogRepo.create(data);
    return this.auditLogRepo.save(log);
  }

  async getAuditLogs(tenantId: string, query: any = {}) {
    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.tenantId = :tenantId', { tenantId })
      .orderBy('log.createdAt', 'DESC');

    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    }
    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    qb.skip((page - 1) * limit).take(limit);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total, page, limit };
  }

  /** Dashboard statistics */
  async getStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalCalls, todayCalls, errorCalls, avgResponseTime] =
      await Promise.all([
        this.uetdsLogRepo.count({ where: { tenantId } }),
        this.uetdsLogRepo.count({
          where: { tenantId, createdAt: Between(today, tomorrow) },
        }),
        this.uetdsLogRepo
          .createQueryBuilder('log')
          .where('log.tenantId = :tenantId', { tenantId })
          .andWhere('log.resultCode != 0 AND log.resultCode IS NOT NULL')
          .getCount(),
        this.uetdsLogRepo
          .createQueryBuilder('log')
          .select('AVG(log.responseTimeMs)', 'avg')
          .where('log.tenantId = :tenantId', { tenantId })
          .getRawOne(),
      ]);

    return {
      totalCalls,
      todayCalls,
      errorCalls,
      errorRate: totalCalls > 0 ? ((errorCalls / totalCalls) * 100).toFixed(2) : 0,
      avgResponseTimeMs: Math.round(avgResponseTime?.avg || 0),
    };
  }
}
