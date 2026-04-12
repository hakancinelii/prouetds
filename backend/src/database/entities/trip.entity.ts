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
import type { Tenant } from './tenant.entity';
import type { Vehicle } from './vehicle.entity';
import type { TripGroup } from './trip-group.entity';
import type { TripPersonnel } from './trip-personnel.entity';
import type { User } from './user.entity';
const getTenantEntity = () => require('./tenant.entity').Tenant;
const getVehicleEntity = () => require('./vehicle.entity').Vehicle;
const getTripGroupEntity = () => require('./trip-group.entity').TripGroup;
const getTripPersonnelEntity = () => require('./trip-personnel.entity').TripPersonnel;
const getUserEntity = () => require('./user.entity').User;

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

  @ManyToOne(getTenantEntity, (tenant: any) => tenant.trips)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @ManyToOne(getVehicleEntity, { nullable: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle!: Vehicle;

  @ManyToOne(getUserEntity, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @OneToMany(getTripGroupEntity, (group: any) => group.trip, { cascade: true })
  groups!: TripGroup[];

  @OneToMany(getTripPersonnelEntity, (personnel: any) => personnel.trip, {
    cascade: true,
  })
  personnel!: TripPersonnel[];
}
