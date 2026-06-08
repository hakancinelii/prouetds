import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import type { User  } from './user.entity';
import type { Driver  } from './driver.entity';
import type { Vehicle  } from './vehicle.entity';
import type { Trip  } from './trip.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  companyName: string;

  @Column({ length: 50, nullable: true })
  taxNumber: string;

  @Column({ length: 100, nullable: true })
  d2LicenseNumber: string;

  @Column({ length: 50, nullable: true })
  uetdsUsername: string;

  @Column({ length: 255, nullable: true })
  uetdsPasswordEncrypted: string;

  @Column({ length: 50, nullable: true })
  unetNumber: string;

  @Column({ length: 255, nullable: true })
  contactEmail: string;

  @Column({ length: 50, nullable: true })
  contactPhone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 50, default: 'basic' })
  subscriptionPlan: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => 'User', (user) => user.tenant)
  users: User[];

  @OneToMany(() => 'Driver', (driver) => driver.tenant)
  drivers: Driver[];

  @OneToMany(() => 'Vehicle', (vehicle) => vehicle.tenant)
  vehicles: Vehicle[];

  @OneToMany(() => 'Trip', (trip) => trip.tenant)
  trips: Trip[];
}
