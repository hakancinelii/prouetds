import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('uetds_logs')
@Index(['tenantId', 'tripId'])
@Index(['tenantId', 'createdAt'])
export class UetdsLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  tripId: string;

  @Column({ length: 100 })
  methodName: string;

  @Column({ type: 'text' })
  requestPayload: string;

  @Column({ type: 'text', nullable: true })
  responsePayload: string;

  @Column({ nullable: true })
  resultCode: number;

  @Column({ length: 500, nullable: true })
  resultMessage: string;

  @Column({ type: 'bigint', nullable: true })
  referenceNumber: number;

  @Column({ nullable: true })
  responseTimeMs: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 100 })
  entityType: string;

  @Column({ type: 'uuid', nullable: true })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ length: 50, nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
