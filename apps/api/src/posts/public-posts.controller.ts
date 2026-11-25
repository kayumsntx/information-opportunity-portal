import { Controller, Get, Param, Query } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { PostQueryDto } from './dto/post-query.dto.js';

@Controller('api/v1/public/posts')
export class PublicPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(@Query() query: PostQueryDto) {
    return this.postsService.publicFindAll(query);
  }

  @Get('featured')
  findFeatured() {
    return this.postsService.publicFindFeatured();
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.postsService.publicFindBySlug(slug);
  }
}
