import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Vehicle } from './vehicle.entity';
import { TripGroup } from './trip-group.entity';
import { TripPersonnel } from './trip-personnel.entity';
import { User } from './user.entity';

export enum TripStatus {
  DRAFT = 'draft',
  READY = 'ready',
  SENDING = 'sending',
  SENT = 'sent',
  ERROR = 'error',
  CANCELLED = 'cancelled',
}

@Entity('trips')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'departureDate'])
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ length: 50, nullable: true })
  firmTripNumber!: string;

  @Column({ length: 20 })
  vehiclePlate!: string;

  @Column({ type: 'uuid', nullable: true })
  vehicleId!: string;

  @Column({ type: 'date' })
  departureDate!: string;

  @Column({ length: 10 })
  departureTime!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ length: 10 })
  endTime!: string;

  @Column({ length: 400, nullable: true })
  description!: string;

  @Column({ length: 20, nullable: true })
  vehiclePhone!: string;

  @Column({ type: 'bigint', nullable: true })
  originIlCode!: number;

  @Column({ type: 'bigint', nullable: true })
  originIlceCode!: number;

  @Column({ type: 'bigint', nullable: true })
  destIlCode!: number;

  @Column({ type: 'bigint', nullable: true })
  destIlceCode!: number;

  @Column({ length: 200, nullable: true })
  originPlace!: string;

  @Column({ length: 200, nullable: true })
  destPlace!: string;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.DRAFT,
  })
  status!: TripStatus;

  @Column({ type: 'bigint', nullable: true })
  uetdsSeferRefNo!: number;

  @Column({ type: 'text', nullable: true })
  uetdsErrorMessage!: string;

  @Column({ type: 'timestamp', nullable: true })
  uetdsSentAt!: Date;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.trips)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(() => Vehicle, { nullable: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle!: Vehicle;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @OneToMany(() => TripGroup, (group) => group.trip, { cascade: true })
  groups!: TripGroup[];

  @OneToMany(() => TripPersonnel, (personnel) => personnel.trip, {
    cascade: true,
  })
  personnel!: TripPersonnel[];
}
