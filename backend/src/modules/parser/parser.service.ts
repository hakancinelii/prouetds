import { Injectable, Logger } from '@nestjs/common';
import * as xlsx from 'xlsx';

export interface ParsedPassenger {
  firstName: string;
  lastName: string;
  idNumber: string;
  idType: 'TC' | 'PASSPORT';
  nationalityCode: string;
  confidence: number; // 0-1
  rawLine: string;
}


@Injectable()
export class ParserService {
  private readonly logger = new Logger(ParserService.name);

  // Common country code mappings
  private readonly COUNTRY_ALIASES: Record<string, string> = {
    TR: 'TR', TURKEY: 'TR', TÜRKİYE: 'TR', TURKIYE: 'TR',
    UK: 'GB', GB: 'GB', ENGLAND: 'GB', 'UNITED KINGDOM': 'GB',
    US: 'US', USA: 'US', 'UNITED STATES': 'US',
    DE: 'DE', GERMANY: 'DE', ALMANYA: 'DE',
    FR: 'FR', FRANCE: 'FR', FRANSA: 'FR',
    ES: 'ES', SPAIN: 'ES', İSPANYA: 'ES',
    IT: 'IT', ITALY: 'IT', İTALYA: 'IT',
    RU: 'RU', RUSSIA: 'RU', RUSYA: 'RU',
    NL: 'NL', NETHERLANDS: 'NL', HOLLANDA: 'NL',
    SA: 'SA', 'SAUDI ARABIA': 'SA', 'SUUDİ ARABİSTAN': 'SA',
    AE: 'AE', UAE: 'AE', 'BAE': 'AE',
    IR: 'IR', IRAN: 'IR', İRAN: 'IR',
    IQ: 'IQ', IRAQ: 'IQ', IRAK: 'IQ',
    GE: 'GE', GEORGIA: 'GE', GÜRCİSTAN: 'GE',
    AZ: 'AZ', AZERBAIJAN: 'AZ', AZERBAYCAN: 'AZ',
    UA: 'UA', UKRAINE: 'UA', UKRAYNA: 'UA',
    BG: 'BG', BULGARIA: 'BG', BULGARİSTAN: 'BG',
    RO: 'RO', ROMANIA: 'RO', ROMANYA: 'RO',
    GR: 'GR', GREECE: 'GR', YUNANİSTAN: 'GR',
  };

  /**
   * Parse a free-text passenger list into structured passenger records.
   *
   * Supported formats:
   * - "Name Surname PassportNo CountryCode"
   * - "Name Surname 12345678901 TR"  (TC Kimlik)
   * - Tab or comma separated
   */
  parsePassengerText(text: string): ParsedPassenger[] {
    if (!text || !text.trim()) return [];

    const lines = text
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const results: ParsedPassenger[] = [];

    for (const line of lines) {
      try {
        const parsed = this.parseSingleLine(line);
        if (parsed) {
          results.push(parsed);
        } else {
          this.logger.warn(`Could not parse passenger line: "${line}"`);
          // Still add with low confidence so user can fix
          results.push({
            firstName: '',
            lastName: '',
            idNumber: '',
            idType: 'PASSPORT',
            nationalityCode: '',
            confidence: 0,
            rawLine: line,
          });
        }
      } catch (error) {
        this.logger.error(`Error parsing line "${line}": ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Parse an uploaded Excel/CSV file into structured passenger records.
   * Looks for specific columns like 'Ad', 'Soyad', 'TC' etc.
   */
  parsePassengerExcel(buffer: Buffer): ParsedPassenger[] {
    try {
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON array
      const rawData = xlsx.utils.sheet_to_json<any>(worksheet);
      const results: ParsedPassenger[] = [];

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        
        // Find possible columns by case-insensitive matching
        const findCol = (keywords: string[]): string | undefined => {
          const key = Object.keys(row).find(k => 
            keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase()))
          );
          return key ? row[key]?.toString().trim() : undefined;
        };

        const firstName = findCol(['ad', 'name', 'first']) || '';
        const lastName = findCol(['soyad', 'surname', 'last']) || '';
        const identityStr = findCol(['tc', 'kimlik', 'pasaport', 'passport', 'id']) || '';
        const nationalityStr = findCol(['uyruk', 'ülke', 'country', 'nationality']) || 'TR';

        if (!firstName && !identityStr) continue;

        // Try single line parsing approach on values to extract details properly
        const combinedString = `${firstName} ${lastName} ${identityStr} ${nationalityStr}`;
        const parsed = this.parseSingleLine(combinedString);

        if (parsed) {
          results.push(parsed);
        } else {
          // Add manually if normal parsing fails
          results.push({
            firstName: this.capitalizeWords(firstName),
            lastName: this.capitalizeWords(lastName),
            idNumber: identityStr,
            idType: identityStr.length === 11 && this.validateTcKimlik(identityStr) ? 'TC' : 'PASSPORT',
            nationalityCode: this.COUNTRY_ALIASES[nationalityStr.toUpperCase()] || 'TR',
            confidence: 0.6,
            rawLine: combinedString
          });
        }
      }
      
      return results;
    } catch (error) {
      this.logger.error(`Excel parse error: ${error.message}`);
      throw new Error('Dosya formatı hatalı veya okunamadı');
    }
  }

  private parseSingleLine(line: string): ParsedPassenger | null {
    // Normalize separators: tabs and commas to spaces
    const normalized = line.replace(/[,\t;|]+/g, ' ').replace(/\s+/g, ' ').trim();
    const tokens = normalized.split(' ');

    if (tokens.length < 3) return null;

    let idNumber = '';
    let idType: 'TC' | 'PASSPORT' = 'PASSPORT';
    let nationalityCode = '';
    let idIndex = -1;
    let countryIndex = -1;
    let confidence = 0.5;

    // Pass 1: Find ID number
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Check for TC Kimlik (11 digits, passes validation)
      if (/^\d{11}$/.test(token) && this.validateTcKimlik(token)) {
        idNumber = token;
        idType = 'TC';
        idIndex = i;
        confidence = 0.9;
        break;
      }

      // Check for passport number (alphanumeric, 6-9 chars, starts with letter or digit)
      if (/^[A-Z0-9]{6,9}$/i.test(token) && /[A-Z]/i.test(token)) {
        idNumber = token.toUpperCase();
        idType = 'PASSPORT';
        idIndex = i;
        confidence = 0.7;
        // Don't break - continue looking for TC which has higher priority
      }

      // Also detect pure numeric passport numbers (5-9 digits, not 11)
      if (/^\d{5,9}$/.test(token) && token.length !== 11) {
        if (!idNumber) {
          idNumber = token;
          idType = 'PASSPORT';
          idIndex = i;
          confidence = 0.5;
        }
      }
    }

    // Pass 2: Find country code
    for (let i = 0; i < tokens.length; i++) {
      if (i === idIndex) continue;

      const upperToken = tokens[i].toUpperCase();
      if (this.COUNTRY_ALIASES[upperToken]) {
        nationalityCode = this.COUNTRY_ALIASES[upperToken];
        countryIndex = i;
        confidence = Math.min(confidence + 0.1, 1.0);
        break;
      }
    }

    // Default nationality for TC Kimlik holders
    if (idType === 'TC' && !nationalityCode) {
      nationalityCode = 'TR';
      confidence = Math.min(confidence + 0.05, 1.0);
    }

    // Pass 3: Remaining tokens are name parts
    const nameTokens: string[] = [];
    for (let i = 0; i < tokens.length; i++) {
      if (i === idIndex || i === countryIndex) continue;
      // Skip tokens that look like numbers
      if (/^\d+$/.test(tokens[i])) continue;
      nameTokens.push(tokens[i]);
    }

    if (nameTokens.length === 0 || !idNumber) return null;

    const firstName = nameTokens[0];
    const lastName = nameTokens.slice(1).join(' ') || firstName;

    return {
      firstName: this.capitalizeWords(firstName),
      lastName: this.capitalizeWords(lastName === firstName ? '' : lastName),
      idNumber,
      idType,
      nationalityCode,
      confidence,
      rawLine: line,
    };
  }

  /**
   * Validate Turkish TC Kimlik number (basic algorithm)
   * - Must be 11 digits
   * - First digit cannot be 0
   * - Has a checksum algorithm
   */
  private validateTcKimlik(tc: string): boolean {
    if (tc.length !== 11 || tc[0] === '0') return false;

    const digits = tc.split('').map(Number);

    // Check 10th digit
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const check10 = (oddSum * 7 - evenSum) % 10;
    if (check10 !== digits[9]) return false;

    // Check 11th digit
    const sum10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
    if (sum10 % 10 !== digits[10]) return false;

    return true;
  }

  private capitalizeWords(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
