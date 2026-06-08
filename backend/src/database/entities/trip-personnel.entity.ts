import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Trip  } from './trip.entity';
import type { Driver  } from './driver.entity';

@Entity('trip_personnel')
@Index(['tripId'])
export class TripPersonnel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tripId: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid', nullable: true })
  driverId: string;

  /** 0:Driver, 1:Co-driver, 2:Host, 3:Hostess, 4:Other, 5:Guide */
  @Column({ type: 'int', default: 0 })
  personnelType: number;

  @Column({ length: 30 })
  tcPassportNo: string;

  @Column({ length: 10 })
  nationalityCode: string;

  @Column({ length: 50 })
  firstName: string;

  @Column({ length: 50 })
  lastName: string;

  @Column({ length: 5, nullable: true })
  gender: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  address: string;

  @Column({ length: 20, default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => 'Trip', (trip) => trip.personnel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @ManyToOne(() => 'Driver', { nullable: true })
  @JoinColumn({ name: 'driverId' })
  driver: Driver;
}
