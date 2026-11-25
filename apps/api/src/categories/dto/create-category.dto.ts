import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Name of the category',
    example: 'Study Abroad',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-friendly unique slug. If omitted, will be generated from name.',
    example: 'study-abroad',
  })
  @IsOptional()
  @IsString({ message: 'Slug must be a string' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens (e.g. study-abroad)',
  })
  @MaxLength(100, { message: 'Slug must not exceed 100 characters' })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Opportunities, guidelines, and pathways for studying abroad.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Icon URL or icon identifier',
    example: 'https://cdn.example.com/icons/study.svg',
  })
  @IsOptional()
  @IsString({ message: 'Icon URL must be a string' })
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'Featured image URL',
    example: 'https://cdn.example.com/images/study-banner.jpg',
  })
  @IsOptional()
  @IsString({ message: 'Image URL must be a string' })
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'UUID of parent category if this is a subcategory',
    example: 'e1d2c3b4-a5b6-7c8d-9e0f-1a2b3c4d5e6f',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'parentId must be a valid UUID' })
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'Display order (lower values appear first)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Order must be an integer' })
  @Min(0, { message: 'Order must be a positive integer or zero' })
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether the category is active and visible',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
