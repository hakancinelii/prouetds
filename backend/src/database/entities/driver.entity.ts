import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Tenant  } from './tenant.entity';

@Entity('drivers')
@Index(['tenantId', 'tcKimlikNo'], { unique: true })
export class Driver {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 30 })
  tcKimlikNo: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 10, default: 'TR' })
  nationalityCode: string;

  @Column({ length: 5, nullable: true })
  gender: string;

  @Column({ length: 100, nullable: true })
  srcCertificate: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => 'Tenant', (tenant) => tenant.drivers)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;
}
