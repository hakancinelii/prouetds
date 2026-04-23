import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TripsService } from './trips.service';

@Controller('api/trips')
export class TripsPublicController {
  constructor(private tripsService: TripsService) {}

  @Get(':id/pdf/share')
  async getSharedUetdsPdf(
    @Param('id') id: string,
    @Query('token') token: string,
    @Query('download') download: string,
    @Res() res: Response,
  ) {
    const result = await this.tripsService.getUetdsPdfByShareToken(id, token);
    if (!result.sonucPdf) {
      return res.status(400).json({ message: result.sonucMesaji });
    }

    const pdfBuffer = Buffer.isBuffer(result.sonucPdf)
      ? result.sonucPdf
      : Buffer.from(result.sonucPdf, 'base64');

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download === '1' ? 'attachment' : 'inline'}; filename=sefer-${id}.pdf`,
      'Content-Length': String(pdfBuffer.length),
    });

    return res.send(pdfBuffer);
  }
}
