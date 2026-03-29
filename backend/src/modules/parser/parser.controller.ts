import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParserService } from './parser.service';

@Controller('api/parser')
@UseGuards(AuthGuard('jwt'))
export class ParserController {
  constructor(private parserService: ParserService) {}

  @Post('parse-text')
  parsePassengerText(@Body('text') text: string) {
    const results = this.parserService.parsePassengerText(text);
    return {
      success: true,
      data: results,
      totalParsed: results.length,
      highConfidence: results.filter((r) => r.confidence >= 0.7).length,
      lowConfidence: results.filter((r) => r.confidence < 0.7).length,
    };
  }
  @Post('parse-excel')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls|csv)$/)) {
          return cb(new BadRequestException('Sadece Excel ve CSV dosyaları yüklenebilir (xlsx, xls, csv)'), false);
        }
        cb(null, true);
      },
    }),
  )
  parsePassengerExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Lütfen bir dosya yükleyin');
    }

    const results = this.parserService.parsePassengerExcel(file.buffer);
    return {
      success: true,
      data: results,
      totalParsed: results.length,
      highConfidence: results.filter((r) => r.confidence >= 0.7).length,
      lowConfidence: results.filter((r) => r.confidence < 0.7).length,
    };
  }
}
