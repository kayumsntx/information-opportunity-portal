import { Module } from '@nestjs/common';
import { AuthorsService } from './authors.service.js';
import { AdminAuthorsController } from './admin-authors.controller.js';
import { AuthorController } from './author.controller.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminAuthorsController, AuthorController],
  providers: [AuthorsService],
  exports: [AuthorsService],
})
export class AuthorsModule {}
