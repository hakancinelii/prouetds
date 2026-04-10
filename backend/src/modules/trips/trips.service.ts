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

  private buildLocationText(
    ilCode?: number | null,
    ilceCode?: number | null,
    explicitPlace?: string | null,
  ) {
    const place = explicitPlace?.trim();
    if (place) return place;

    const il = ilCode ? String(ilCode) : '';
    const ilce = ilceCode ? String(ilceCode) : '';

    if (il && ilce) return `${ilce}/${il}`;
    return ilce || il || 'Merkez';
  }

  private sanitizeMernisCode(value?: number | null) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return undefined;
    }

    const normalized = Math.trunc(value);
    if (normalized <= 0) {
      return undefined;
    }

    return normalized;
  }

  private buildGroupPayload(group: TripGroup) {
    const baslangicIl = this.sanitizeMernisCode(group.originIlCode);
    const baslangicIlce = this.sanitizeMernisCode(group.originIlceCode);
    const bitisIl = this.sanitizeMernisCode(group.destIlCode);
    const bitisIlce = this.sanitizeMernisCode(group.destIlceCode);

    if (!baslangicIl || !baslangicIlce || !bitisIl || !bitisIlce) {
      throw new BadRequestException(
        'UETDS grup gönderimi için geçerli MERNİS il ve ilçe kodları zorunludur.',
      );
    }

    return {
      grupAdi: group.groupName,
      grupAciklama: this.buildGroupDescription(group),
      baslangicUlke: group.originCountryCode,
      baslangicIl,
      baslangicIlce,
      baslangicYer: this.buildLocationText(
        baslangicIl,
        baslangicIlce,
        group.originPlace,
      ),
      bitisUlke: group.destCountryCode,
      bitisIl,
      bitisIlce,
      bitisYer: this.buildLocationText(bitisIl, bitisIlce, group.destPlace),
      grupUcret: String(group.groupFee || '0'),
    };
  }

  private buildGroupDescription(group: TripGroup) {
    return group.groupDescription?.trim() || `${group.groupName} grubu`;
  }

  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(TripGroup) private groupRepo: Repository<TripGroup>,
    @InjectRepository(TripPersonnel) private personnelRepo: Repository<TripPersonnel>,
    @InjectRepository(Passenger) private passengerRepo: Repository<Passenger>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    private uetdsService: UetdsService,
  ) { }

  async findAll(tenantId: string, query: any = {}) {
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;

    const qb = this.tripRepo
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.groups', 'groups')
      .leftJoinAndSelect('groups.passengers', 'passengers')
      .leftJoinAndSelect('trip.personnel', 'personnel')
      .where('trip.tenantId = :tenantId', { tenantId });

    if (query.status) {
      qb.andWhere('trip.status = :status', { status: query.status });
    }
    if (query.fromDate) {
      qb.andWhere('trip.departureDate >= :fromDate', { fromDate: query.fromDate });
    }
    if (query.toDate) {
      qb.andWhere('trip.departureDate <= :toDate', { toDate: query.toDate });
    }
    if (query.search?.trim()) {
      qb.andWhere(
        '(trip.firmTripNumber ILIKE :search OR trip.vehiclePlate ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('trip.createdAt', 'DESC').skip((page - 1) * limit).take(limit);

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
    const tripData = data as Partial<Trip> & {
      originPlace?: string;
      destPlace?: string;
    };

    const normalizedVehiclePlate = (tripData.vehiclePlate || '')
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');

    if (!normalizedVehiclePlate) {
      throw new BadRequestException('Araç plakası zorunludur');
    }

    const trip = this.tripRepo.create({
      ...tripData,
      vehiclePlate: normalizedVehiclePlate,
      tenantId,
      createdById: userId,
      status: TripStatus.DRAFT,
    });

    const savedTrip = await this.tripRepo.save(trip);

    // Her yeni seferde otomatik bir varsayılan grup oluşturalım
    await this.addGroup(savedTrip.id, tenantId, {
      groupName: 'Genel Yolcular',
      groupDescription: 'Varsayılan Grup',
      originCountryCode: 'TR',
      originIlCode: savedTrip.originIlCode,
      originIlceCode: savedTrip.originIlceCode,
      originPlace: this.buildLocationText(
        savedTrip.originIlCode,
        savedTrip.originIlceCode,
        (savedTrip as any).originPlace,
      ),
      destCountryCode: 'TR',
      destIlCode: savedTrip.destIlCode,
      destIlceCode: savedTrip.destIlceCode,
      destPlace: this.buildLocationText(
        savedTrip.destIlCode,
        savedTrip.destIlceCode,
        (savedTrip as any).destPlace,
      ),
      groupFee: 0,
    });

    return savedTrip;
  }

  async update(id: string, tenantId: string, data: Partial<Trip>) {
    const tripData = data as Partial<Trip> & {
      originPlace?: string;
      destPlace?: string;
    };
    const trip = await this.findOne(id, tenantId);
    if (trip.status === TripStatus.SENT) {
      throw new BadRequestException(
        "UETDS'ye gönderilmiş sefer düzenlenemez. Önce iptal edin.",
      );
    }

    if (typeof tripData.vehiclePlate === 'string') {
      tripData.vehiclePlate = tripData.vehiclePlate
        .trim()
        .toUpperCase()
        .replace(/\s+/g, '');
    }

    Object.assign(trip, tripData);
    const savedTrip = await this.tripRepo.save(trip);

    const defaultGroup = savedTrip.groups?.find(
      (group) => group.groupName === 'Genel Yolcular',
    );

    if (defaultGroup) {
      await this.groupRepo.update(defaultGroup.id, {
        originCountryCode: 'TR',
        originIlCode: savedTrip.originIlCode,
        originIlceCode: savedTrip.originIlceCode,
        originPlace: this.buildLocationText(
          savedTrip.originIlCode,
          savedTrip.originIlceCode,
          (savedTrip as any).originPlace,
        ),
        destCountryCode: 'TR',
        destIlCode: savedTrip.destIlCode,
        destIlceCode: savedTrip.destIlceCode,
        destPlace: this.buildLocationText(
          savedTrip.destIlCode,
          savedTrip.destIlceCode,
          (savedTrip as any).destPlace,
        ),
      });
    }

    return this.findOne(id, tenantId);
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
          this.buildGroupPayload(group),
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
      const personnelResults: Array<{
        personId: string;
        fullName: string;
        success: boolean;
        message: string;
      }> = [];

      for (const person of trip.personnel) {
        const personelResult = await this.uetdsService.personelEkle(
          username,
          password,
          tenantId,
          tripId,
          seferRefNo,
          {
            turKodu: Number(person.personnelType ?? 0),
            uyrukUlke: (person.nationalityCode || 'TR').trim().toUpperCase(),
            tcKimlikPasaportno: person.tcPassportNo,
            cinsiyet: (person.gender || 'E').trim().toUpperCase(),
            adi: person.firstName,
            soyadi: person.lastName,
            telefon: person.phone,
            adres: person.address,
          },
          environment,
        );

        const personnelSuccess =
          personelResult?.sonucKodu === undefined || personelResult.sonucKodu === 0;

        personnelResults.push({
          personId: person.id,
          fullName: `${person.firstName} ${person.lastName}`.trim(),
          success: personnelSuccess,
          message: personelResult?.sonucMesaji || '',
        });

        if (!personnelSuccess) {
          throw new Error(`personelEkle failed: ${personelResult.sonucMesaji}`);
        }
      }

      // STEP 4: Add passengers per group (batch)
      this.logger.log(`[UETDS] Step 4: yolcuEkleCoklu`);
      const passengerBatchResults: Array<{
        groupId: string;
        groupName: string;
        expected: number;
        successCount: number;
        failed: Array<{ index: number; name: string; message: string }>;
      }> = [];

      for (const group of trip.groups) {
        if (!group.passengers || group.passengers.length === 0) continue;

        if (!group.uetdsGrupRefNo) {
          throw new Error(`Grup referansı oluşmadı: ${group.groupName}`);
        }

        const yolcuBilgileri = group.passengers.map((p) => ({
          grupId: Number(group.uetdsGrupRefNo),
          uyrukUlke: (p.nationalityCode || 'TR').trim().toUpperCase(),
          cinsiyet: (p.gender || 'E').trim().toUpperCase(),
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

        if (yolcuResult?.sonucKodu !== undefined && ![0, 88].includes(yolcuResult.sonucKodu)) {
          throw new Error(`yolcuEkleCoklu failed: ${yolcuResult.sonucMesaji}`);
        }

        const individualResults = Array.isArray(yolcuResult?.uetdsYolcuSonuc)
          ? yolcuResult.uetdsYolcuSonuc
          : [];

        const failed: Array<{ index: number; name: string; message: string }> = [];
        let successCount = 0;

        for (const [index, passenger] of group.passengers.entries()) {
          const sonuc = individualResults.find((item) => item.sira === index + 1);
          if (sonuc && sonuc.sonucKodu === 0) {
            successCount += 1;
            await this.passengerRepo.update(passenger.id, {
              uetdsYolcuRefNo: sonuc.uetdsBiletRefNo,
            });
            continue;
          }

          failed.push({
            index: index + 1,
            name: `${passenger.firstName} ${passenger.lastName}`.trim(),
            message:
              sonuc?.sonucMesaji ||
              yolcuResult?.sonucMesaji ||
              'Yolcu sonucu dönmedi',
          });
        }

        passengerBatchResults.push({
          groupId: group.id,
          groupName: group.groupName,
          expected: group.passengers.length,
          successCount,
          failed,
        });

        if (successCount !== group.passengers.length) {
          throw new Error(
            `yolcuEkleCoklu incomplete for ${group.groupName}: ${successCount}/${group.passengers.length} başarılı`,
          );
        }
      }

      // STEP 5: Verify with bildirimOzeti
      const passengerSummary = passengerBatchResults
        .map(
          (result) =>
            `${result.groupName}: ${result.successCount}/${result.expected} yolcu`,
        )
        .join(' | ');
      const personnelSummary = `${personnelResults.filter((item) => item.success).length}/${personnelResults.length} personel`;
      this.logger.log(`[UETDS] Validation snapshot -> ${personnelSummary}; ${passengerSummary}`);

      // STEP 5: Verify with bildirimOzeti
      this.logger.log(`[UETDS] Step 5: bildirimOzeti`);
      let ozet: any = null;
      try {
        ozet = await this.uetdsService.bildirimOzeti(
          username,
          password,
          tenantId,
          tripId,
          seferRefNo,
          environment,
        );
      } catch (summaryError) {
        const summaryMessage =
          summaryError instanceof Error ? summaryError.message : String(summaryError);
        this.logger.warn(
          `[UETDS] bildirimOzeti warning for trip ${tripId}: ${summaryMessage}`,
        );
      }

      // Update trip as SENT
      await this.tripRepo.update(tripId, {
        status: TripStatus.SENT,
        uetdsSeferRefNo: seferRefNo,
        uetdsSentAt: new Date(),
        uetdsErrorMessage: '',
      });

      return {
        success: true,
        uetdsSeferRefNo: seferRefNo,
        summary: ozet,
        personnelSummary: personnelResults,
        passengerSummary: passengerBatchResults,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`UETDS send failed for trip ${tripId}: ${errorMessage}`);
      await this.tripRepo.update(tripId, {
        status: TripStatus.ERROR,
        uetdsErrorMessage: errorMessage,
      });

      throw new BadRequestException({
        message: 'UETDS gönderimi başarısız',
        details: errorMessage,
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
