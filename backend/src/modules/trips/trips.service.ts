import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  Driver,
  Trip,
  TripStatus,
  TripGroup,
  TripPersonnel,
  Passenger,
  Tenant,
  Vehicle,
  PassengerSource,
} from '../../database/entities';
import type { OcrPassengerResult } from '../ocr/ocr.service';
import { UetdsService } from '../uetds/uetds.service';
import { TenantsService } from '../tenants/tenants.service';

const DEMO_TRIP_NUMBER = 'DMO-2026-001';
const IMPORT_TRIP_PREFIX = 'UETDS-IMPORT';
const AI_TRIP_PREFIX = 'AI-SEFER';

const ISTANBUL_DISTRICTS = [
  { code: 2048, name: 'ARNAVUTKÖY', aliases: ['arnavutkoy', 'istanbul havalimani', 'istanbul havalimanı', 'ist airport', 'ist'] },
  { code: 1835, name: 'PENDİK', aliases: ['pendik', 'sabiha', 'sabiha gokcen', 'sabiha gökçen', 'saw'] },
  { code: 1663, name: 'ŞİŞLİ', aliases: ['sisli', 'şişli', 'mecidiyekoy', 'mecidiyeköy', 'nisantasi', 'nişantaşı'] },
  { code: 1186, name: 'BEYOĞLU', aliases: ['beyoglu', 'beyoğlu', 'taksim', 'karakoy', 'karaköy'] },
  { code: 1183, name: 'BEŞİKTAŞ', aliases: ['besiktas', 'beşiktaş', 'levent', 'etiler', 'ortakoy', 'ortaköy'] },
  { code: 1327, name: 'FATİH', aliases: ['fatih', 'sultanahmet', 'eminonu', 'eminönü', 'aksaray'] },
  { code: 1421, name: 'KADIKÖY', aliases: ['kadikoy', 'kadıköy'] },
  { code: 1708, name: 'ÜSKÜDAR', aliases: ['uskudar', 'üsküdar'] },
  { code: 1166, name: 'BAKIRKÖY', aliases: ['bakirkoy', 'bakırköy', 'atakoy', 'ataköy'] },
  { code: 1604, name: 'SARIYER', aliases: ['sariyer', 'sarıyer', 'maslak'] },
  { code: 2053, name: 'ESENYURT', aliases: ['esenyurt'] },
  { code: 2003, name: 'AVCILAR', aliases: ['avcilar', 'avcılar'] },
  { code: 2051, name: 'BEYLİKDÜZÜ', aliases: ['beylikduzu', 'beylikdüzü'] },
  { code: 1739, name: 'ZEYTİNBURNU', aliases: ['zeytinburnu'] },
];

const normalizeSearchText = (value?: string | null) =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizePlate = (value?: string | null) =>
  String(value || '').trim().toUpperCase().replace(/\s+/g, '');

const toLocalTripDate = (value: Date) => {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const toLocalTripTime = (value: Date) => {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(11, 16);
};

const pickFirst = (payload: any, keys: string[]) => {
  for (const key of keys) {
    const value = payload?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
};

const normalizeDateInput = (value?: string | null) => {
  if (!value) return '';
  const raw = String(value).trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const tr = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (tr) return `${tr[3]}-${tr[2]}-${tr[1]}`;
  return '';
};

const normalizeTimeInput = (value?: string | null) => {
  if (!value) return '';
  const raw = String(value).trim();
  const match = raw.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
};

const normalizeFullDateTime = (value?: string | null) => {
  if (!value) return { date: '', time: '' };
  const raw = String(value).trim();
  const [datePart, timePart] = raw.split(/\s+/);
  return {
    date: normalizeDateInput(datePart),
    time: normalizeTimeInput(timePart),
  };
};

const normalizePassengerName = (value?: string | null) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[​-‍﻿]/g, '')
    .trim()
    .replace(/\s+/g, ' ');

const normalizePassengerIdentity = (value?: string | null) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^0-9A-Za-z]/g, '')
    .toUpperCase();

const normalizePassengerNationality = (value?: string | null) =>
  String(value || 'TR')
    .normalize('NFKC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 10) || 'TR';

const normalizeImportedName = (value?: string | null) =>
  normalizePassengerName(value);

const normalizeImportedIdentity = (value?: string | null) =>
  normalizePassengerIdentity(value);

const normalizeImportedGender = (value?: string | null) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'K' || normalized === 'E') return normalized;
  return 'E';
};

const normalizePassengerRecord = (data: Partial<Passenger>) => ({
  ...data,
  firstName: normalizePassengerName(data.firstName),
  lastName: normalizePassengerName(data.lastName),
  tcPassportNo: normalizePassengerIdentity(data.tcPassportNo),
  nationalityCode: normalizePassengerNationality(data.nationalityCode),
  gender: normalizeImportedGender(data.gender),
  phone: String(data.phone || '').trim() || undefined,
  seatNumber: String(data.seatNumber || '').trim() || undefined,
});

const buildUetdsNationalityCode = (value?: string | null) =>
  normalizePassengerNationality(value);

const buildUetdsIdentityNo = (value?: string | null) =>
  normalizePassengerIdentity(value);

const buildUetdsName = (value?: string | null) =>
  normalizePassengerName(value);

void pickFirst;
void normalizeDateInput;
void normalizeTimeInput;
void normalizeFullDateTime;
void normalizeImportedName;
void normalizeImportedIdentity;
void normalizeImportedGender;
void IMPORT_TRIP_PREFIX;

type AutopilotPassport = {
  originalname?: string;
  buffer: Buffer;
};

type AutopilotInput = {
  message?: string;
  passports?: AutopilotPassport[];
};

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

  private normalizeTripData(
    tripData: Partial<Trip> & { originPlace?: string; destPlace?: string },
  ) {
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

  private validateTripInput(
    tripData: Partial<Trip> & { originPlace?: string; destPlace?: string },
  ) {
    const originIl = this.sanitizeMernisCode(tripData.originIlCode);
    const originIlce = this.sanitizeMernisCode(tripData.originIlceCode);
    const destIl = this.sanitizeMernisCode(tripData.destIlCode);
    const destIlce = this.sanitizeMernisCode(tripData.destIlceCode);

    if (!originIl) {
      throw new BadRequestException(
        this.buildLocationValidationMessage('Kalkış ili'),
      );
    }
    if (!originIlce) {
      throw new BadRequestException(
        this.buildLocationValidationMessage('Kalkış ilçesi'),
      );
    }
    if (!destIl) {
      throw new BadRequestException(
        this.buildLocationValidationMessage('Varış ili'),
      );
    }
    if (!destIlce) {
      throw new BadRequestException(
        this.buildLocationValidationMessage('Varış ilçesi'),
      );
    }
  }

  private validateGroupInput(data: Partial<TripGroup>) {
    const originIl = this.sanitizeMernisCode(data.originIlCode);
    const originIlce = this.sanitizeMernisCode(data.originIlceCode);
    const destIl = this.sanitizeMernisCode(data.destIlCode);
    const destIlce = this.sanitizeMernisCode(data.destIlceCode);
    const groupFee =
      data.groupFee !== undefined && data.groupFee !== null
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
      throw new BadRequestException(
        this.buildLocationValidationMessage('Grup kalkış ili'),
      );
    }
    if (!originIlce) {
      throw new BadRequestException(
        this.buildLocationValidationMessage('Grup kalkış ilçesi'),
      );
    }
    if (!destIl) {
      throw new BadRequestException(
        this.buildLocationValidationMessage('Grup varış ili'),
      );
    }
    if (!destIlce) {
      throw new BadRequestException(
        this.buildLocationValidationMessage('Grup varış ilçesi'),
      );
    }
    if (!groupFee || groupFee <= 0) {
      throw new BadRequestException("Grup ücreti 0'dan büyük olmalıdır.");
    }
  }

  private async persistPreparedGroups(
    preparedGroups: Array<{ group: TripGroup; updates: Partial<TripGroup> }>,
  ) {
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

  private ensureGroupHasMeaningfulDescription(
    group: Partial<TripGroup>,
    trip?: Partial<Trip>,
  ) {
    const description =
      group.groupDescription?.trim() || trip?.description?.trim() || 'Transfer';
    return description;
  }

  private ensureGroupHasMeaningfulName(group: Partial<TripGroup>) {
    return group.groupName?.trim() || '1. Grup';
  }

  private ensureGroupFee(group: Partial<TripGroup>) {
    const fee =
      group.groupFee !== undefined && group.groupFee !== null
        ? Number(group.groupFee)
        : 500;
    return fee > 0 ? fee : 500;
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
    const defaultGroup = savedTrip.groups?.find((group) =>
      this.shouldRefreshDefaultGroup(group),
    );

    if (!defaultGroup) return null;

    return this.normalizeExistingDefaultGroup(defaultGroup, savedTrip);
  }

  private getTrimmedVehiclePlate(value?: string | null) {
    return (value || '').trim().toUpperCase().replace(/\s+/g, '');
  }

  private normalizeTripFormData(
    tripData: Partial<Trip> & { originPlace?: string; destPlace?: string },
  ) {
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

  private buildGroupDescription(group: TripGroup) {
    return group.groupDescription?.trim() || `${group.groupName} grubu`;
  }

  private formatPdfDate(date: string, time: string) {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year} ${time}`;
  }

  private maskTcKimlikNo(value?: string | null) {
    if (!value || value.length < 6) return value || '';
    return `${value.slice(0, 3)}*****${value.slice(-3)}`;
  }

  private async buildDemoPdfBuffer(trip: Trip) {
    const templateBytes = await this.tenantsService.getDemoPdfTemplateBuffer();
    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const page = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const white = rgb(1, 1, 1);

    const driver = trip.personnel?.[0];
    const group = trip.groups?.[0];
    const passenger = group?.passengers?.[0];

    page.drawRectangle({ x: 456, y: 691, width: 198, height: 138, color: white });
    page.drawRectangle({ x: 45, y: 444, width: 614, height: 112, color: white });
    page.drawRectangle({ x: 45, y: 324, width: 614, height: 122, color: white });

    page.drawText(String(trip.uetdsSeferRefNo || ''), { x: 466, y: 788, size: 14, font });
    page.drawText(trip.vehiclePlate || '', { x: 466, y: 758, size: 14, font });
    page.drawText(this.formatPdfDate(trip.departureDate, trip.departureTime), {
      x: 466,
      y: 727,
      size: 14,
      font,
    });
    page.drawText(this.formatPdfDate(trip.endDate, trip.endTime), {
      x: 466,
      y: 697,
      size: 14,
      font,
    });
    page.drawText(this.formatPdfDate(trip.departureDate, '09:52:48'), {
      x: 466,
      y: 666,
      size: 14,
      font,
    });

    page.drawText(this.maskTcKimlikNo(driver?.tcPassportNo), {
      x: 205,
      y: 494,
      size: 12,
      font,
    });
    page.drawText(`${driver?.firstName || ''} ${driver?.lastName || ''}`.trim(), {
      x: 350,
      y: 494,
      size: 12,
      font,
    });
    page.drawText('SRC2', { x: 592, y: 494, size: 12, font });

    page.drawText(group?.groupName || '1', { x: 48, y: 406, size: 11, font: boldFont });
    page.drawText(
      `Grup Adı: ${group?.groupName || '1'}`,
      { x: 48, y: 384, size: 11, font },
    );
    page.drawText(
      `Grup Biniş - İniş Yeri : ( ${group?.originPlace || ''} - ${group?.destPlace || ''})`,
      { x: 48, y: 363, size: 10, font },
    );
    page.drawText(group?.groupDescription || trip.description || '', {
      x: 160,
      y: 332,
      size: 11,
      font,
    });
    page.drawText(String(group?.groupFee || 500), {
      x: 160,
      y: 309,
      size: 11,
      font,
    });

    page.drawText('1', { x: 57, y: 268, size: 11, font });
    page.drawText(passenger?.nationalityCode || '', { x: 96, y: 268, size: 11, font });
    page.drawText(passenger?.tcPassportNo || '', { x: 189, y: 268, size: 11, font });
    page.drawText(
      `${passenger?.firstName || ''} ${passenger?.lastName || ''}`.trim(),
      { x: 392, y: 268, size: 11, font },
    );
    page.drawText(passenger?.gender || '', { x: 619, y: 268, size: 11, font });

    return Buffer.from(await pdfDoc.save());
  }

  constructor(
    @InjectRepository(Trip) private tripRepo: Repository<Trip>,
    @InjectRepository(TripGroup) private groupRepo: Repository<TripGroup>,
    @InjectRepository(TripPersonnel)
    private personnelRepo: Repository<TripPersonnel>,
    @InjectRepository(Passenger) private passengerRepo: Repository<Passenger>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Driver) private driverRepo: Repository<Driver>,
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    private uetdsService: UetdsService,
    private tenantsService: TenantsService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private getPdfShareSecret() {
    return this.configService.get<string>('jwt.secret') || 'super-secret-key-change-in-production';
  }

  private buildPdfShareToken(tripId: string, tenantId: string) {
    return this.jwtService.sign(
      {
        typ: 'trip-pdf-share',
        tripId,
        tenantId,
      },
      {
        secret: this.getPdfShareSecret(),
        expiresIn: '1h',
      },
    );
  }

  private verifyPdfShareToken(token: string, tripId: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.getPdfShareSecret(),
      }) as { typ?: string; tripId?: string; tenantId?: string };

      if (payload?.typ !== 'trip-pdf-share' || payload?.tripId !== tripId || !payload?.tenantId) {
        throw new UnauthorizedException('Geçersiz PDF paylaşım bağlantısı');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('PDF paylaşım bağlantısı geçersiz veya süresi dolmuş');
    }
  }

  buildPdfShareUrl(tripId: string, tenantId: string, baseUrl: string) {
    const token = this.buildPdfShareToken(tripId, tenantId);
    return `${baseUrl.replace(/\/$/, '')}/api/trips/${tripId}/pdf/share?token=${encodeURIComponent(token)}`;
  }

  async getUetdsPdfByShareToken(tripId: string, token: string) {
    const payload = this.verifyPdfShareToken(token, tripId);
    return this.getUetdsPdf(tripId, payload.tenantId as string);
  }

  async getPdfShareLink(tripId: string, tenantId: string, baseUrl: string) {
    await this.findOne(tripId, tenantId);
    return {
      pdfShareUrl: this.buildPdfShareUrl(tripId, tenantId, baseUrl),
    };
  }


  private async maybeAttachSuggestedDriver(
    tripId: string,
    tenantId: string,
    selectedDriverId?: string,
  ) {
    if (!selectedDriverId) return;

    const driver = await this.driverRepo.findOne({
      where: { id: selectedDriverId, tenantId, isActive: true },
    });

    if (!driver) {
      throw new BadRequestException('Önerilen şoför bulunamadı');
    }

    const existingPersonnel = await this.personnelRepo.findOne({
      where: {
        tripId,
        tenantId,
        tcPassportNo: driver.tcKimlikNo,
        personnelType: 0,
      },
    });

    if (existingPersonnel) return;

    await this.personnelRepo.save(
      this.personnelRepo.create({
        tripId,
        tenantId,
        driverId: driver.id,
        personnelType: 0,
        tcPassportNo: driver.tcKimlikNo,
        nationalityCode: driver.nationalityCode || 'TR',
        firstName: driver.firstName,
        lastName: driver.lastName,
        gender: driver.gender || 'E',
        phone: driver.phone,
        address: driver.address,
        status: 'active',
      }),
    );
  }

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
      relations: [
        'groups',
        'groups.passengers',
        'personnel',
        'personnel.driver',
        'vehicle',
        'createdBy',
      ],
    });

    if (!trip) throw new NotFoundException('Sefer bulunamadı');
    return trip;
  }

  private inferAutopilotPlate(message: string, vehicles: Vehicle[]) {
    const normalizedMessage = normalizeSearchText(message).replace(/\s+/g, '');
    const plateMatch = message
      .toUpperCase()
      .match(/\b\d{2}\s*[A-ZÇĞİÖŞÜ]{1,3}\s*\d{2,4}\b/);

    if (plateMatch) return normalizePlate(plateMatch[0]);

    const matchedVehicle = vehicles.find((vehicle) =>
      normalizedMessage.includes(normalizePlate(vehicle.plateNumber).toLocaleLowerCase('tr-TR')),
    );

    return normalizePlate(matchedVehicle?.plateNumber || vehicles[0]?.plateNumber || '');
  }

  private inferAutopilotDriver(
    message: string,
    vehiclePlate: string,
    vehicles: Vehicle[],
    drivers: Driver[],
  ) {
    const normalizedMessage = normalizeSearchText(message);
    const byName = drivers.find((driver) => {
      const fullName = normalizeSearchText(`${driver.firstName} ${driver.lastName}`);
      return fullName && normalizedMessage.includes(fullName);
    });
    if (byName) return byName;

    const normalizedPlate = normalizePlate(vehiclePlate);
    const vehicleDefaultDriverId = vehicles.find(
      (vehicle) => normalizePlate(vehicle.plateNumber) === normalizedPlate,
    )?.defaultDriverId;
    if (vehicleDefaultDriverId) {
      const driver = drivers.find((item) => item.id === vehicleDefaultDriverId);
      if (driver) return driver;
    }

    return (
      drivers.find((driver) => normalizePlate(driver.plateNumber) === normalizedPlate) ||
      drivers[0] ||
      null
    );
  }

  private inferAutopilotLocation(message: string, role: 'origin' | 'dest') {
    const normalizedMessage = normalizeSearchText(message);
    const matches = ISTANBUL_DISTRICTS.flatMap((district) =>
      district.aliases
        .map((alias) => ({ district, index: normalizedMessage.indexOf(normalizeSearchText(alias)) }))
        .filter((match) => match.index >= 0),
    ).sort((a, b) => a.index - b.index);

    const selectedMatch = matches.length > 1
      ? role === 'origin'
        ? matches[0]
        : matches[matches.length - 1]
      : role === 'dest'
        ? matches[0]
        : null;
    const matched = selectedMatch?.district;

    if (matched) {
      const airportPlace = matched.code === 2048
        ? 'İstanbul Havalimanı'
        : matched.code === 1835
          ? 'Sabiha Gökçen Havalimanı'
          : `${matched.name}/İSTANBUL`;
      return {
        ilCode: 34,
        ilceCode: matched.code,
        place: airportPlace,
        label: matched.name,
      };
    }

    const fallback = role === 'origin'
      ? { code: 2048, name: 'ARNAVUTKÖY', place: 'İstanbul Havalimanı' }
      : { code: 1663, name: 'ŞİŞLİ', place: 'ŞİŞLİ/İSTANBUL' };

    return {
      ilCode: 34,
      ilceCode: fallback.code,
      place: fallback.place,
      label: fallback.name,
    };
  }

  private buildAutopilotTripData(
    message: string,
    vehicles: Vehicle[],
    drivers: Driver[],
  ) {
    const now = new Date();
    const departureDate = toLocalTripDate(now);
    const vehiclePlate = this.inferAutopilotPlate(message, vehicles);
    const selectedDriver = this.inferAutopilotDriver(message, vehiclePlate, vehicles, drivers);
    const origin = this.inferAutopilotLocation(message, 'origin');
    const dest = this.inferAutopilotLocation(message, 'dest');

    return {
      trip: {
        firmTripNumber: `${AI_TRIP_PREFIX}-${Date.now()}`,
        vehiclePlate,
        vehicleId: vehicles.find((vehicle) => normalizePlate(vehicle.plateNumber) === vehiclePlate)?.id,
        selectedDriverId: selectedDriver?.id,
        departureDate,
        departureTime: toLocalTripTime(now),
        endDate: departureDate,
        endTime: '23:59',
        description: message.trim() || 'AI Autopilot seferi',
        originIlCode: origin.ilCode,
        originIlceCode: origin.ilceCode,
        originPlace: origin.place,
        destIlCode: dest.ilCode,
        destIlceCode: dest.ilceCode,
        destPlace: dest.place,
      },
      decisions: [
        `Hareket zamanı ${departureDate} ${toLocalTripTime(now)} olarak alındı.`,
        `Bitiş zamanı ${departureDate} 23:59 olarak alındı.`,
        `Kalkış ${origin.label}, varış ${dest.label} olarak eşleşti.`,
        vehiclePlate ? `Araç plakası ${vehiclePlate} olarak seçildi.` : 'Araç plakası bulunamadı.',
        selectedDriver
          ? `Şoför ${selectedDriver.firstName} ${selectedDriver.lastName} olarak seçildi.`
          : 'Şoför bulunamadı.',
      ],
      selectedDriver,
    };
  }

  private buildAutopilotPassenger(
    ocrResult: OcrPassengerResult,
    fileName: string,
    index: number,
  ): Partial<Passenger> | null {
    const identity = normalizePassengerIdentity(ocrResult.passportNo);
    if (!identity) return null;

    return {
      firstName: normalizePassengerName(ocrResult.firstName) || 'Yolcu',
      lastName: normalizePassengerName(ocrResult.lastName || `${index + 1}`) || `${index + 1}`,
      tcPassportNo: identity,
      nationalityCode: normalizePassengerNationality(ocrResult.nationalityCode),
      gender: normalizeImportedGender(ocrResult.gender),
      seatNumber: String(index + 1),
      source: PassengerSource.OCR,
      rawOcrData: {
        fileName,
        mrzDetected: ocrResult.mrzDetected,
        confidence: ocrResult.confidence,
        dateOfBirth: ocrResult.dateOfBirth,
        expiryDate: ocrResult.expiryDate,
      },
    };
  }

  async createAutopilotTrip(
    tenantId: string,
    userId: string,
    data: AutopilotInput,
    ocrService: { processPassportImage(imageBuffer: Buffer): Promise<OcrPassengerResult> },
  ) {
    const message = String(data.message || '').trim();
    const passports = data.passports || [];

    if (!message && passports.length === 0) {
      throw new BadRequestException('AI Autopilot için mesaj veya pasaport görseli yükleyin');
    }

    const [vehicles, drivers] = await Promise.all([
      this.vehicleRepo.find({ where: { tenantId, isActive: true }, relations: ['defaultDriver'] }),
      this.driverRepo.find({ where: { tenantId, isActive: true } }),
    ]);

    const inferred = this.buildAutopilotTripData(message, vehicles, drivers);
    if (!inferred.trip.vehiclePlate) {
      throw new BadRequestException('AI Autopilot araç plakası seçemedi');
    }
    if (!inferred.trip.selectedDriverId) {
      throw new BadRequestException('AI Autopilot şoför seçemedi');
    }

    const passengers: Partial<Passenger>[] = [];
    const passportResults: any[] = [];

    for (const [index, passport] of passports.entries()) {
      const ocrResult = await ocrService.processPassportImage(passport.buffer);
      const passenger = this.buildAutopilotPassenger(
        ocrResult,
        passport.originalname || `pasaport-${index + 1}`,
        index,
      );
      passportResults.push({
        fileName: passport.originalname || `pasaport-${index + 1}`,
        success: Boolean(passenger),
        mrzDetected: ocrResult.mrzDetected,
        confidence: ocrResult.confidence,
        passenger,
      });
      if (passenger && !passengers.some((item) => item.tcPassportNo === passenger.tcPassportNo)) {
        passengers.push(passenger);
      }
    }

    if (passengers.length === 0) {
      throw new BadRequestException({
        message: 'Pasaportlardan UETDS için geçerli yolcu okunamadı',
        details:
          'OCR servisi pasaport no/MRZ alanı çıkaramadı. Görselin MRZ satırları net görünecek şekilde kırpılmadan yüklenmesi gerekir.',
        passportResults,
      });
    }

    const trip = await this.create(tenantId, userId, inferred.trip as Partial<Trip>);
    const defaultGroup = trip.groups?.[0];
    if (!defaultGroup) {
      throw new BadRequestException('AI Autopilot varsayılan yolcu grubu oluşturamadı');
    }

    const savedPassengers = await this.addPassengersBulk(defaultGroup.id, tenantId, passengers);

    let uetdsResult: any = null;
    try {
      uetdsResult = await this.sendToUetds(trip.id, tenantId);
    } catch (error) {
      const message = error instanceof BadRequestException
        ? error.getResponse()
        : error instanceof Error
          ? error.message
          : String(error);
      return {
        success: false,
        status: 'created-uetds-error',
        tripId: trip.id,
        trip: await this.findOne(trip.id, tenantId),
        passengers: savedPassengers,
        passportResults,
        decisions: inferred.decisions,
        uetdsError: message,
      };
    }

    return {
      success: true,
      status: 'sent',
      tripId: trip.id,
      trip: await this.findOne(trip.id, tenantId),
      passengers: savedPassengers,
      passportResults,
      decisions: inferred.decisions,
      uetds: uetdsResult,
    };
  }

  async create(tenantId: string, userId: string, data: Partial<Trip>) {
    const { selectedDriverId, ...tripInput } = data as Partial<Trip> & {
      originPlace?: string;
      destPlace?: string;
      selectedDriverId?: string;
    };

    const tripData = this.normalizeTripFormData(tripInput);

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

    await this.addGroup(
      savedTrip.id,
      tenantId,
      this.buildNormalizedDefaultGroup(savedTrip),
    );

    await this.maybeAttachSuggestedDriver(
      savedTrip.id,
      tenantId,
      selectedDriverId,
    );

    return this.findOne(savedTrip.id, tenantId);
  }

  async update(id: string, tenantId: string, data: Partial<Trip>) {
    const tripData = this.normalizeTripData(
      data as Partial<Trip> & {
        originPlace?: string;
        destPlace?: string;
      },
    );
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
      const defaultGroup = savedTrip.groups?.find((group) =>
        this.shouldRefreshDefaultGroup(group),
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

  async addPersonnel(
    tripId: string,
    tenantId: string,
    data: Partial<TripPersonnel>,
  ) {
    const trip = await this.findOne(tripId, tenantId);

    const existingPersonnel = await this.personnelRepo.findOne({
      where: {
        tripId: trip.id,
        tenantId,
        tcPassportNo: data.tcPassportNo,
        personnelType: data.personnelType,
      },
    });

    if (existingPersonnel) {
      throw new BadRequestException('Bu personel bu rolde zaten eklenmiş');
    }

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
      ...normalizePassengerRecord(data),
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
        ...normalizePassengerRecord(p),
        tripGroupId: group.id,
        tenantId,
      }),
    );

    return this.passengerRepo.save(entities);
  }

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
    const password = tenant.uetdsPasswordEncrypted;
    const environment = tenant.settings?.uetdsEnvironment || 'test';

    let groupsForSend: TripGroup[] = [];
    try {
      groupsForSend = await this.prepareGroupsBeforeSend(trip);
    } catch (validationError) {
      throw this.buildSendFailureFromValidation(validationError, tripId);
    }

    await this.tripRepo.update(tripId, { status: TripStatus.SENDING });

    try {
      this.logger.log(
        `[UETDS] Step 1: seferEkle for trip ${tripId} in ${environment} env`,
      );
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

      this.logger.log(
        `[UETDS] Step 2: seferGrupEkle for ${groupsForSend.length} groups`,
      );
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

        let personnelSuccess = false;
        let personnelMessage = 'Personel gönderimi denenmedi';

        if (!identityNo) {
          personnelMessage = 'TC Kimlik / Pasaport No eksik';
        } else {
          const personelResult = await this.uetdsService.personelEkle(
            username,
            password,
            tenantId,
            tripId,
            seferRefNo,
            {
              turKodu: Number(person.personnelType ?? 0),
              uyrukUlke: buildUetdsNationalityCode(person.nationalityCode),
              tcKimlikPasaportNo: buildUetdsIdentityNo(identityNo),
              adi: buildUetdsName(person.firstName),
              soyadi: buildUetdsName(person.lastName),
              cinsiyet: normalizeImportedGender(person.gender),
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
      }

      this.logger.log('[UETDS] Step 4: yolcuEkleCoklu');
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
          uyrukUlke: buildUetdsNationalityCode(p.nationalityCode),
          cinsiyet: normalizeImportedGender(p.gender),
          tcKimlikPasaportNo: buildUetdsIdentityNo(p.tcPassportNo),
          adi: buildUetdsName(p.firstName),
          soyadi: buildUetdsName(p.lastName),
          koltukNo: p.seatNumber,
          telefonNo: p.phone,
        }));

        const missingPassengerIdentity = yolcuBilgileri.find(
          (p) => !p.tcKimlikPasaportNo,
        );
        if (missingPassengerIdentity) {
          throw new Error(
            `Yolcu TC Kimlik / Pasaport No eksik: ${missingPassengerIdentity.adi} ${missingPassengerIdentity.soyadi}`,
          );
        }

        const yolcuResult = await this.uetdsService.yolcuEkleCoklu(
          username,
          password,
          tenantId,
          tripId,
          seferRefNo,
          yolcuBilgileri,
          environment,
        );

        if (
          yolcuResult?.sonucKodu !== undefined &&
          ![0, 88].includes(yolcuResult.sonucKodu)
        ) {
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
          summaryError instanceof Error
            ? summaryError.message
            : String(summaryError);
        this.logger.warn(
          `[UETDS] bildirimOzeti warning for trip ${tripId}: ${summaryMessage}`,
        );
      }

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

  async cancelOnUetds(tripId: string, tenantId: string, reason: string) {
    const trip = await this.findOne(tripId, tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    const environment = tenant?.settings?.uetdsEnvironment || 'test';

    if (!trip.uetdsSeferRefNo) {
      throw new BadRequestException("Bu sefer UETDS'ye gönderilmemiş");
    }

    const result = await this.uetdsService.seferIptal(
      tenant?.uetdsUsername || '',
      tenant?.uetdsPasswordEncrypted || '',
      tenantId,
      tripId,
      trip.uetdsSeferRefNo,
      reason,
      environment,
    );

    if (result.sonucKodu === 0) {
      await this.tripRepo.update(tripId, { status: TripStatus.CANCELLED });
    }

    return result;
  }

  async getUetdsSummary(tripId: string, tenantId: string) {
    const trip = await this.findOne(tripId, tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });

    if (!trip.uetdsSeferRefNo) {
      throw new BadRequestException("Bu sefer UETDS'ye gönderilmemiş");
    }

    return this.uetdsService.bildirimOzeti(
      tenant?.uetdsUsername || '',
      tenant?.uetdsPasswordEncrypted || '',
      tenantId,
      tripId,
      trip.uetdsSeferRefNo,
    );
  }

  async getUetdsPdf(tripId: string, tenantId: string) {
    const trip = await this.findOne(tripId, tenantId);
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });

    if (!trip.uetdsSeferRefNo) {
      throw new BadRequestException("Bu sefer UETDS'ye gönderilmemiş");
    }

    if (tenant?.settings?.isDemo && trip.firmTripNumber === DEMO_TRIP_NUMBER) {
      await this.tenantsService.refreshDemoTenantSnapshot(tenantId);
      const refreshedTrip = await this.findOne(tripId, tenantId);
      const pdfBuffer = await this.buildDemoPdfBuffer(refreshedTrip);
      return {
        sonucKodu: 0,
        sonucMesaji: 'Demo PDF çıktısı hazır',
        sonucPdf: pdfBuffer,
      };
    }

    const environment = tenant?.settings?.uetdsEnvironment || 'test';
    return this.uetdsService.seferDetayCiktisiAl(
      tenant?.uetdsUsername || '',
      tenant?.uetdsPasswordEncrypted || '',
      tenantId,
      tripId,
      trip.uetdsSeferRefNo,
      environment,
    );
  }

  async importFromUetds(
    tenantId: string,
    userId: string,
    uetdsSeferReferansNo: number,
  ) {
    if (!uetdsSeferReferansNo || Number.isNaN(uetdsSeferReferansNo)) {
      throw new BadRequestException('Geçerli UETDS sefer referans numarası girin');
    }

    const existingTrip = await this.tripRepo.findOne({
      where: { tenantId, uetdsSeferRefNo: uetdsSeferReferansNo },
    });
    if (existingTrip) {
      throw new BadRequestException('Bu UETDS seferi zaten içe aktarılmış');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant?.uetdsUsername || !tenant?.uetdsPasswordEncrypted) {
      throw new BadRequestException('UETDS kimlik bilgileri tanımlanmamış');
    }

    const environment = tenant.settings?.uetdsEnvironment || 'test';
    const summary = await this.uetdsService.bildirimOzeti(
      tenant.uetdsUsername,
      tenant.uetdsPasswordEncrypted,
      tenantId,
      `import-${uetdsSeferReferansNo}`,
      uetdsSeferReferansNo,
      environment,
    );
    const groupSummary = await this.uetdsService.seferGrupListele(
      tenant.uetdsUsername,
      tenant.uetdsPasswordEncrypted,
      tenantId,
      `import-${uetdsSeferReferansNo}`,
      uetdsSeferReferansNo,
    );

    const departure = normalizeFullDateTime(
      pickFirst(summary, ['hareketTarihiSaati', 'seferTarihiSaati', 'seferTarihSaati']),
    );
    const finish = normalizeFullDateTime(
      pickFirst(summary, ['seferBitisTarihiSaati', 'bitisTarihiSaati']),
    );

    const trip = await this.tripRepo.save(
      this.tripRepo.create({
        tenantId,
        createdById: userId,
        firmTripNumber: `${IMPORT_TRIP_PREFIX}-${uetdsSeferReferansNo}`,
        vehiclePlate: normalizePlate(String(pickFirst(summary, ['plaka', 'aracPlaka']) || 'BILINMIYOR')),
        departureDate: departure.date,
        departureTime: departure.time || '00:00',
        endDate: finish.date || departure.date,
        endTime: finish.time || '23:59',
        description: normalizeImportedName(
          pickFirst(summary, ['grupAciklama', 'seferAciklama']) || 'UETDS içe aktarılan sefer',
        ),
        originPlace: normalizeImportedName(pickFirst(summary, ['baslangicYer', 'grupBaslangicYer'])),
        destPlace: normalizeImportedName(pickFirst(summary, ['bitisYer', 'grupBitisYer'])),
        status: TripStatus.SENT,
        uetdsSeferRefNo: uetdsSeferReferansNo,
        uetdsSentAt: new Date(),
      }),
    );

    const groupPayloads = Array.isArray(groupSummary?.return)
      ? groupSummary.return
      : Array.isArray(groupSummary?.return?.uetdsGrup)
        ? groupSummary.return.uetdsGrup
        : [];

    const groups = groupPayloads.length
      ? groupPayloads
      : [
          {
            grupAdi: pickFirst(summary, ['grupAdi']) || '1. Grup',
            grupAciklama: pickFirst(summary, ['grupAciklama']) || trip.description,
            baslangicYer: pickFirst(summary, ['baslangicYer']) || trip.originPlace,
            bitisYer: pickFirst(summary, ['bitisYer']) || trip.destPlace,
            grupUcret: pickFirst(summary, ['grupUcret']) || 0,
            uetdsGrupRefNo: pickFirst(summary, ['uetdsGrupRefNo']) || null,
          },
        ];

    for (const groupPayload of groups) {
      const group = await this.groupRepo.save(
        this.groupRepo.create({
          tripId: trip.id,
          tenantId,
          groupName: normalizeImportedName(groupPayload.grupAdi || '1. Grup'),
          groupDescription: normalizeImportedName(groupPayload.grupAciklama || trip.description),
          originCountryCode: 'TR',
          originIlCode: trip.originIlCode,
          originIlceCode: trip.originIlceCode,
          originPlace: normalizeImportedName(groupPayload.baslangicYer || trip.originPlace),
          destCountryCode: 'TR',
          destIlCode: trip.destIlCode,
          destIlceCode: trip.destIlceCode,
          destPlace: normalizeImportedName(groupPayload.bitisYer || trip.destPlace),
          groupFee: Number(groupPayload.grupUcret || 0),
          uetdsGrupRefNo: groupPayload.uetdsGrupRefNo || null,
          status: 'active',
        }),
      );

      const passengerList = Array.isArray(groupPayload?.yolcular)
        ? groupPayload.yolcular
        : [];

      if (passengerList.length) {
        await this.passengerRepo.save(
          passengerList.map((passenger: any, index: number) =>
            this.passengerRepo.create({
              tripGroupId: group.id,
              tenantId,
              firstName: normalizeImportedName(passenger.adi || 'Yolcu'),
              lastName: normalizeImportedName(passenger.soyadi || `${index + 1}`),
              tcPassportNo: normalizeImportedIdentity(passenger.tcKimlikPasaportNo || '000000'),
              nationalityCode: normalizePassengerNationality(passenger.uyrukUlke || 'TR'),
              gender: normalizeImportedGender(passenger.cinsiyet),
              seatNumber: normalizeImportedName(passenger.koltukNo || `${index + 1}`),
              source: PassengerSource.MANUAL,
              status: 'active',
              uetdsYolcuRefNo: passenger.uetdsBiletRefNo || null,
            }),
          ),
        );
      }
    }

    return this.findOne(trip.id, tenantId);
  }
}
