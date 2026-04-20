import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UetdsService } from './uetds.service';
import { TenantId } from '../../common/decorators/user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../../database/entities';

const normalizePlate = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, '');

const pickFirstDefined = (payload: any, keys: string[]) => {
  for (const key of keys) {
    const value = payload?.[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return null;
};

const buildNormalizedResult = (payload: any) => ({
  ok: Number(payload?.sonucKodu ?? -1) === 0,
  resultCode: Number(payload?.sonucKodu ?? -1),
  message: payload?.sonucMesaji || '',
  raw: payload,
});

@Controller('api/uetds')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UetdsController {
  constructor(
    private uetdsService: UetdsService,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
  ) {}

  private async getTenantProps(tenantId: string) {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new BadRequestException('Firma bulunamadı');
    }
    return {
      username: tenant.uetdsUsername,
      password: tenant.uetdsPasswordEncrypted,
      environment: tenant.settings?.uetdsEnvironment || 'test',
    };
  }

  private ensureQueryValue(value: string | undefined, label: string) {
    const normalized = value?.trim();
    if (!normalized) {
      throw new BadRequestException(`${label} zorunludur`);
    }
    return normalized;
  }

  @Get('test')
  async testConnection(@TenantId() tenantId: string) {
    const { username, password, environment } = await this.getTenantProps(tenantId);
    return this.uetdsService.servisTest(
      username,
      password,
      tenantId,
      'ping',
      environment,
    );
  }

  @Get('validate-credentials')
  @Roles(UserRole.COMPANY_ADMIN)
  async validateCredentials(@TenantId() tenantId: string) {
    const { username, password, environment } = await this.getTenantProps(tenantId);
    return this.uetdsService.kullaniciKontrol(
      username,
      password,
      tenantId,
      environment,
    );
  }

  private buildLookupError(error: any, fallbackMessage: string) {
    const rawMessage = String(error?.message || fallbackMessage);
    const normalizedMessage = rawMessage.includes('Yetki Hatası')
      ? 'Bu UETDS hesabında ilgili sorgu servisi için yetki tanımlı değil. Kurum yetkisi açılmadan resmi veri çekilemez.'
      : rawMessage;

    return {
      ok: false,
      resultCode: -1,
      message: normalizedMessage,
      raw: { error: rawMessage },
    };
  }

  @Get('vehicle/eligibility')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  async checkVehicleEligibility(
    @TenantId() tenantId: string,
    @Query('plate') plate: string,
  ) {
    const normalizedPlate = normalizePlate(
      this.ensureQueryValue(plate, 'Plaka'),
    );
    const { username, password } = await this.getTenantProps(tenantId);

    try {
      const payload = await this.uetdsService.yetkiBelgesiKontrol(
        username,
        password,
        tenantId,
        normalizedPlate,
      );

      return {
        ...buildNormalizedResult(payload),
        plateNumber: normalizedPlate,
        documentNumber: pickFirstDefined(payload, [
          'yetkiBelgeNo',
          'yetkiBelgesiNo',
          'belgeNo',
        ]),
        documentType: pickFirstDefined(payload, [
          'yetkiBelgeTuru',
          'yetkiBelgesiTuru',
          'belgeTuru',
        ]),
      };
    } catch (error: any) {
      return {
        ...this.buildLookupError(error, 'Yetki belgesi sorgusu başarısız'),
        plateNumber: normalizedPlate,
        documentNumber: null,
        documentType: null,
      };
    }
  }

  @Get('vehicle/inspection')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  async checkVehicleInspection(
    @TenantId() tenantId: string,
    @Query('plate') plate: string,
  ) {
    const normalizedPlate = normalizePlate(
      this.ensureQueryValue(plate, 'Plaka'),
    );
    const { username, password } = await this.getTenantProps(tenantId);

    try {
      const payload = await this.uetdsService.aracMuayeneSorgula(
        username,
        password,
        tenantId,
        normalizedPlate,
      );

      return {
        ...buildNormalizedResult(payload),
        plateNumber: normalizedPlate,
        inspectionExpiry: pickFirstDefined(payload, [
          'muayeneGecerlilikTarihi',
          'muayeneBitisTarihi',
          'muayeneSonTarihi',
          'muayeneTarihi',
          'sonMuayeneTarihi',
        ]),
      };
    } catch (error: any) {
      return {
        ...this.buildLookupError(error, 'Muayene sorgusu başarısız'),
        plateNumber: normalizedPlate,
        inspectionExpiry: null,
      };
    }
  }

  @Get('driver/qualification')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  async checkDriverQualification(
    @TenantId() tenantId: string,
    @Query('tcKimlikNo') tcKimlikNo: string,
  ) {
    const identityNo = this.ensureQueryValue(tcKimlikNo, 'TC Kimlik No');
    const { username, password } = await this.getTenantProps(tenantId);

    try {
      const payload = await this.uetdsService.meslekiYeterlilikSorgula(
        username,
        password,
        tenantId,
        identityNo,
      );

      return {
        ...buildNormalizedResult(payload),
        tcKimlikNo: identityNo,
        srcCertificate: pickFirstDefined(payload, [
          'srcBelgeTuru',
          'srcTur',
          'meslekiYeterlilikBelgesi',
          'belgeTuru',
          'srcBelgesi',
        ]),
        fullName: pickFirstDefined(payload, ['adSoyad', 'adiSoyadi']),
      };
    } catch (error: any) {
      return {
        ...this.buildLookupError(error, 'Mesleki yeterlilik sorgusu başarısız'),
        tcKimlikNo: identityNo,
        srcCertificate: null,
        fullName: null,
      };
    }
  }

  @Get('driver/identity')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  async verifyDriverIdentity(
    @TenantId() tenantId: string,
    @Query('tcKimlikNo') tcKimlikNo: string,
    @Query('firstName') firstName: string,
    @Query('lastName') lastName: string,
  ) {
    const identityNo = this.ensureQueryValue(tcKimlikNo, 'TC Kimlik No');
    const normalizedFirstName = this.ensureQueryValue(firstName, 'Ad').toLocaleUpperCase(
      'tr-TR',
    );
    const normalizedLastName = this.ensureQueryValue(lastName, 'Soyad').toLocaleUpperCase(
      'tr-TR',
    );
    const { username, password } = await this.getTenantProps(tenantId);

    try {
      const payload = await this.uetdsService.kimlikDogrulama(
        username,
        password,
        tenantId,
        identityNo,
        normalizedFirstName,
        normalizedLastName,
      );

      return {
        ...buildNormalizedResult(payload),
        tcKimlikNo: identityNo,
        firstName: pickFirstDefined(payload, ['adi', 'ad']) || normalizedFirstName,
        lastName: pickFirstDefined(payload, ['soyadi', 'soyad']) || normalizedLastName,
      };
    } catch (error: any) {
      return {
        ...this.buildLookupError(error, 'Kimlik doğrulama başarısız'),
        tcKimlikNo: identityNo,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
      };
    }
  }
}
