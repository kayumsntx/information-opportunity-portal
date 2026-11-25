import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { PostsService } from './posts.service.js';
import { AuthorPostsController } from './author-posts.controller.js';
import { AdminPostsController } from './admin-posts.controller.js';
import { PublicPostsController } from './public-posts.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthorPostsController, AdminPostsController, PublicPostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
