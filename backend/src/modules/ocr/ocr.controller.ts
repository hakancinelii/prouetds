import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { OcrService } from './ocr.service';

@Controller('api/ocr')
@UseGuards(AuthGuard('jwt'))
export class OcrController {
  constructor(private ocrService: OcrService) {}

  @Post('passport')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|png|webp|heic)$/)) {
          return cb(new Error('Sadece JPEG, PNG, WebP formatları desteklenir'), false);
        }
        cb(null, true);
      },
    }),
  )
  async processPassport(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { success: false, message: 'Dosya yüklenmedi' };
    }

    const result = await this.ocrService.processPassportImage(file.buffer);

    return {
      success: true,
      data: result,
      message: result.mrzDetected
        ? 'MRZ tespit edildi - yüksek doğruluk'
        : 'Metin tabanlı çıkarım - lütfen kontrol edin',
    };
  }
}
