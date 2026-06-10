import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../database/entities';
import { WhatsappService } from './whatsapp.service';

@Controller('api/whatsapp')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class WhatsappController {
  constructor(private whatsappService: WhatsappService) {}

  @Get('session/status')
  status() {
    return this.whatsappService.getSessionStatus();
  }

  @Post('session/connect')
  connect() {
    return this.whatsappService.connectSession();
  }

  @Post('session/disconnect')
  disconnect() {
    return this.whatsappService.disconnectSession();
  }
}
