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
import type { Tenant } from './tenant.entity';
import type { Driver } from './driver.entity';

@Entity('vehicles')
@Index(['tenantId', 'plateNumber'], { unique: true })
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ length: 20 })
  plateNumber: string;

  @Column({ length: 100, nullable: true })
  brand: string;

  @Column({ length: 100, nullable: true })
  model: string;

  @Column({ nullable: true })
  year: number;

  @Column({ nullable: true })
  seatCapacity: number;

  @Column({ length: 50, nullable: true })
  vehicleCardExpiry: string;

  @Column({ length: 50, nullable: true })
  inspectionExpiry: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'uuid', nullable: true })
  defaultDriverId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => 'Tenant', (tenant) => tenant.vehicles)
  @JoinColumn({ name: 'tenantId' })
  tenant: Tenant;

  @ManyToOne(() => 'Driver', { nullable: true })
  @JoinColumn({ name: 'defaultDriverId' })
  defaultDriver: Driver;
}
