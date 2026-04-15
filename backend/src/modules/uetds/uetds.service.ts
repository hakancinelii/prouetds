import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as soap from 'soap';
import { UetdsLog } from '../../database/entities';

/**
 * UETDS SOAP Integration Service
 * Handles all communication with the Turkish government UETDS system.
 * Uses SOAP protocol as required by the UETDS V15 technical specification.
 *
 * WSDL Test: https://servis.turkiye.gov.tr/services/g2g/kdgm/test/uetdsarizi?wsdl
 * WSDL Prod: https://servis.turkiye.gov.tr/services/g2g/kdgm/uetdsarizi?wsdl
 */
@Injectable()
export class UetdsService implements OnModuleInit {
  private readonly logger = new Logger(UetdsService.name);
  private soapClientTest: any = null;
  private soapClientProd: any = null;
  private testWsdl: string;
  private prodWsdl: string;
  private timeout: number;
  private maxRetries: number;

  constructor(
    private configService: ConfigService,
    @InjectRepository(UetdsLog)
    private uetdsLogRepo: Repository<UetdsLog>,
  ) {
    this.testWsdl = this.configService.get('uetds.testWsdl', 'https://servis.turkiye.gov.tr/services/g2g/kdgm/test/uetdsarizi?wsdl');
    this.prodWsdl = this.configService.get('uetds.prodWsdl', 'https://servis.turkiye.gov.tr/services/g2g/kdgm/uetdsarizi?wsdl');
    this.timeout = this.configService.get('uetds.timeout', 30000);
    this.maxRetries = this.configService.get('uetds.maxRetries', 3);
  }

  async onModuleInit() {
    try {
      await this.initSoapClients();
      this.logger.log(`UETDS SOAP clients initialized (Test & Prod)`);
    } catch (error) {
      this.logger.error(
        `Failed to initialize UETDS SOAP clients: ${error.message}`,
      );
    }
  }

  private async initSoapClients(): Promise<void> {
    try {
      this.soapClientTest = await soap.createClientAsync(this.testWsdl, {
        wsdl_options: { timeout: this.timeout },
      });
      this.soapClientProd = await soap.createClientAsync(this.prodWsdl, {
        wsdl_options: { timeout: this.timeout },
      });
    } catch (err) {
      this.logger.error('SOAP Client init error: ' + err.message);
    }
  }

  private getWsUser(username: string, password: string) {
    return {
      kullaniciAdi: username,
      sifre: password,
    };
  }

  private compactObject<T extends Record<string, any>>(value: T): T {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== ''),
    ) as T;
  }

  /**
   * Execute a SOAP method with retry logic and logging
   */
  private async executeSoapMethod(
    methodName: string,
    args: any,
    tenantId: string,
    tripId?: string,
    environment?: string,
  ): Promise<any> {
    const isProd = environment === 'production';
    const client = isProd ? this.soapClientProd : this.soapClientTest;
    const wsdl = isProd ? this.prodWsdl : this.testWsdl;

    if (!client) {
      await this.initSoapClients();
    }

    const currentClient = isProd ? this.soapClientProd : this.soapClientTest;
    if (!currentClient) {
      throw new Error(`UETDS ${isProd ? 'Production' : 'Test'} client is not initialized`);
    }

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.debug(
          `Calling UETDS ${isProd ? 'PROD' : 'TEST'} method: ${methodName} (attempt ${attempt})`,
        );

        // Set Basic Auth on the SOAP client
        const user = args.wsuser || args.UetdsYtsUser || (args.kullaniciAdi && args.sifre ? args : null);
        if (user) {
          currentClient.setSecurity(
            new soap.BasicAuthSecurity(user.kullaniciAdi, user.sifre),
          );
        }

        const [rawResult] = await currentClient[`${methodName}Async`](args);

        if (methodName === 'personelEkle' || methodName === 'yolcuEkleCoklu') {
          this.logger.warn(`[UETDS][DEBUG][${methodName}] args=${JSON.stringify(args)}`);
          this.logger.warn(`[UETDS][DEBUG][${methodName}] lastRequest=${currentClient.lastRequest || ''}`);
        }

        // UETDS responds with a "return" object containing the actual data
        const result = rawResult?.return || rawResult;

        const responseTimeMs = Date.now() - startTime;

        // Log request/response
        await this.logUetdsCall(
          tenantId,
          tripId,
          methodName,
          args,
          rawResult,
          responseTimeMs,
        );

        // Check for UETDS error
        if (result?.sonucKodu !== undefined && result.sonucKodu !== 0) {
          if (result.sonucKodu === 88) {
            this.logger.warn(
              `UETDS partial success for ${methodName}: ${result.sonucMesaji}`,
            );
          } else {
            this.logger.error(
              `UETDS error for ${methodName}: [${result.sonucKodu}] ${result.sonucMesaji}`,
            );
          }
        }

        return result;
      } catch (error) {
        lastError = error;
        this.logger.error(
          `UETDS call failed (attempt ${attempt}/${this.maxRetries}): ${error?.message || 'Unknown Error'}`,
        );
        if (error?.response?.data) {
          this.logger.error(`UETDS raw error response: ${error.response.data}`);
        }

        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - log the failure
    await this.logUetdsCall(
      tenantId,
      tripId,
      methodName,
      args,
      { error: lastError?.message || 'Unknown Error' },
      Date.now() - startTime,
      -1,
    );

    throw lastError;
  }

  private async logUetdsCall(
    tenantId: string,
    tripId: string | undefined,
    methodName: string,
    request: any,
    response: any,
    responseTimeMs: number,
    resultCode?: number,
  ): Promise<void> {
    try {
      // Remove passwords from logged request
      const sanitizedRequest = { ...request };
      if (sanitizedRequest.wsuser?.sifre) {
        sanitizedRequest.wsuser.sifre = '***';
      }
      if (sanitizedRequest.UetdsYtsUser?.sifre) {
        sanitizedRequest.UetdsYtsUser.sifre = '***';
      }
      if (sanitizedRequest.sifre) {
        sanitizedRequest.sifre = '***';
      }

      const log = this.uetdsLogRepo.create({
        tenantId,
        tripId,
        methodName,
        requestPayload: JSON.stringify(sanitizedRequest),
        responsePayload: JSON.stringify(response),
        resultCode: resultCode ?? response?.sonucKodu,
        resultMessage: response?.sonucMesaji || response?.error,
        referenceNumber:
          response?.uetdsSeferReferansNo ||
          response?.uetdsGrupRefNo ||
          response?.uetdsYolcuRefNo,
        responseTimeMs,
      });

      await this.uetdsLogRepo.save(log);
    } catch (error) {
      this.logger.error(`Failed to save UETDS log: ${error.message}`);
    }
  }

  // ================================================================
  // UETDS API Methods
  // ================================================================

  /** 1. Test UETDS service connectivity */
  async servisTest(
    username: string,
    password: string,
    tenantId: string,
    testMessage: string = 'ping',
    environment?: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'servisTest',
      {
        wsuser: this.getWsUser(username, password),
        testMsj1: testMessage,
      },
      tenantId,
      undefined,
      environment,
    );
  }

  /** 2. Create trip → returns uetdsSeferReferansNo */
  async seferEkle(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    seferInput: {
      aracPlaka: string;
      hareketTarihi: Date;
      hareketSaati: string;
      seferBitisTarihi: Date;
      seferBitisSaati: string;
      seferAciklama?: string;
      aracTelefonu?: string;
      firmaSeferNo?: string;
    },
    environment?: string,
  ): Promise<{
    uetdsSeferReferansNo: number;
    sonucKodu: number;
    sonucMesaji: string;
  }> {
    return this.executeSoapMethod(
      'seferEkle',
      {
        wsuser: this.getWsUser(username, password),
        ariziSeferBilgileriInput: {
          ...seferInput,
          aracPlaka: (seferInput.aracPlaka || '').trim().replace(/\s/g, ''),
          hareketTarihi: this.formatDateForUetds(seferInput.hareketTarihi),
          seferBitisTarihi: this.formatDateForUetds(seferInput.seferBitisTarihi),
        },
      },
      tenantId,
      tripId,
      environment,
    );
  }

  /** 3. Update trip */
  async seferGuncelle(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    seferInput: any,
    environment?: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'seferGuncelle',
      {
        wsuser: this.getWsUser(username, password),
        guncellenecekSeferReferansNo: uetdsSeferReferansNo,
        ariziSeferBilgileriInput: seferInput,
      },
      tenantId,
      tripId,
      environment,
    );
  }

  /** 4. Cancel trip */
  async seferIptal(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    reason: string,
    environment?: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'seferIptal',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
        iptalAciklama: reason,
      },
      tenantId,
      tripId,
      environment,
    );
  }

  /** 5. Change vehicle plate for a trip */
  async seferPlakaDegistir(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    newPlate: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'seferPlakaDegistir',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
        tasitPlakaNo: newPlate,
      },
      tenantId,
      tripId,
    );
  }

  /** 6. Reactivate cancelled trip */
  async seferAktif(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    reason: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'seferAktif',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
        aktifAciklama: reason,
      },
      tenantId,
      tripId,
    );
  }

  /** 7. Add personnel (driver/staff) to trip */
  async personelEkle(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    personnelInput: {
      turKodu: number;
      uyrukUlke: string;
      tcKimlikPasaportNo: string;
      tcKimlikPasaportno?: string;
      tcKimlikNo?: string;
      cinsiyet?: string;
      adi: string;
      soyadi: string;
      telefon?: string;
      adres?: string;
      hesKodu?: string;
    },
    environment?: string,
  ): Promise<any> {
    const personelPayload = this.compactObject({
      turKodu: personnelInput.turKodu,
      uyrukUlke: personnelInput.uyrukUlke,
      tcKimlikPasaportNo:
        personnelInput.tcKimlikPasaportNo || personnelInput.tcKimlikPasaportno,
      adi: personnelInput.adi,
      soyadi: personnelInput.soyadi,
      cinsiyet: personnelInput.cinsiyet,
      telefon: personnelInput.telefon,
    });

    return this.executeSoapMethod(
      'personelEkle',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
        seferPersonelBilgileriInput: personelPayload,
      },
      tenantId,
      tripId,
      environment,
    );
  }

  /** 8. Cancel personnel from trip */
  async personelIptal(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    tcPassportNo: string,
    reason?: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'personelIptal',
      {
        wsuser: this.getWsUser(username, password),
        iptalPersonelInput: {
          personelTCKimlikPAsaportNo: tcPassportNo,
          uetdsSeferReferansNo,
          iptalAciklama: reason || 'İptal',
        },
      },
      tenantId,
      tripId,
    );
  }

  /** 9. Add passenger group (route segment) */
  async seferGrupEkle(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    grupInput: {
      grupAdi: string;
      grupAciklama: string;
      baslangicUlke: string;
      baslangicIl?: number;
      baslangicIlce?: number;
      baslangicYer: string;
      bitisUlke: string;
      bitisIl?: number;
      bitisIlce?: number;
      bitisYer: string;
      grupUcret: string;
    },
    environment?: string,
  ): Promise<{
    uetdsGrupRefNo: number;
    sonucKodu: number;
    sonucMesaji: string;
  }> {
    return this.executeSoapMethod(
      'seferGrupEkle',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
        seferGrupBilgileriInput: grupInput,
      },
      tenantId,
      tripId,
      environment,
    );
  }

  /** 10. Add single passenger */
  async yolcuEkle(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    yolcuInput: {
      grupId: number;
      uyrukUlke: string;
      cinsiyet?: string;
      tcKimlikPasaportNo: string;
      adi: string;
      soyadı: string;
      koltukNo?: string;
      telefonNo?: string;
      hesKodu?: string;
    },
    environment?: string,
  ): Promise<{
    uetdsYolcuRefNo: string;
    sonucKodu: number;
    sonucMesaji: string;
  }> {
    return this.executeSoapMethod(
      'yolcuEkle',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
        seferYolcuBilgileriInput: yolcuInput,
      },
      tenantId,
      tripId,
      environment,
    );
  }

  /** 11. Add multiple passengers (batch) */
  async yolcuEkleCoklu(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    yolcuBilgileri: Array<{
      grupId: number;
      uyrukUlke: string;
      cinsiyet?: string;
      tcKimlikPasaportNo: string;
      adi: string;
      soyadı: string;
      koltukNo?: string;
      telefonNo?: string;
      hesKodu?: string;
    }>,
    environment?: string,
  ): Promise<{
    sonucKodu: number;
    sonucMesaji: string;
    uetdsYolcuSonuc: Array<{
      sonucKodu: number;
      sonucMesaji: string;
      sira: number;
      uetdsBiletRefNo: number;
    }>;
  }> {
    return this.executeSoapMethod(
      'yolcuEkleCoklu',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
        yolcuBilgileri: yolcuBilgileri.map((yolcu) =>
          this.compactObject({
            grupId: yolcu.grupId,
            uyrukUlke: yolcu.uyrukUlke,
            cinsiyet: yolcu.cinsiyet,
            tcKimlikPasaportNo: yolcu.tcKimlikPasaportNo,
            adi: yolcu.adi,
            soyadı: yolcu.soyadı,
            koltukNo: yolcu.koltukNo,
            telefonNo: yolcu.telefonNo,
            hesKodu: yolcu.hesKodu,
          }),
        ),
      },
      tenantId,
      tripId,
      environment,
    );
  }

  /** 12. Get trip declaration summary */
  async bildirimOzeti(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    environment?: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'bildirimOzeti',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
      },
      tenantId,
      tripId,
      environment,
    );
  }

  /** 13. Get trip detail PDF (returns byte[]) */
  async seferDetayCiktisiAl(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    environment?: string,
  ): Promise<{ sonucKodu: number; sonucMesaji: string; sonucPdf: Buffer }> {
    return this.executeSoapMethod(
      'seferDetayCiktisiAl',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
      },
      tenantId,
      tripId,
      environment,
    );
  }

  /** 14. Cancel passenger by TC/passport */
  async yolcuIptal(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
    yolcuTcPassport: string,
    koltukNo: string,
    reason: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'yolcuIptal',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
        iptalYolcuInput: {
          yolcuTCKimlikPasaportNo: yolcuTcPassport,
          koltukNo,
          iptalAciklama: reason,
        },
      },
      tenantId,
      tripId,
    );
  }

  /** 15. Validate UETDS credentials → returns firma info */
  async kullaniciKontrol(
    username: string,
    password: string,
    tenantId: string,
    environment?: string,
  ): Promise<{
    unetNo: number;
    vergiNo: string;
    firmaUnvan: string;
    sonucKodu: number;
    sonucMesaji: string;
  }> {
    return this.executeSoapMethod(
      'kullaniciKontrol',
      {
        kullaniciAdi: username,
        sifre: password,
      },
      tenantId,
      undefined,
      environment,
    );
  }

  /** 16. Check D2 license by plate */
  async yetkiBelgesiKontrol(
    username: string,
    password: string,
    tenantId: string,
    plaka: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'yetkiBelgesiKontrol',
      {
        wsuser: this.getWsUser(username, password),
        plaka,
      },
      tenantId,
    );
  }

  /** 17. Check driver SRC certificate */
  async meslekiYeterlilikSorgula(
    username: string,
    password: string,
    tenantId: string,
    kimlikNo: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'meslekiYeterlilikSorgula',
      {
        wsuser: this.getWsUser(username, password),
        kimikNo: kimlikNo,
      },
      tenantId,
    );
  }

  /** 18. Check vehicle inspection */
  async aracMuayeneSorgula(
    username: string,
    password: string,
    tenantId: string,
    plaka: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'aracMuayeneSorgula',
      {
        wsuser: this.getWsUser(username, password),
        plaka,
      },
      tenantId,
    );
  }

  /** 19. Verify identity (TC kimlik + name match) */
  async kimlikDogrulama(
    username: string,
    password: string,
    tenantId: string,
    kimlikNo: string,
    adi: string,
    soyadi: string,
  ): Promise<any> {
    return this.executeSoapMethod(
      'kimlikDogrulama',
      {
        wsuser: this.getWsUser(username, password),
        kimlikBilgileriInput: { kimlikNo, adı: adi, soyadı: soyadi },
      },
      tenantId,
    );
  }

  /** 20. List trip declarations */
  async seferBildirimListele(
    username: string,
    password: string,
    tenantId: string,
    uetdsSeferReferansNo: number,
  ): Promise<any> {
    return this.executeSoapMethod(
      'seferBildirimListele',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
      },
      tenantId,
    );
  }

  /** 21. List groups for a trip */
  async seferGrupListele(
    username: string,
    password: string,
    tenantId: string,
    tripId: string,
    uetdsSeferReferansNo: number,
  ): Promise<any> {
    return this.executeSoapMethod(
      'seferGrupListele',
      {
        wsuser: this.getWsUser(username, password),
        uetdsSeferReferansNo,
      },
      tenantId,
      tripId,
    );
  }

  private formatDateForUetds(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }
}
