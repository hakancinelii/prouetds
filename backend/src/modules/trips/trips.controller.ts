import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { TripsService } from './trips.service';
import { CurrentUser, TenantId } from '../../common/decorators/user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, PassengerSource } from '../../database/entities';
import { ParserService } from '../parser/parser.service';
import { OcrService } from '../ocr/ocr.service';

@Controller('api/trips')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TripsController {
  constructor(
    private tripsService: TripsService,
    private parserService: ParserService,
    private ocrService: OcrService,
  ) { }

  @Get()
  findAll(@TenantId() tenantId: string, @Query() query: any) {
    return this.tripsService.findAll(tenantId, query);
  }

  @Get('driver/my-trips')
  @Roles(UserRole.DRIVER, UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  findMyTrips(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Query() query: any,
  ) {
    return this.tripsService.findDriverTrips(tenantId, userId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tripsService.findOne(id, tenantId);
  }

  @Post()
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  create(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: any,
  ) {
    return this.tripsService.create(tenantId, userId, data);
  }

  @Patch(':id')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() data: any,
  ) {
    return this.tripsService.update(id, tenantId, data);
  }

  @Post(':id/groups')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  addGroup(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() data: any,
  ) {
    return this.tripsService.addGroup(id, tenantId, data);
  }

  @Post(':id/personnel')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  addPersonnel(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body() data: any,
  ) {
    return this.tripsService.addPersonnel(id, tenantId, data);
  }

  @Post('groups/:groupId/passengers')
  addPassenger(
    @Param('groupId') groupId: string,
    @TenantId() tenantId: string,
    @Body() data: any,
  ) {
    return this.tripsService.addPassenger(groupId, tenantId, data);
  }

  @Post('groups/:groupId/passengers/bulk')
  addPassengersBulk(
    @Param('groupId') groupId: string,
    @TenantId() tenantId: string,
    @Body('passengers') passengers: any[],
  ) {
    return this.tripsService.addPassengersBulk(groupId, tenantId, passengers);
  }

  @Post('groups/:groupId/passengers/parse-text')
  async parseAndAddPassengers(
    @Param('groupId') groupId: string,
    @TenantId() tenantId: string,
    @Body('text') text: string,
  ) {
    const parsed = this.parserService.parsePassengerText(text);
    const passengers = parsed
      .filter((p) => p.idNumber)
      .map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        tcPassportNo: p.idNumber,
        nationalityCode: p.nationalityCode,
        source: PassengerSource.TEXT_PARSER,
      }));

    const saved = await this.tripsService.addPassengersBulk(
      groupId,
      tenantId,
      passengers,
    );

    return {
      parsed,
      saved,
      totalParsed: parsed.length,
      totalSaved: saved.length,
    };
  }

  @Post('groups/:groupId/passengers/parse-excel')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls|csv)$/)) {
          return cb(new BadRequestException('Dosya uzantısı hatalı'), false);
        }
        cb(null, true);
      },
    }),
  )
  async parseAndAddExcelPassengers(
    @Param('groupId') groupId: string,
    @TenantId() tenantId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı');

    const parsed = this.parserService.parsePassengerExcel(file.buffer);
    const passengers = parsed
      .filter((p) => p.idNumber)
      .map((p) => ({
        firstName: p.firstName,
        lastName: p.lastName,
        tcPassportNo: p.idNumber,
        nationalityCode: p.nationalityCode,
        source: PassengerSource.EXCEL,
      }));

    const saved = await this.tripsService.addPassengersBulk(
      groupId,
      tenantId,
      passengers,
    );

    return {
      success: true,
      data: saved,
      totalParsed: parsed.length,
    };
  }

  @Post('groups/:groupId/passengers/parse-passport')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|heic)$/)) {
          return cb(new BadRequestException('Sadece görsel yüklenebilir'), false);
        }
        cb(null, true);
      },
    }),
  )
  async parseAndAddPassport(
    @Param('groupId') groupId: string,
    @TenantId() tenantId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('Kamera görseli bulunamadı');

    const result = await this.ocrService.processPassportImage(file.buffer);

    // Add directly if we found passport no
    if (result.passportNo) {
      const saved = await this.tripsService.addPassenger(groupId, tenantId, {
        firstName: result.firstName,
        lastName: result.lastName,
        tcPassportNo: result.passportNo,
        nationalityCode: result.nationalityCode,
        gender: result.gender,
        source: PassengerSource.OCR,
      });
      return { success: true, mrzDetected: result.mrzDetected, passenger: saved };
    }

    throw new BadRequestException('Kimlik bilgileri tespit edilemedi. Manuel giriniz.');
  }

  @Post(':id/send-to-uetds')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR, UserRole.DRIVER)
  sendToUetds(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tripsService.sendToUetds(id, tenantId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.OPERATOR)
  cancelOnUetds(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Body('reason') reason: string,
  ) {
    return this.tripsService.cancelOnUetds(id, tenantId, reason);
  }

  @Get(':id/summary')
  getUetdsSummary(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.tripsService.getUetdsSummary(id, tenantId);
  }

  @Get(':id/pdf')
  async getUetdsPdf(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Res() res: Response,
  ) {
    const result = await this.tripsService.getUetdsPdf(id, tenantId);
    if (result.sonucPdf) {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=sefer-${id}.pdf`,
      });
      res.send(Buffer.from(result.sonucPdf));
    } else {
      res.status(400).json({ message: result.sonucMesaji });
    }
  }
}
