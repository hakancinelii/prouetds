import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Trip } from './trip.entity';
import { Passenger } from './passenger.entity';

@Entity('trip_groups')
@Index(['tripId'])
export class TripGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tripId: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ length: 100 })
  groupName: string;

  @Column({ length: 200 })
  groupDescription: string;

  @Column({ length: 10 })
  originCountryCode: string;

  @Column({ type: 'bigint', nullable: true })
  originIlCode: number;

  @Column({ type: 'bigint', nullable: true })
  originIlceCode: number;

  @Column({ length: 200, nullable: true })
  originPlace: string;

  @Column({ length: 10 })
  destCountryCode: string;

  @Column({ type: 'bigint', nullable: true })
  destIlCode: number;

  @Column({ type: 'bigint', nullable: true })
  destIlceCode: number;

  @Column({ length: 200, nullable: true })
  destPlace: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  groupFee: number;

  @Column({ type: 'bigint', nullable: true })
  uetdsGrupRefNo: number;

  @Column({ length: 20, default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Trip, (trip) => trip.groups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @OneToMany(() => Passenger, (passenger) => passenger.tripGroup, {
    cascade: true,
  })
  passengers: Passenger[];
}
