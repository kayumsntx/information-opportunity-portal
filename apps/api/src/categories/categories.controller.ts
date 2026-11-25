import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import {
  CategoryResponseDto,
  CategoryTreeItemDto,
} from './dto/category-response.dto.js';

@ApiTags('Categories')
@Controller('api/v1/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all active categories (flat)' })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code for translation fallback (e.g. bn, en, de)',
  })
  @ApiResponse({
    status: 200,
    description: 'Active categories retrieved successfully',
    type: [CategoryResponseDto],
  })
  async findAll(@Query('lang') lang?: string): Promise<CategoryResponseDto[]> {
    return this.categoriesService.findAll(lang);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get hierarchical tree of active categories' })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code for translation fallback (e.g. bn, en, de)',
  })
  @ApiResponse({
    status: 200,
    description: 'Category tree retrieved successfully',
    type: [CategoryTreeItemDto],
  })
  async findTree(@Query('lang') lang?: string): Promise<CategoryTreeItemDto[]> {
    return this.categoriesService.findTree(lang);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get active category by slug' })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: 'Language code for translation fallback (e.g. bn, en, de)',
  })
  @ApiResponse({
    status: 200,
    description: 'Category retrieved successfully',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Category not found or inactive',
  })
  async findBySlug(
    @Param('slug') slug: string,
    @Query('lang') lang?: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.findBySlug(slug, lang);
  }
}
