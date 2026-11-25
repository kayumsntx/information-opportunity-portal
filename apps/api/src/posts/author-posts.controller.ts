import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PostsService } from './posts.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { SubmitPostDto } from './dto/submit-post.dto.js';
import { PostQueryDto } from './dto/post-query.dto.js';

@Controller('api/v1/author/posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuthorPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @Permissions('posts.create')
  create(@Body() dto: CreatePostDto, @CurrentUser() user: { id: string }) {
    return this.postsService.createDraft(dto, user.id);
  }

  @Get()
  @Permissions('posts.read')
  findAll(@Query() query: PostQueryDto, @CurrentUser() user: { id: string }) {
    return this.postsService.findAuthorPosts(user.id, query);
  }

  @Get(':id')
  @Permissions('posts.read')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.postsService.findAuthorPostById(id, user.id);
  }

  @Patch(':id')
  @Permissions('posts.update_own')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.postsService.updateDraft(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('posts.delete_own')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.postsService.deleteDraft(id, user.id);
  }

  @Post(':id/submit')
  @Permissions('posts.submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitPostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.postsService.submitForReview(id, user.id, dto);
  }

  @Get(':id/revisions')
  @Permissions('posts.read')
  getRevisions(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.postsService.getAuthorRevisions(id, user.id);
  }

  @Get(':id/approvals')
  @Permissions('posts.read')
  getApprovals(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.postsService.getAuthorApprovals(id, user.id);
  }
}
