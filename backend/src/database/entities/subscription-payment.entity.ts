import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('subscription_payments')
export class SubscriptionPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50 })
  type: 'TENANT_MAIN' | 'EXTERNAL_DRIVER'; // Is it the tenant's own fee or an external driver's fee?

  @Column({ length: 255 })
  tenantId: string;

  @Column({ length: 255, nullable: true })
  driverId: string; // Will be populated if type is EXTERNAL_DRIVER

  @Column({ type: 'int' })
  periodMonth: number;

  @Column({ type: 'int' })
  periodYear: number;

  @Column({ length: 50, default: 'UNPAID' })
  status: 'PAID' | 'UNPAID';

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
