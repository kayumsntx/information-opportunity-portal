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
import { UpdatePostDto } from './dto/update-post.dto.js';
import { ApprovePostDto } from './dto/approve-post.dto.js';
import { RejectPostDto } from './dto/reject-post.dto.js';
import { RequestChangesDto } from './dto/request-changes.dto.js';
import { PostQueryDto } from './dto/post-query.dto.js';

@Controller('api/v1/admin/posts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminPostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @Permissions('posts.read')
  findAll(@Query() query: PostQueryDto) {
    return this.postsService.adminFindAll(query);
  }

  @Get('pending')
  @Permissions('posts.approve')
  findPending() {
    return this.postsService.findPending();
  }

  @Get('stats')
  @Permissions('posts.read')
  getStats() {
    return this.postsService.getPostStats();
  }

  @Get(':id')
  @Permissions('posts.read')
  findOne(@Param('id') id: string) {
    return this.postsService.adminFindById(id);
  }

  @Patch(':id')
  @Permissions('posts.update_any')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.postsService.adminUpdate(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('posts.delete_any')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.postsService.adminDelete(id, user.id);
  }

  @Post(':id/approve')
  @Permissions('posts.approve')
  approve(
    @Param('id') id: string,
    @Body() dto: ApprovePostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.postsService.approvePost(id, user.id, dto);
  }

  @Post(':id/reject')
  @Permissions('posts.reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPostDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.postsService.rejectPost(id, user.id, dto);
  }

  @Post(':id/request-changes')
  @Permissions('posts.reject')
  requestChanges(
    @Param('id') id: string,
    @Body() dto: RequestChangesDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.postsService.requestChanges(id, user.id, dto);
  }

  @Post(':id/publish')
  @Permissions('posts.publish')
  publish(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.postsService.publishPost(id, user.id);
  }

  @Post(':id/unpublish')
  @Permissions('posts.publish')
  unpublish(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.postsService.unpublishPost(id, user.id);
  }

  @Post(':id/archive')
  @Permissions('posts.archive')
  archive(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.postsService.archivePost(id, user.id);
  }

  @Get(':id/revisions')
  @Permissions('posts.read')
  getRevisions(@Param('id') id: string) {
    return this.postsService.getPostRevisions(id);
  }
}
