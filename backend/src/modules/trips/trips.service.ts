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

  private sanitizeMernisCode(value?: number | string | null) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const numericValue =
      typeof value === 'string' ? Number.parseInt(value, 10) : value;

    if (typeof numericValue !== 'number' || !Number.isFinite(numericValue)) {
      return undefined;
    }

    const normalized = Math.trunc(numericValue);
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
        `${group.groupName} için geçerli MERNİS il ve ilçe kodları zorunludur.`,
      );
    }

    const normalizedFee = Number(group.groupFee || 0);
    if (!Number.isFinite(normalizedFee) || normalizedFee <= 0) {
      throw new BadRequestException(
        `${group.groupName} için grup ücreti 0'dan büyük olmalıdır.`,
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
      grupUcret: String(normalizedFee),
    };
  }

  private mergeTripLocationIntoGroup(group: TripGroup, trip: Trip) {
    const nextOriginIlCode = group.originIlCode ?? trip.originIlCode;
    const nextOriginIlceCode = group.originIlceCode ?? trip.originIlceCode;
    const nextDestIlCode = group.destIlCode ?? trip.destIlCode;
    const nextDestIlceCode = group.destIlceCode ?? trip.destIlceCode;
    const nextOriginPlace = group.originPlace?.trim() || trip.originPlace;
    const nextDestPlace = group.destPlace?.trim() || trip.destPlace;

    group.originCountryCode = group.originCountryCode || 'TR';
    group.destCountryCode = group.destCountryCode || 'TR';
    group.originIlCode = nextOriginIlCode;
    group.originIlceCode = nextOriginIlceCode;
    group.destIlCode = nextDestIlCode;
    group.destIlceCode = nextDestIlceCode;
    group.originPlace = nextOriginPlace;
    group.destPlace = nextDestPlace;

    return {
      originCountryCode: group.originCountryCode,
      originIlCode: nextOriginIlCode,
      originIlceCode: nextOriginIlceCode,
      originPlace: nextOriginPlace,
      destCountryCode: group.destCountryCode,
      destIlCode: nextDestIlCode,
      destIlceCode: nextDestIlceCode,
      destPlace: nextDestPlace,
    };
  }

  private ensureGroupsReadyForUetds(trip: Trip) {
    return trip.groups.map((group) => ({
      group,
      updates: this.mergeTripLocationIntoGroup(group, trip),
    }));
  }

  private validateTripForUetds(trip: Trip) {
    const originIl = this.sanitizeMernisCode(trip.originIlCode);
    const originIlce = this.sanitizeMernisCode(trip.originIlceCode);
    const destIl = this.sanitizeMernisCode(trip.destIlCode);
    const destIlce = this.sanitizeMernisCode(trip.destIlceCode);

    this.logger.warn(
      `[UETDS][DEBUG] trip raw=${JSON.stringify({
        originIlCode: trip.originIlCode,
        originIlceCode: trip.originIlceCode,
        destIlCode: trip.destIlCode,
        destIlceCode: trip.destIlceCode,
      })} normalized=${JSON.stringify({
        originIl,
        originIlce,
        destIl,
        destIlce,
      })}`,
    );

    if (!originIl || !originIlce || !destIl || !destIlce) {
      throw new BadRequestException(
        'Sefer gönderimi için kalkış ve varışta geçerli MERNİS il ve ilçe kodları zorunludur.',
      );
    }
  }

  private buildDefaultGroupData(trip: Trip) {
    return {
      groupName: '1. Grup',
      groupDescription: trip.description?.trim() || 'Transfer',
      originCountryCode: 'TR',
      originIlCode: trip.originIlCode,
      originIlceCode: trip.originIlceCode,
      originPlace: this.buildLocationText(
        trip.originIlCode,
        trip.originIlceCode,
        trip.originPlace,
      ),
      destCountryCode: 'TR',
      destIlCode: trip.destIlCode,
      destIlceCode: trip.destIlceCode,
      destPlace: this.buildLocationText(
        trip.destIlCode,
        trip.destIlceCode,
        trip.destPlace,
      ),
      groupFee: 500,
    };
  }

  private getTripDetailRedirectError(tripId: string) {
    return new BadRequestException({
      message: 'UETDS gönderimi başarısız',
      details: `Lütfen sefer detayında kalkış/varış ilçe kodlarını ve grup ücretini kontrol edin. Sefer: ${tripId}`,
    });
  }

  private normalizeTripData(tripData: Partial<Trip> & { originPlace?: string; destPlace?: string }) {
    return {
      ...tripData,
      originPlace: tripData.originPlace?.trim(),
      destPlace: tripData.destPlace?.trim(),
    };
  }

  private normalizeGroupInput(data: Partial<TripGroup>) {
    return {
      ...data,
      originPlace: data.originPlace?.trim(),
      destPlace: data.destPlace?.trim(),
      groupDescription: data.groupDescription?.trim(),
      groupName: data.groupName?.trim(),
      groupFee:
        data.groupFee !== undefined && data.groupFee !== null
          ? Number(data.groupFee)
          : data.groupFee,
    };
  }

  private buildLocationValidationMessage(fieldLabel: string) {
    return `${fieldLabel} zorunludur ve gerçek MERNİS ilçe / havalimanı kodu içermelidir.`;
  }

  private validateTripInput(tripData: Partial<Trip> & { originPlace?: string; destPlace?: string }) {
    const originIl = this.sanitizeMernisCode(tripData.originIlCode);
    const originIlce = this.sanitizeMernisCode(tripData.originIlceCode);
    const destIl = this.sanitizeMernisCode(tripData.destIlCode);
    const destIlce = this.sanitizeMernisCode(tripData.destIlceCode);

    if (!originIl) {
      throw new BadRequestException(this.buildLocationValidationMessage('Kalkış ili'));
    }
    if (!originIlce) {
      throw new BadRequestException(this.buildLocationValidationMessage('Kalkış ilçesi'));
    }
    if (!destIl) {
      throw new BadRequestException(this.buildLocationValidationMessage('Varış ili'));
    }
    if (!destIlce) {
      throw new BadRequestException(this.buildLocationValidationMessage('Varış ilçesi'));
    }
  }

  private validateGroupInput(data: Partial<TripGroup>) {
    const originIl = this.sanitizeMernisCode(data.originIlCode);
    const originIlce = this.sanitizeMernisCode(data.originIlceCode);
    const destIl = this.sanitizeMernisCode(data.destIlCode);
    const destIlce = this.sanitizeMernisCode(data.destIlceCode);
    const groupFee = data.groupFee !== undefined && data.groupFee !== null
      ? Number(data.groupFee)
      : undefined;

    this.logger.warn(
      `[UETDS][DEBUG] group raw=${JSON.stringify({
        groupName: data.groupName,
        originIlCode: data.originIlCode,
        originIlceCode: data.originIlceCode,
        destIlCode: data.destIlCode,
        destIlceCode: data.destIlceCode,
        originPlace: data.originPlace,
        destPlace: data.destPlace,
        groupFee: data.groupFee,
      })} normalized=${JSON.stringify({
        groupName: data.groupName,
        originIl,
        originIlce,
        destIl,
        destIlce,
        groupFee,
      })}`,
    );

    if (!originIl) {
      throw new BadRequestException(this.buildLocationValidationMessage('Grup kalkış ili'));
    }
    if (!originIlce) {
      throw new BadRequestException(this.buildLocationValidationMessage('Grup kalkış ilçesi'));
    }
    if (!destIl) {
      throw new BadRequestException(this.buildLocationValidationMessage('Grup varış ili'));
    }
    if (!destIlce) {
      throw new BadRequestException(this.buildLocationValidationMessage('Grup varış ilçesi'));
    }
    if (!groupFee || groupFee <= 0) {
      throw new BadRequestException('Grup ücreti 0\'dan büyük olmalıdır.');
    }
  }

  private async persistPreparedGroups(preparedGroups: Array<{ group: TripGroup; updates: Partial<TripGroup> }>) {
    for (const { group, updates } of preparedGroups) {
      await this.groupRepo.update(group.id, updates);
      Object.assign(group, updates);
    }
  }

  private async prepareTripForUetds(trip: Trip) {
    this.validateTripForUetds(trip);
    const preparedGroups = this.ensureGroupsReadyForUetds(trip);
    await this.persistPreparedGroups(preparedGroups);
    this.logger.warn(
      `[UETDS][DEBUG] prepared groups=${JSON.stringify(
        preparedGroups.map(({ group, updates }) => ({
          groupId: group.id,
          groupName: group.groupName,
          tripOriginIlCode: trip.originIlCode,
          tripOriginIlceCode: trip.originIlceCode,
          tripDestIlCode: trip.destIlCode,
          tripDestIlceCode: trip.destIlceCode,
          groupOriginIlCode: group.originIlCode,
          groupOriginIlceCode: group.originIlceCode,
          groupDestIlCode: group.destIlCode,
          groupDestIlceCode: group.destIlceCode,
          updates,
        })),
      )}`,
    );
    return preparedGroups.map(({ group }) => group);
  }

  private buildCreateDefaultGroupPayload(savedTrip: Trip) {
    return this.buildDefaultGroupData(savedTrip);
  }

  private getReadableGroupName(group: Partial<TripGroup>) {
    return group.groupName?.trim() || 'Grup';
  }

  private ensureGroupHasMeaningfulDescription(group: Partial<TripGroup>, trip?: Partial<Trip>) {
    const description = group.groupDescription?.trim() || trip?.description?.trim() || 'Transfer';
    return description;
  }

  private ensureGroupHasMeaningfulName(group: Partial<TripGroup>) {
    return group.groupName?.trim() || '1. Grup';
  }

  private ensureGroupFee(group: Partial<TripGroup>) {
    const fee = group.groupFee !== undefined && group.groupFee !== null
      ? Number(group.groupFee)
      : 500;
    return fee > 0 ? fee : 500;
  }

  private normalizeDefaultGroup(savedTrip: Trip) {
    return {
      ...this.buildCreateDefaultGroupPayload(savedTrip),
      groupName: this.ensureGroupHasMeaningfulName({ groupName: '1. Grup' }),
      groupDescription: this.ensureGroupHasMeaningfulDescription({}, savedTrip),
      groupFee: this.ensureGroupFee({ groupFee: 500 }),
    };
  }

  private normalizeExistingDefaultGroup(group: TripGroup, savedTrip: Trip) {
    return {
      originCountryCode: 'TR',
      originIlCode: savedTrip.originIlCode,
      originIlceCode: savedTrip.originIlceCode,
      originPlace: this.buildLocationText(
        savedTrip.originIlCode,
        savedTrip.originIlceCode,
        savedTrip.originPlace,
      ),
      destCountryCode: 'TR',
      destIlCode: savedTrip.destIlCode,
      destIlceCode: savedTrip.destIlceCode,
      destPlace: this.buildLocationText(
        savedTrip.destIlCode,
        savedTrip.destIlceCode,
        savedTrip.destPlace,
      ),
      groupName: this.ensureGroupHasMeaningfulName(group),
      groupDescription: this.ensureGroupHasMeaningfulDescription(group, savedTrip),
      groupFee: this.ensureGroupFee(group),
    };
  }

  private shouldRefreshDefaultGroup(group: TripGroup) {
    return group.groupName === 'Genel Yolcular' || group.groupName === '1. Grup';
  }

  private updateTripGroupsFromTrip(savedTrip: Trip) {
    const defaultGroup = savedTrip.groups?.find(
      (group) => this.shouldRefreshDefaultGroup(group),
    );

    if (!defaultGroup) return null;

    return this.normalizeExistingDefaultGroup(defaultGroup, savedTrip);
  }

  private getTrimmedVehiclePlate(value?: string | null) {
    return (value || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  private normalizeTripFormData(tripData: Partial<Trip> & { originPlace?: string; destPlace?: string }) {
    return {
      ...this.normalizeTripData(tripData),
      vehiclePlate: this.getTrimmedVehiclePlate(tripData.vehiclePlate),
    };
  }

  private validateVehiclePlate(vehiclePlate: string) {
    if (!vehiclePlate) {
      throw new BadRequestException('Araç plakası zorunludur');
    }
  }

  private validateUetdsGroupBeforeSend(group: TripGroup) {
    this.validateGroupInput(group);
  }

  private async prepareGroupsBeforeSend(trip: Trip) {
    const groups = await this.prepareTripForUetds(trip);
    groups.forEach((group) => this.validateUetdsGroupBeforeSend(group));
    return groups;
  }

  private buildSendFailureFromValidation(error: unknown, tripId: string) {
    if (error instanceof BadRequestException) {
      return error;
    }
    return this.getTripDetailRedirectError(tripId);
  }

  private getNormalizedGroupDescription(savedTrip: Trip) {
    return this.ensureGroupHasMeaningfulDescription({}, savedTrip);
  }

  private getNormalizedDefaultGroupName() {
    return '1. Grup';
  }

  private getDefaultGroupFee() {
    return 500;
  }

  private buildNormalizedDefaultGroup(savedTrip: Trip) {
    return {
      ...this.buildCreateDefaultGroupPayload(savedTrip),
      groupName: this.getNormalizedDefaultGroupName(),
      groupDescription: this.getNormalizedGroupDescription(savedTrip),
      groupFee: this.getDefaultGroupFee(),
    };
  }

  private getUpdatedDefaultGroupPayload(defaultGroup: TripGroup, savedTrip: Trip) {
    return {
      ...this.normalizeExistingDefaultGroup(defaultGroup, savedTrip),
      groupName: this.ensureGroupHasMeaningfulName(defaultGroup),
    };
  }

  private isDefaultGroup(group: TripGroup) {
    return group.groupName === 'Genel Yolcular' || group.groupName === '1. Grup';
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
      relations: ['groups', 'groups.passengers', 'personnel', 'personnel.driver', 'vehicle', 'createdBy'],
    });

    if (!trip) throw new NotFoundException('Sefer bulunamadı');
    return trip;
  }

  async create(tenantId: string, userId: string, data: Partial<Trip>) {
    const tripData = this.normalizeTripFormData(data as Partial<Trip> & {
      originPlace?: string;
      destPlace?: string;
    });

    this.validateVehiclePlate(tripData.vehiclePlate || '');
    this.validateTripInput(tripData);

    const trip = this.tripRepo.create({
      ...tripData,
      vehiclePlate: tripData.vehiclePlate,
      tenantId,
      createdById: userId,
      status: TripStatus.DRAFT,
    });

    const savedTrip = await this.tripRepo.save(trip);

    // Her yeni seferde otomatik bir varsayılan grup oluşturalım
    await this.addGroup(savedTrip.id, tenantId, this.buildNormalizedDefaultGroup(savedTrip));

    return savedTrip;
  }

  async update(id: string, tenantId: string, data: Partial<Trip>) {
    const tripData = this.normalizeTripData(data as Partial<Trip> & {
      originPlace?: string;
      destPlace?: string;
    });
    this.validateTripInput(tripData);
    const trip = await this.findOne(id, tenantId);
    if (trip.status === TripStatus.SENT) {
      throw new BadRequestException(
        "UETDS'ye gönderilmiş sefer düzenlenemez. Önce iptal edin.",
      );
    }

    if (typeof tripData.vehiclePlate === 'string') {
      tripData.vehiclePlate = this.getTrimmedVehiclePlate(tripData.vehiclePlate);
    }

    Object.assign(trip, tripData);
    const savedTrip = await this.tripRepo.save(trip);

    const defaultGroupUpdate = this.updateTripGroupsFromTrip(savedTrip);

    if (defaultGroupUpdate) {
      const defaultGroup = savedTrip.groups?.find(
        (group) => this.shouldRefreshDefaultGroup(group),
      );
      if (defaultGroup) {
        await this.groupRepo.update(defaultGroup.id, defaultGroupUpdate);
      }
    }

    return this.findOne(id, tenantId);
  }

  async addGroup(tripId: string, tenantId: string, data: Partial<TripGroup>) {
    const trip = await this.findOne(tripId, tenantId);
    const groupData = this.normalizeGroupInput(data);
    const mergedGroupData = {
      ...this.mergeTripLocationIntoGroup(groupData as TripGroup, trip),
      ...groupData,
      groupName: this.ensureGroupHasMeaningfulName(groupData),
      groupDescription: this.ensureGroupHasMeaningfulDescription(groupData, trip),
      groupFee: this.ensureGroupFee(groupData),
      originCountryCode: groupData.originCountryCode || 'TR',
      destCountryCode: groupData.destCountryCode || 'TR',
    };
    this.validateGroupInput(mergedGroupData as Partial<TripGroup>);
    const group = this.groupRepo.create({
      ...mergedGroupData,
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

    let groupsForSend: TripGroup[] = [];
    try {
      groupsForSend = await this.prepareGroupsBeforeSend(trip);
    } catch (validationError) {
      throw this.buildSendFailureFromValidation(validationError, tripId);
    }

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
      this.logger.log(`[UETDS] Step 2: seferGrupEkle for ${groupsForSend.length} groups`);
      for (const group of groupsForSend) {
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
        const identityNo =
          person.tcPassportNo?.trim() ||
          person.driver?.tcKimlikNo?.trim() ||
          person.driver?.id ||
          '';

        this.logger.warn(
          `[UETDS][DEBUG][personelEkle][identity] ${JSON.stringify({
            personId: person.id,
            personnelType: person.personnelType,
            firstName: person.firstName,
            lastName: person.lastName,
            tcPassportNo: person.tcPassportNo,
            driverId: person.driverId,
            driverTcKimlikNo: person.driver?.tcKimlikNo,
            resolvedIdentityNo: identityNo,
          })}`,
        );

        let personnelSuccess = false;
        let personnelMessage = 'Personel gönderimi denenmedi';

        if (!identityNo) {
          personnelMessage = `TC Kimlik / Pasaport No eksik`;
        } else {
          const personelResult = await this.uetdsService.personelEkle(
            username,
            password,
            tenantId,
            tripId,
            seferRefNo,
            {
              turKodu: Number(person.personnelType ?? 0),
              uyrukUlke: (person.nationalityCode || 'TR').trim().toUpperCase(),
              tcKimlikPasaportNo: identityNo,
              tcKimlikPasaportno: identityNo,
              adi: person.firstName,
              soyadi: person.lastName,
              cinsiyet: (person.gender || 'E').trim().toUpperCase(),
              telefon: person.phone,
            },
            environment,
          );

          personnelSuccess =
            personelResult?.sonucKodu === undefined || personelResult.sonucKodu === 0;
          personnelMessage = personelResult?.sonucMesaji || '';
        }

        personnelResults.push({
          personId: person.id,
          fullName: `${person.firstName} ${person.lastName}`.trim(),
          success: personnelSuccess,
          message: personnelMessage,
        });

        if (!personnelSuccess) {
          this.logger.warn(
            `[UETDS] personelEkle warning for ${person.firstName} ${person.lastName}: ${personnelMessage}`,
          );
        }
      }

      const successfulPersonnelCount = personnelResults.filter((item) => item.success).length;
      if (successfulPersonnelCount === 0) {
        this.logger.warn(
          `[UETDS] No personnel records were accepted for trip ${tripId}. Continuing to group/yolcu steps for diagnostics.`,
        );
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
