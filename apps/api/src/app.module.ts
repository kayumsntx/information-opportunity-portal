import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminModule } from './admin/admin.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { AuthorsModule } from './authors/authors.module.js';
import { PostsModule } from './posts/posts.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
    DatabaseModule,
    AuthModule,
    AdminModule,
    CategoriesModule,
    AuthorsModule,
    PostsModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
