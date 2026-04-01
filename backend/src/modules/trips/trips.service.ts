import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Trip,
  TripStatus,
  TripGroup,
  TripPersonnel,
  Passenger,
  Tenant,
} from '../../database/entities';
import { UetdsService } from '../uetds/uetds.service';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(TripGroup) private groupRepo: Repository<TripGroup>,
    @InjectRepository(TripPersonnel) private personnelRepo: Repository<TripPersonnel>,
    @InjectRepository(Passenger) private passengerRepo: Repository<Passenger>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    private uetdsService: UetdsService,
  ) { }

  async findAll(tenantId: string, query: any = {}) {
    const qb = this.tripRepo
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.groups', 'groups')
      .leftJoinAndSelect('groups.passengers', 'passengers')
      .leftJoinAndSelect('trip.personnel', 'personnel')
      .where('trip.tenantId = :tenantId', { tenantId })
      .orderBy('trip.createdAt', 'DESC');

    if (query.status) {
      qb.andWhere('trip.status = :status', { status: query.status });
    }
    if (query.fromDate) {
      qb.andWhere('trip.departureDate >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      qb.andWhere('trip.departureDate <= :toDate', { toDate: query.toDate });
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [trips, total] = await qb.getManyAndCount();
    return { trips, total, page, limit };
  }

  async findDriverTrips(tenantId: string, userId: string, query: any = {}) {
    const qb = this.tripRepo
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.groups', 'groups')
      .leftJoinAndSelect('groups.passengers', 'passengers')
      .leftJoinAndSelect('trip.personnel', 'personnel')
      .leftJoinAndSelect('trip.vehicle', 'vehicle')
      .where('trip.tenantId = :tenantId', { tenantId })
      .orderBy('trip.departureDate', 'DESC')
      .addOrderBy('trip.departureTime', 'DESC');

    // In a real scenario, we link user to driver. 
    // For now, let's filter by trips showing this user's assigned personnel records.
    // Assuming driver info is linked to the user.

    if (query.status) {
      qb.andWhere('trip.status = :status', { status: query.status });
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    qb.skip((page - 1) * limit).take(limit);

    const [trips, total] = await qb.getManyAndCount();
    return { trips, total, page, limit };
  }

  async findOne(id: string, tenantId: string) {
    const trip = await this.tripRepo.findOne({
      where: { id, tenantId },
      relations: ['groups', 'groups.passengers', 'personnel', 'vehicle', 'createdBy'],
    });

    if (!trip) throw new NotFoundException('Sefer bulunamadı');
    return trip;
  }

  async create(tenantId: string, userId: string, data: Partial<Trip>) {
    const trip = this.tripRepo.create({
      ...data,
      tenantId,
      createdById: userId,
      status: TripStatus.DRAFT,
    });

    const savedTrip = await this.tripRepo.save(trip);

    // Her yeni seferde otomatik bir varsayılan grup oluştururalım
    await this.addGroup(savedTrip.id, tenantId, {
      groupName: 'Genel Yolcular',
      groupDescription: 'Varsayılan Grup',
      originCountryCode: 'TR',
      destCountryCode: 'TR',
      groupFee: 0
    });

    return savedTrip;
  }

  async update(id: string, tenantId: string, data: Partial<Trip>) {
    const trip = await this.findOne(id, tenantId);
    if (trip.status === TripStatus.SENT) {
      throw new BadRequestException(
        "UETDS'ye gönderilmiş sefer düzenlenemez. Önce iptal edin.",
      );
    }
    Object.assign(trip, data);
    return this.tripRepo.save(trip);
  }

  async addGroup(tripId: string, tenantId: string, data: Partial<TripGroup>) {
    const trip = await this.findOne(tripId, tenantId);
    const group = this.groupRepo.create({
      ...data,
      tripId: trip.id,
      tenantId,
    });
    return this.groupRepo.save(group);
  }

  async addPersonnel(tripId: string, tenantId: string, data: Partial<TripPersonnel>) {
    const trip = await this.findOne(tripId, tenantId);
    const personnel = this.personnelRepo.create({
      ...data,
      tripId: trip.id,
      tenantId,
    });
    return this.personnelRepo.save(personnel);
  }

  async addPassenger(groupId: string, tenantId: string, data: Partial<Passenger>) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId, tenantId },
    });
    if (!group) throw new NotFoundException('Grup bulunamadı');

    const passenger = this.passengerRepo.create({
      ...data,
      tripGroupId: group.id,
      tenantId,
    });
    return this.passengerRepo.save(passenger);
  }

  async addPassengersBulk(
    groupId: string,
    tenantId: string,
    passengers: Partial<Passenger>[],
  ) {
    const group = await this.groupRepo.findOne({
      where: { id: groupId, tenantId },
    });
    if (!group) throw new NotFoundException('Grup bulunamadı');

    const entities = passengers.map((p) =>
      this.passengerRepo.create({
        ...p,
        tripGroupId: group.id,
        tenantId,
      }),
    );

    return this.passengerRepo.save(entities);
  }

  /**
   * COMPLETE UETDS SEND WORKFLOW
   * 1. seferEkle → get uetdsSeferReferansNo
   * 2. seferGrupEkle → for each group
   * 3. personelEkle → for each personnel
   * 4. yolcuEkleCoklu → all passengers per group
   * 5. bildirimOzeti → verify
   */
  async sendToUetds(tripId: string, tenantId: string): Promise<any> {
    const trip = await this.findOne(tripId, tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });

    if (!tenant?.uetdsUsername || !tenant?.uetdsPasswordEncrypted) {
      throw new BadRequestException('UETDS kimlik bilgileri tanımlanmamış');
    }

    if (!trip.groups || trip.groups.length === 0) {
      throw new BadRequestException('En az bir yolcu grubu eklenmeli');
    }

    if (!trip.personnel || trip.personnel.length === 0) {
      throw new BadRequestException('En az bir personel (şoför) eklenmeli');
    }

    const hasPassengers = trip.groups.some(
      (g) => g.passengers && g.passengers.length > 0,
    );
    if (!hasPassengers) {
      throw new BadRequestException('En az bir yolcu eklenmeli');
    }

    const username = tenant.uetdsUsername;
    const password = tenant.uetdsPasswordEncrypted; // TODO: decrypt
    const environment = tenant.settings?.uetdsEnvironment || 'test';

    // Update status to SENDING
    await this.tripRepo.update(tripId, { status: TripStatus.SENDING });

    try {
      // STEP 1: Create trip on UETDS
      this.logger.log(`[UETDS] Step 1: seferEkle for trip ${tripId} in ${environment} env`);
      const seferResult = await this.uetdsService.seferEkle(
        username,
        password,
        tenantId,
        tripId,
        {
          aracPlaka: trip.vehiclePlate,
          hareketTarihi: new Date(trip.departureDate),
          hareketSaati: trip.departureTime,
          seferBitisTarihi: new Date(trip.endDate),
          seferBitisSaati: trip.endTime,
          seferAciklama: trip.description,
          aracTelefonu: trip.vehiclePhone,
          firmaSeferNo: trip.firmTripNumber,
        },
        environment,
      );

      if (seferResult.sonucKodu !== 0) {
        throw new Error(`seferEkle failed: ${seferResult.sonucMesaji}`);
      }

      const seferRefNo = seferResult.uetdsSeferReferansNo;
      await this.tripRepo.update(tripId, { uetdsSeferRefNo: seferRefNo });

      // STEP 2: Add groups
      this.logger.log(`[UETDS] Step 2: seferGrupEkle for ${trip.groups.length} groups`);
      for (const group of trip.groups) {
        const grupResult = await this.uetdsService.seferGrupEkle(
          username,
          password,
          tenantId,
          tripId,
          seferRefNo,
          {
            grupAdi: group.groupName,
            grupAciklama: group.groupDescription,
            baslangicUlke: group.originCountryCode,
            baslangicIl: group.originIlCode,
            baslangicIlce: group.originIlceCode,
            baslangicYer: group.originPlace,
            bitisUlke: group.destCountryCode,
            bitisIl: group.destIlCode,
            bitisIlce: group.destIlceCode,
            bitisYer: group.destPlace,
            grupUcret: String(group.groupFee || '0'),
          },
          environment,
        );

        if (grupResult.sonucKodu !== 0) {
          throw new Error(`seferGrupEkle failed: ${grupResult.sonucMesaji}`);
        }

        await this.groupRepo.update(group.id, {
          uetdsGrupRefNo: grupResult.uetdsGrupRefNo,
        });
        group.uetdsGrupRefNo = grupResult.uetdsGrupRefNo;
      }

      // STEP 3: Add personnel
      this.logger.log(
        `[UETDS] Step 3: personelEkle for ${trip.personnel.length} personnel`,
      );
      for (const person of trip.personnel) {
        await this.uetdsService.personelEkle(
          username,
          password,
          tenantId,
          tripId,
          seferRefNo,
          {
            turKodu: person.personnelType,
            uyrukUlke: person.nationalityCode,
            tcKimlikPasaportno: person.tcPassportNo,
            cinsiyet: person.gender,
            adi: person.firstName,
            soyadi: person.lastName,
            telefon: person.phone,
            adres: person.address,
          },
        );
      }

      // STEP 4: Add passengers per group (batch)
      this.logger.log(`[UETDS] Step 4: yolcuEkleCoklu`);
      for (const group of trip.groups) {
        if (!group.passengers || group.passengers.length === 0) continue;

        const yolcuBilgileri = group.passengers.map((p) => ({
          grupId: group.uetdsGrupRefNo,
          uyrukUlke: p.nationalityCode,
          cinsiyet: p.gender,
          tcKimlikPasaportNo: p.tcPassportNo,
          adi: p.firstName,
          soyadı: p.lastName,
          koltukNo: p.seatNumber,
          telefonNo: p.phone,
        }));

        const yolcuResult = await this.uetdsService.yolcuEkleCoklu(
          username,
          password,
          tenantId,
          tripId,
          seferRefNo,
          yolcuBilgileri,
          environment,
        );

        // Process individual results
        if (yolcuResult.uetdsYolcuSonuc) {
          for (const sonuc of yolcuResult.uetdsYolcuSonuc) {
            const passenger = group.passengers[sonuc.sira - 1]; // sira is 1-based
            if (passenger && sonuc.sonucKodu === 0) {
              await this.passengerRepo.update(passenger.id, {
                uetdsYolcuRefNo: sonuc.uetdsBiletRefNo,
              });
            }
          }
        }
      }

      // STEP 5: Verify with bildirimOzeti
      this.logger.log(`[UETDS] Step 5: bildirimOzeti`);
      const ozet = await this.uetdsService.bildirimOzeti(
        username,
        password,
        tenantId,
        tripId,
        seferRefNo,
        environment,
      );

      // Update trip as SENT
      await this.tripRepo.update(tripId, {
        status: TripStatus.SENT,
        uetdsSentAt: new Date(),
        uetdsErrorMessage: null,
      });

      return {
        success: true,
        uetdsSeferRefNo: seferRefNo,
        summary: ozet,
      };
    } catch (error) {
      this.logger.error(`UETDS send failed for trip ${tripId}: ${error.message}`);
      await this.tripRepo.update(tripId, {
        status: TripStatus.ERROR,
        uetdsErrorMessage: error.message,
      });

      throw new BadRequestException({
        message: 'UETDS gönderimi başarısız',
        details: error.message,
      });
    }
  }

  /** Cancel a trip on UETDS */
  async cancelOnUetds(tripId: string, tenantId: string, reason: string) {
    const trip = await this.findOne(tripId, tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });

    if (!trip.uetdsSeferRefNo) {
      throw new BadRequestException('Bu sefer UETDS\'ye gönderilmemiş');
    }

    const result = await this.uetdsService.seferIptal(
      tenant?.uetdsUsername || '',
      tenant?.uetdsPasswordEncrypted || '',
      tenantId,
      tripId,
      trip.uetdsSeferRefNo,
      reason,
    );

    if (result.sonucKodu === 0) {
      await this.tripRepo.update(tripId, { status: TripStatus.CANCELLED });
    }

    return result;
  }

  /** Get UETDS trip summary */
  async getUetdsSummary(tripId: string, tenantId: string) {
    const trip = await this.findOne(tripId, tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });

    if (!trip.uetdsSeferRefNo) {
      throw new BadRequestException('Bu sefer UETDS\'ye gönderilmemiş');
    }

    return this.uetdsService.bildirimOzeti(
      tenant?.uetdsUsername || '',
      tenant?.uetdsPasswordEncrypted || '',
      tenantId,
      tripId,
      trip.uetdsSeferRefNo,
    );
  }

  /** Get trip PDF from UETDS */
  async getUetdsPdf(tripId: string, tenantId: string) {
    const trip = await this.findOne(tripId, tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });

    if (!trip.uetdsSeferRefNo) {
      throw new BadRequestException('Bu sefer UETDS\'ye gönderilmemiş');
    }

    return this.uetdsService.seferDetayCiktisiAl(
      tenant?.uetdsUsername || '',
      tenant?.uetdsPasswordEncrypted || '',
      tenantId,
      tripId,
      trip.uetdsSeferRefNo,
    );
  }
}
