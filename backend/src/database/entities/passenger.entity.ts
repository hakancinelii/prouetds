import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TripGroup } from './trip-group.entity';

export enum PassengerSource {
  MANUAL = 'manual',
  TEXT_PARSER = 'text_parser',
  OCR = 'ocr',
  EXCEL = 'excel',
  CRM = 'crm',
}

@Entity('passengers')
@Index(['tenantId', 'tripGroupId'])
export class Passenger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tripGroupId: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ length: 50 })
  firstName: string;

  @Column({ length: 50 })
  lastName: string;

  @Column({ length: 30 })
  tcPassportNo: string;

  @Column({ length: 10 })
  nationalityCode: string;

  @Column({ length: 5, nullable: true })
  gender: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 10, nullable: true })
  seatNumber: string;

  @Column({ type: 'bigint', nullable: true })
  uetdsYolcuRefNo: number;

  @Column({ length: 20, default: 'active' })
  status: string;

  @Column({
    type: 'enum',
    enum: PassengerSource,
    default: PassengerSource.MANUAL,
  })
  source: PassengerSource;

  @Column({ type: 'jsonb', nullable: true })
  rawOcrData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => TripGroup, (group) => group.passengers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tripGroupId' })
  tripGroup: TripGroup;
}
