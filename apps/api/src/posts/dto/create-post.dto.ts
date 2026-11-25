import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsUrl, IsDateString } from 'class-validator';
import { ContentType } from '../../generated/prisma/enums.js';

export class CreatePostDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  featuredImage?: string;

  @IsEnum(ContentType)
  contentType!: ContentType;

  @IsOptional()
  @IsString()
  language?: string;

  @IsArray()
  @IsString({ each: true })
  categoryIds!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  sourceName?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsDateString()
  sourcePublicationDate?: string;

  @IsOptional()
  @IsDateString()
  lastVerifiedDate?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsUrl()
  canonicalUrl?: string;

  @IsOptional()
  additionalImages?: unknown;

  @IsOptional()
  attachments?: unknown;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
