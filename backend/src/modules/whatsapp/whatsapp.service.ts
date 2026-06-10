import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Thin client for the local Baileys-based whatsapp-service
 * (sessions API, x-api-key auth). Single shared "Pro UETDS" session by default.
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

  defaultSessionId() {
    return (
      this.configService.get<string>('WHATSAPP_DEFAULT_SESSION_ID') ||
      'prouetds-main'
    );
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

  private async request(method: string, path: string, body?: any) {
    const res = await fetch(`${this.baseUrl()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // ---- session management (used by the super-admin WhatsApp page) ----
  async getSessionStatus(sessionId?: string) {
    const sid = sessionId || this.defaultSessionId();
    try {
      const r = await this.request('GET', `/sessions/${encodeURIComponent(sid)}/status`);
      return { sessionId: sid, ...(r.data || {}) };
    } catch (e: any) {
      return { sessionId: sid, status: 'ERROR', error: e?.message || String(e) };
    }
  }

  async connectSession(sessionId?: string) {
    const sid = sessionId || this.defaultSessionId();
    try {
      const r = await this.request('POST', `/sessions/${encodeURIComponent(sid)}/connect`);
      return { sessionId: sid, ...(r.data || {}) };
    } catch (e: any) {
      return { sessionId: sid, status: 'ERROR', error: e?.message || String(e) };
    }
  }

  async disconnectSession(sessionId?: string) {
    const sid = sessionId || this.defaultSessionId();
    try {
      const r = await this.request('DELETE', `/sessions/${encodeURIComponent(sid)}/disconnect`);
      return { sessionId: sid, ...(r.data || {}) };
    } catch (e: any) {
      return { sessionId: sid, status: 'ERROR', error: e?.message || String(e) };
    }
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
      const r = await this.request(
        'POST',
        `/sessions/${encodeURIComponent(sessionId)}/send-media`,
        { to, file: base64File, fileName, caption },
      );
      if (!r.ok) {
        this.logger.warn(
          `[WhatsApp] send-media ${r.status} (session=${sessionId}, to=${to}): ${JSON.stringify(r.data).slice(0, 200)}`,
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
