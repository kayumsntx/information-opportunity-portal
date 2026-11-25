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
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryStatusDto } from './dto/category-status.dto.js';
import { UpsertTranslationDto } from './dto/upsert-translation.dto.js';
import { CategoryStatsDto } from './dto/category-response.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Admin / Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('stats')
  @Permissions('categories.read')
  @ApiOperation({ summary: 'Get category dashboard statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category stats retrieved',
    type: CategoryStatsDto,
  })
  async getCategoryStats(): Promise<CategoryStatsDto> {
    return this.categoriesService.getCategoryStats();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('categories.create')
  @ApiOperation({ summary: 'Create a new category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category slug already exists',
  })
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.categoriesService.create(dto, adminId);
  }

  @Get()
  @Permissions('categories.read')
  @ApiOperation({ summary: 'List all categories for admin (including inactive)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories retrieved successfully',
  })
  async adminFindAll() {
    return this.categoriesService.adminFindAll();
  }

  @Get(':id')
  @Permissions('categories.read')
  @ApiOperation({ summary: 'Get category details by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async adminFindById(@Param('id') id: string) {
    return this.categoriesService.adminFindById(id);
  }

  @Patch(':id')
  @Permissions('categories.update')
  @ApiOperation({ summary: 'Update category details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid parent category or circular reference detected',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.categoriesService.update(id, dto, adminId);
  }

  @Patch(':id/status')
  @Permissions('categories.update')
  @ApiOperation({ summary: 'Activate or deactivate a category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category status updated successfully',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: CategoryStatusDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.categoriesService.updateStatus(id, dto.isActive, adminId);
  }

  @Delete(':id')
  @Permissions('categories.delete')
  @ApiOperation({ summary: 'Delete a category safely' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete category containing child categories or posts',
  })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.categoriesService.delete(id, adminId);
  }

  @Put(':id/translations')
  @Permissions('categories.update')
  @ApiOperation({ summary: 'Add or update translation for a category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category translation upserted successfully',
  })
  async upsertTranslation(
    @Param('id') id: string,
    @Body() dto: UpsertTranslationDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.categoriesService.upsertTranslation(id, dto, adminId);
  }
}
