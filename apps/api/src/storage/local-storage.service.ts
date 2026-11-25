import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { IStorageService, UploadedFile } from './storage.interface.js';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadRoot: string;

  constructor() {
    this.uploadRoot = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadRoot)) {
      fs.mkdirSync(this.uploadRoot, { recursive: true });
    }
  }

  async uploadFile(file: UploadedFile, folder: string): Promise<string> {
    // Sanitize folder — no path traversal
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const folderPath = path.join(this.uploadRoot, safeFolder);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    const fullPath = path.join(folderPath, filename);

    fs.writeFileSync(fullPath, file.buffer);
    this.logger.log(`File saved: ${fullPath}`);

    return `/uploads/${safeFolder}/${filename}`;
  }

  async deleteFile(key: string): Promise<void> {
    // key is the relative URL path like /uploads/images/uuid.png
    const relative = key.replace(/^\/uploads\//, '');
    const fullPath = path.join(this.uploadRoot, relative);

    // Prevent path traversal
    if (!fullPath.startsWith(this.uploadRoot)) {
      this.logger.warn(`Path traversal attempt blocked: ${key}`);
      return;
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      this.logger.log(`File deleted: ${fullPath}`);
    }
  }
}
