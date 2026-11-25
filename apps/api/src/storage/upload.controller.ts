import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { IStorageService, STORAGE_SERVICE, UploadedFile as IUploadedFile } from './storage.interface.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const PDF_MAX_SIZE = 20 * 1024 * 1024;   // 20MB

@Controller('api/v1/upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: IStorageService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    const maxSize = file.mimetype === 'application/pdf' ? PDF_MAX_SIZE : IMAGE_MAX_SIZE;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File too large. Max allowed: ${maxSize / (1024 * 1024)}MB`,
      );
    }

    const folder = file.mimetype === 'application/pdf' ? 'documents' : 'images';

    const uploadedFile: IUploadedFile = {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    };

    const url = await this.storage.uploadFile(uploadedFile, folder);

    return { url, mimetype: file.mimetype, size: file.size };
  }
}
