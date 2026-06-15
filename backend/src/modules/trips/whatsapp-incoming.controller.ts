import { Controller, Post, Body, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities';
import { TripsService } from './trips.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Controller('api/whatsapp')
export class WhatsappIncomingController {
  private readonly logger = new Logger(WhatsappIncomingController.name);

  constructor(
    private tripsService: TripsService,
    private whatsappService: WhatsappService,
    private configService: ConfigService,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  @Post('message-webhook')
  async handleIncoming(
    @Headers('x-api-key') apiKey: string,
    @Body() body: Record<string, any>,
  ) {
    const expectedKey = this.configService.get<string>('WHATSAPP_SERVICE_API_KEY') || '';
    if (!expectedKey || apiKey !== expectedKey) {
      throw new UnauthorizedException('Invalid webhook API key');
    }

    // fromMe: messages sent by the session itself — ignore
    if (body.fromMe === true || body.from_me === true) {
      return { ok: true, skipped: 'outbound' };
    }

    const from: string = body.from || body.sender || '';
    const rawJid: string = body.rawJid || '';
    const text: string = (body.message ?? body.body ?? body.text ?? '').trim();

    if (!from || !text) {
      return { ok: false, reason: 'missing from or text' };
    }

    // Normalize sender for DB lookup (strips @lid / @s.whatsapp.net suffixes)
    const normalized = this.whatsappService.normalizePhone(from.replace(/@.*/, ''));
    if (!normalized) {
      return { ok: false, reason: 'invalid phone' };
    }

    // For replies: prefer rawJid (preserves @lid for privacy-mode users), fallback to normalized phone
    const sendTo = rawJid && rawJid.includes('@') ? rawJid : normalized;

    this.logger.log(`[Webhook] Incoming from ${normalized}: ${text.slice(0, 100)}`);

    const sessionId = this.whatsappService.defaultSessionId();

    // Primary: find user by last 10 digits of phone (handles +90/0 prefixes)
    const suffix = normalized.slice(-10);
    let user = await this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.driver', 'driver')
      .where(`REPLACE(REPLACE(REPLACE(REPLACE(u.phone, '+', ''), '-', ''), ' ', ''), '(', '') LIKE :sfx`, {
        sfx: `%${suffix}`,
      })
      .andWhere('u.isActive = true')
      .getOne();

    // Fallback: find by stored WhatsApp JID (handles @lid privacy-mode senders)
    if (!user) {
      user = await this.userRepo
        .createQueryBuilder('u')
        .leftJoinAndSelect('u.driver', 'driver')
        .where('u.whatsappJid = :jid', { jid: normalized })
        .andWhere('u.isActive = true')
        .getOne();
    }

    if (!user) {
      this.logger.warn(`[Webhook] No user found for ${normalized}`);
      await this.whatsappService.sendText(
        sessionId,
        sendTo,
        'Sisteme kayıtlı kullanıcı bulunamadı. Lütfen yöneticinizle iletişime geçin.',
      );
      return { ok: false, reason: 'user not found' };
    }

    // Auto-save WhatsApp JID for future LID lookups
    if (user.whatsappJid !== normalized) {
      user.whatsappJid = normalized;
      await this.userRepo.save(user);
    }

    this.logger.log(`[Webhook] User: ${user.firstName} ${user.lastName} (tenant: ${user.tenantId})`);

    const noopOcr = {
      processPassportImage: async (_buf: Buffer) => ({
        mrzDetected: false,
        confidence: 0,
        firstName: '',
        lastName: '',
        passportNo: '',
        nationalityCode: '',
        gender: '',
        rawText: '',
      }),
    };

    try {
      const result = await this.tripsService.createAutopilotTrip(
        user.tenantId,
        {
          id: user.id,
          tenantId: user.tenantId,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          plateNumber: user.plateNumber,
          driverId: user.driverId,
          phone: user.phone,
        },
        { message: text, passports: [], senderJid: this.whatsappService.normalizePhone(user.phone) || sendTo },
        noopOcr,
      );

      if (!result.success) {
        const errMsg = (result as any).uetdsError
          ? `Sefer oluşturuldu ancak UETDS hatası: ${(result as any).uetdsError}`
          : 'Sefer oluşturma başarısız';
        await this.whatsappService.sendText(sessionId, sendTo, errMsg);
      }

      return { ok: result.success, tripId: result.tripId, status: result.status };
    } catch (err: any) {
      const errMsg = err?.response?.message || err?.message || 'Beklenmedik hata';
      this.logger.error(`[Webhook] Autopilot error: ${errMsg}`);
      await this.whatsappService.sendText(sessionId, sendTo, `Sefer oluşturulamadı: ${errMsg}`);
      return { ok: false, reason: errMsg };
    }
  }
}
