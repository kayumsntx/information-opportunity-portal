import { Module } from '@nestjs/common';
import { STORAGE_SERVICE } from './storage.interface.js';
import { LocalStorageService } from './local-storage.service.js';
import { UploadController } from './upload.controller.js';

@Module({
  controllers: [UploadController],
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: LocalStorageService,
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
