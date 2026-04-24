import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OcrPassengerResult {
  firstName: string;
  lastName: string;
  passportNo: string;
  nationalityCode: string;
  gender: string;
  dateOfBirth?: string;
  expiryDate?: string;
  mrzDetected: boolean;
  confidence: number;
  rawText: string;
}

/**
 * OCR Service for extracting passenger information from passport/ID photos.
 * Supports:
 * 1. MRZ (Machine Readable Zone) parsing - most reliable
 * 2. Full-text OCR with regex extraction - fallback
 *
 * MRZ Format (2-line):
 * P<CCCSSSSSS<<FFFFFFFFF<<<<<<<<<<<<<<<<<<<<<
 * PPPPPPPPPCCCCCCMMMDDDDDDDDDDDDDDDDDDDDDDDDD
 *
 * Where:
 * C = Country code, S = Surname, F = First name
 * P = Passport number, M = Sex, D = Date digits
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private configService: ConfigService) { }

  /**
   * Process an image buffer and extract passenger information.
   * Uses Google Vision API or AWS Textract based on config.
   */
  async processPassportImage(imageBuffer: Buffer): Promise<OcrPassengerResult> {
    const provider = this.configService.get('ocr.provider', 'google-vision');

    let rawText: string;

    if (provider === 'google-vision') {
      rawText = await this.googleVisionOcr(imageBuffer);
    } else if (provider === 'tesseract') {
      rawText = await this.tesseractOcr(imageBuffer);
    } else {
      rawText = await this.awsTextractOcr(imageBuffer);
    }

    if (!rawText.trim()) {
      rawText = await this.tesseractOcr(imageBuffer);
    }

    this.logger.debug(`OCR raw text: ${rawText.substring(0, 200)}...`);

    // Try MRZ first (most reliable)
    const mrzResult = this.parseMrz(rawText);
    if (mrzResult) {
      return {
        ...mrzResult,
        mrzDetected: true,
        confidence: 0.95,
        rawText,
      };
    }

    // Fallback: regex extraction from full text
    const regexResult = this.parseFullText(rawText);
    return {
      ...regexResult,
      mrzDetected: false,
      confidence: 0.6,
      rawText,
    };
  }

  /**
   * Google Vision API OCR
   */
  private async googleVisionOcr(imageBuffer: Buffer): Promise<string> {
    try {
      // Dynamic import to avoid requiring the package at startup
      const vision = require('@google-cloud/vision');
      const client = new vision.ImageAnnotatorClient();

      const [result] = await client.textDetection({
        image: { content: imageBuffer.toString('base64') },
      });

      const detections = result.textAnnotations;
      if (!detections || detections.length === 0) {
        return '';
      }

      return detections[0].description || '';
    } catch (error) {
      this.logger.error(`Google Vision OCR failed: ${this.getErrorMessage(error)}`);
      return '';
    }
  }

  private async tesseractOcr(imageBuffer: Buffer): Promise<string> {
    try {
      const { recognize } = require('tesseract.js');
      const result = await recognize(imageBuffer, 'eng');
      return result?.data?.text || '';
    } catch (error) {
      this.logger.error(`Tesseract OCR failed: ${this.getErrorMessage(error)}`);
      return '';
    }
  }

  /**
   * AWS Textract OCR (placeholder)
   */
  private async awsTextractOcr(imageBuffer: Buffer): Promise<string> {
    void imageBuffer;
    this.logger.warn('AWS Textract not yet implemented, returning empty');
    return '';
  }

  /**
   * Parse MRZ (Machine Readable Zone) lines from OCR text.
   * Supports TD3 (passport, 2 lines of 44 chars) and TD1 (ID card, 3 lines of 30 chars)
   */
  private parseMrz(
    text: string,
  ): Omit<OcrPassengerResult, 'mrzDetected' | 'confidence' | 'rawText'> | null {
    const lines = text.split('\n').map((l) => l.replace(/\s/g, '').toUpperCase());

    // Find MRZ lines (TD3 format: 2 lines of ~44 chars starting with P)
    let mrzLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // TD3 first line starts with P< or P and is ~44 chars
      if (/^P[<A-Z]/.test(line) && line.length >= 40) {
        if (i + 1 < lines.length && lines[i + 1].length >= 40) {
          mrzLines = [line.padEnd(44, '<'), lines[i + 1].padEnd(44, '<')];
          break;
        }
      }
    }

    if (mrzLines.length !== 2) return null;

    try {
      const line1 = mrzLines[0];
      const line2 = mrzLines[1];

      // Line 1: P<CCCNAME<<SURNAME<<<<<<
      const countryCode = line1.substring(2, 5).replace(/</g, '');

      const namePart = line1.substring(5);
      const nameSplit = namePart.split('<<');
      const lastName = (nameSplit[0] || '').replace(/</g, ' ').trim();
      const firstName = (nameSplit[1] || '').replace(/</g, ' ').trim();

      // Line 2: PASSPORTNO#C...
      const passportNo = line2.substring(0, 9).replace(/</g, '').trim();
      const nationality = line2.substring(10, 13).replace(/</g, '');
      const birthDate = line2.substring(13, 19); // YYMMDD
      const sex = line2.substring(20, 21); // M or F
      const expiryDate = line2.substring(21, 27); // YYMMDD

      // Validate we got meaningful data
      if (!firstName || !lastName || !passportNo) return null;

      return {
        firstName: this.capitalizeWords(firstName),
        lastName: this.capitalizeWords(lastName),
        passportNo,
        nationalityCode: this.mapCountryCode(nationality || countryCode),
        gender: sex === 'M' ? 'E' : sex === 'F' ? 'K' : '',
        dateOfBirth: this.formatMrzDate(birthDate),
        expiryDate: this.formatMrzDate(expiryDate),
      };
    } catch (error) {
      this.logger.error(`MRZ parsing error: ${this.getErrorMessage(error)}`);
      return null;
    }
  }

  /**
   * Fallback: Extract passenger info from full OCR text using regex
   */
  private parseFullText(
    text: string,
  ): Omit<OcrPassengerResult, 'mrzDetected' | 'confidence' | 'rawText'> {
    const result: any = {
      firstName: '',
      lastName: '',
      passportNo: '',
      nationalityCode: '',
      gender: '',
    };

    // Try to find passport number: alphanumeric, 6-9 chars
    const passportMatch = text.match(
      /(?:passport|pasaport|no|number)[:\s]*([A-Z0-9]{6,9})/i,
    );
    if (passportMatch) {
      result.passportNo = passportMatch[1].toUpperCase();
    } else {
      // Generic pattern: standalone alphanumeric 6-9 chars
      const genericMatch = text.match(/\b([A-Z]{1,2}\d{6,8})\b/);
      if (genericMatch) result.passportNo = genericMatch[1];
    }

    // Try to find name
    const nameMatch = text.match(
      /(?:ad[ıi]?|name|given\s*name)[:\s]*([A-ZÇĞİÖŞÜa-zçğıöşü\s]+)/i,
    );
    if (nameMatch) {
      result.firstName = nameMatch[1].trim().split(/\s+/)[0];
    }

    const surnameMatch = text.match(
      /(?:soyad[ıi]?|surname|family\s*name)[:\s]*([A-ZÇĞİÖŞÜa-zçğıöşü\s]+)/i,
    );
    if (surnameMatch) {
      result.lastName = surnameMatch[1].trim().split(/\s+/)[0];
    }

    const natMatch = text.match(
      /(?:nationality|uyruk|uyruğu)[:\s]*([A-ZÇĞİÖŞÜa-zçğıöşü\s]{2,40})/i,
    );
    if (natMatch) {
      result.nationalityCode = this.mapCountryCode(natMatch[1]);
    } else {
      result.nationalityCode = this.inferCountryCodeFromText(text);
    }

    // Gender
    if (/\b(MALE|ERKEK)\b/i.test(text)) result.gender = 'E';
    else if (/\b(FEMALE|KADIN)\b/i.test(text)) result.gender = 'K';

    return result;
  }

  private formatMrzDate(mrzDate: string): string {
    if (mrzDate.length !== 6) return '';
    const yy = parseInt(mrzDate.substring(0, 2));
    const year = yy > 50 ? 1900 + yy : 2000 + yy;
    return `${mrzDate.substring(4, 6)}/${mrzDate.substring(2, 4)}/${year}`;
  }

  private inferCountryCodeFromText(text: string): string {
    const normalized = text.toUpperCase().replace(/[^A-ZÇĞİÖŞÜ]+/g, ' ');
    const entries: Array<[RegExp, string]> = [
      [/SAUDI\s+ARABIA|SAUDI\s+ARABIAN|ARABIE\s+SAOUDITE/, 'SA'],
      [/UNITED\s+ARAB\s+EMIRATES|UAE|EMIRATI/, 'AE'],
      [/UNITED\s+STATES|USA|AMERICAN/, 'US'],
      [/UNITED\s+KINGDOM|BRITISH|GREAT\s+BRITAIN/, 'GB'],
      [/TURKEY|TURKIYE|TÜRKİYE|TURKISH|TÜRK/, 'TR'],
      [/GERMANY|GERMAN|DEUTSCHLAND/, 'DE'],
      [/FRANCE|FRENCH|FRANCAISE|FRANÇAISE/, 'FR'],
      [/RUSSIA|RUSSIAN/, 'RU'],
      [/NETHERLANDS|DUTCH/, 'NL'],
      [/ITALY|ITALIAN/, 'IT'],
      [/SPAIN|SPANISH/, 'ES'],
      [/IRAN|IRANIAN/, 'IR'],
      [/IRAQ|IRAQI/, 'IQ'],
      [/GEORGIA|GEORGIAN/, 'GE'],
      [/AZERBAIJAN|AZERI|AZERBAIJANI/, 'AZ'],
      [/UKRAINE|UKRAINIAN/, 'UA'],
      [/BULGARIA|BULGARIAN/, 'BG'],
      [/ROMANIA|ROMANIAN/, 'RO'],
      [/GREECE|GREEK/, 'GR'],
      [/KAZAKHSTAN|KAZAKH/, 'KZ'],
      [/UZBEKISTAN|UZBEK/, 'UZ'],
      [/TURKMENISTAN|TURKMEN/, 'TM'],
      [/SYRIA|SYRIAN/, 'SY'],
      [/JORDAN|JORDANIAN/, 'JO'],
      [/LEBANON|LEBANESE/, 'LB'],
    ];

    return entries.find(([pattern]) => pattern.test(normalized))?.[1] || '';
  }

  private mapCountryCode(code: string): string {
    const map: Record<string, string> = {
      TUR: 'TR', TURKIYE: 'TR', TÜRKİYE: 'TR', TURKISH: 'TR',
      GBR: 'GB', BRITISH: 'GB', USA: 'US', AMERICAN: 'US',
      DEU: 'DE', GERMANY: 'DE', GERMAN: 'DE', FRA: 'FR', FRANCE: 'FR', FRENCH: 'FR',
      ITA: 'IT', ITALY: 'IT', ITALIAN: 'IT', ESP: 'ES', SPAIN: 'ES', SPANISH: 'ES',
      RUS: 'RU', RUSSIA: 'RU', RUSSIAN: 'RU', NLD: 'NL', NETHERLANDS: 'NL', DUTCH: 'NL',
      SAU: 'SA', SAUDI: 'SA', 'SAUDI ARABIA': 'SA', 'SAUDI ARABIAN': 'SA',
      ARE: 'AE', UAE: 'AE', 'UNITED ARAB EMIRATES': 'AE', EMIRATI: 'AE',
      IRN: 'IR', IRAN: 'IR', IRANIAN: 'IR', IRQ: 'IQ', IRAQ: 'IQ', IRAQI: 'IQ',
      GEO: 'GE', GEORGIA: 'GE', GEORGIAN: 'GE', AZE: 'AZ', AZERBAIJAN: 'AZ', AZERI: 'AZ',
      UKR: 'UA', UKRAINE: 'UA', UKRAINIAN: 'UA', BGR: 'BG', BULGARIA: 'BG', BULGARIAN: 'BG',
      ROU: 'RO', ROMANIA: 'RO', ROMANIAN: 'RO', GRC: 'GR', GREECE: 'GR', GREEK: 'GR',
      KAZ: 'KZ', KAZAKHSTAN: 'KZ', KAZAKH: 'KZ', UZB: 'UZ', UZBEKISTAN: 'UZ', UZBEK: 'UZ',
      TKM: 'TM', TURKMENISTAN: 'TM', TURKMEN: 'TM', SYR: 'SY', SYRIA: 'SY', SYRIAN: 'SY',
      JOR: 'JO', JORDAN: 'JO', JORDANIAN: 'JO', LBN: 'LB', LEBANON: 'LB', LEBANESE: 'LB',
    };
    const upper = code.toUpperCase().replace(/[^A-ZÇĞİÖŞÜ]+/g, ' ').trim();
    return map[upper] || (upper.length === 2 ? upper : upper.substring(0, 2));
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private capitalizeWords(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
