import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthorsService } from './authors.service.js';
import { CreateAuthorDto } from './dto/create-author.dto.js';
import { UpdateAuthorDto } from './dto/update-author.dto.js';
import { AuthorStatusDto } from './dto/author-status.dto.js';
import { AssignCategoriesDto } from './dto/assign-categories.dto.js';
import { AuthorQueryDto } from './dto/author-query.dto.js';
import {
  AuthorProfileResponseDto,
  AuthorStatsDto,
  PaginatedAuthorsResponseDto,
} from './dto/author-response.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Admin / Authors')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/admin')
export class AdminAuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get('authors/stats')
  @Permissions('authors.read')
  @ApiOperation({ summary: 'Get author dashboard statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Author statistics retrieved successfully',
    type: AuthorStatsDto,
  })
  async getAuthorStats(): Promise<AuthorStatsDto> {
    return this.authorsService.getAuthorStats();
  }

  @Post('authors')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('authors.create')
  @ApiOperation({ summary: 'Promote an existing registered user to an author' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Author profile created and CATEGORY_AUTHOR role assigned',
    type: AuthorProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already has an author profile',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  async create(
    @Body() dto: CreateAuthorDto,
    @CurrentUser('id') adminId: string,
  ): Promise<AuthorProfileResponseDto> {
    return this.authorsService.create(dto, adminId);
  }

  @Get('authors')
  @Permissions('authors.read')
  @ApiOperation({ summary: 'List authors with pagination, search, and filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authors retrieved successfully',
    type: PaginatedAuthorsResponseDto,
  })
  async findAll(@Query() query: AuthorQueryDto): Promise<PaginatedAuthorsResponseDto> {
    return this.authorsService.findAll(query);
  }

  @Get('authors/:id')
  @Permissions('authors.read')
  @ApiOperation({ summary: 'Get author profile details by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Author profile retrieved successfully',
    type: AuthorProfileResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Author profile not found',
  })
  async findById(@Param('id') id: string): Promise<AuthorProfileResponseDto> {
    return this.authorsService.findById(id);
  }

  @Patch('authors/:id')
  @Permissions('authors.update')
  @ApiOperation({ summary: 'Update author profile details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Author profile updated successfully',
    type: AuthorProfileResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAuthorDto,
    @CurrentUser('id') adminId: string,
  ): Promise<AuthorProfileResponseDto> {
    return this.authorsService.update(id, dto, adminId);
  }

  @Patch('authors/:id/status')
  @Permissions('authors.suspend')
  @ApiOperation({ summary: 'Update author status (active, suspended, inactive, pending)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Author status updated successfully',
    type: AuthorProfileResponseDto,
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AuthorStatusDto,
    @CurrentUser('id') adminId: string,
  ): Promise<AuthorProfileResponseDto> {
    return this.authorsService.updateStatus(id, dto.status, adminId);
  }

  @Post('authors/:id/categories')
  @Permissions('authors.assign_category')
  @ApiOperation({ summary: 'Assign categories to an author' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories assigned successfully',
  })
  async assignCategories(
    @Param('id') id: string,
    @Body() dto: AssignCategoriesDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.authorsService.assignCategories(id, dto.categoryIds, adminId);
  }

  @Delete('authors/:id/categories/:categoryId')
  @Permissions('authors.assign_category')
  @ApiOperation({ summary: 'Remove a category assignment from an author' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category removed from author successfully',
  })
  async removeCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.authorsService.removeCategory(id, categoryId, adminId);
  }

  @Get('authors/:id/categories')
  @Permissions('authors.read')
  @ApiOperation({ summary: 'Get all categories assigned to an author' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Author categories retrieved successfully',
  })
  async getAuthorCategories(@Param('id') id: string) {
    return this.authorsService.getAuthorCategories(id);
  }

  @Get('categories/:categoryId/authors')
  @Permissions('categories.read')
  @ApiOperation({ summary: 'Get all authors assigned to a specific category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category authors retrieved successfully',
  })
  async getAuthorsByCategory(@Param('categoryId') categoryId: string) {
    return this.authorsService.getAuthorsByCategory(categoryId);
  }
}
