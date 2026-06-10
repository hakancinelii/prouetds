import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin client for the local Baileys-based whatsapp-service
 * (POST /sessions/:userId/send-media, x-api-key auth).
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private configService: ConfigService) {}

  private baseUrl() {
    return (
      this.configService.get<string>('WHATSAPP_SERVICE_URL') ||
      'http://localhost:3001'
    );
  }

  private apiKey() {
    return this.configService.get<string>('WHATSAPP_SERVICE_API_KEY') || '';
  }

  /** Normalize a Turkish phone number to WhatsApp MSISDN form (e.g. 905321234567). */
  normalizePhone(raw?: string | null): string | null {
    if (!raw) return null;
    let d = String(raw).replace(/\D/g, '');
    if (!d) return null;
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    if (d.length === 10 && d.startsWith('5')) d = '90' + d;
    return d.length >= 11 ? d : null;
  }

  /** Send a document (e.g. PDF) to a WhatsApp number via a connected session. Best-effort. */
  async sendDocument(
    sessionId: string,
    to: string,
    base64File: string,
    fileName: string,
    caption?: string,
  ): Promise<boolean> {
    if (!sessionId || !to || !base64File) return false;
    if (!this.apiKey()) {
      this.logger.warn('[WhatsApp] WHATSAPP_SERVICE_API_KEY not set, skipping send');
      return false;
    }
    try {
      const res = await fetch(
        `${this.baseUrl()}/sessions/${encodeURIComponent(sessionId)}/send-media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey(),
          },
          body: JSON.stringify({ to, file: base64File, fileName, caption }),
        },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        this.logger.warn(
          `[WhatsApp] send-media ${res.status} (session=${sessionId}, to=${to}): ${body.slice(0, 200)}`,
        );
        return false;
      }
      this.logger.log(`[WhatsApp] document sent to ${to} via session ${sessionId}`);
      return true;
    } catch (error: any) {
      this.logger.warn(`[WhatsApp] send failed: ${error?.message || error}`);
      return false;
    }
  }
}
