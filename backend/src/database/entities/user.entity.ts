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
import type { Driver  } from './driver.entity';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  COMPANY_ADMIN = 'company_admin',
  OPERATOR = 'operator',
  DRIVER = 'driver',
}

@Entity('users')
@Index(['tenantId', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId: string;

  @Column({ length: 255 })
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.OPERATOR })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  driverId: string;

  @Column({ type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ length: 500, nullable: true })
  refreshToken: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => 'Tenant', (tenant) => tenant.users)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => 'Driver', { nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: Driver;
}
