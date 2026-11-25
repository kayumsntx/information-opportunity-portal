import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryTranslationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty({ example: 'bn' })
  language!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CategoryResponseDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  id!: string;

  @ApiProperty({ example: 'Study Abroad' })
  name!: string;

  @ApiProperty({ example: 'study-abroad' })
  slug!: string;

  @ApiPropertyOptional({ example: 'Opportunities for study abroad' })
  description?: string | null;

  @ApiPropertyOptional()
  iconUrl?: string | null;

  @ApiPropertyOptional()
  imageUrl?: string | null;

  @ApiProperty({ example: 0 })
  order!: number;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiPropertyOptional({ example: null })
  parentId?: string | null;

  @ApiPropertyOptional({ type: () => CategoryResponseDto })
  parent?: CategoryResponseDto | null;

  @ApiPropertyOptional({ type: () => [CategoryResponseDto] })
  children?: CategoryResponseDto[];

  @ApiPropertyOptional({ type: () => [CategoryTranslationResponseDto] })
  translations?: CategoryTranslationResponseDto[];

  @ApiPropertyOptional()
  postCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class CategoryTreeItemDto extends CategoryResponseDto {
  @ApiProperty({ type: () => [CategoryTreeItemDto] })
  declare children: CategoryTreeItemDto[];
}

export class CategoryStatsDto {
  @ApiProperty({ example: 25 })
  total!: number;

  @ApiProperty({ example: 20 })
  active!: number;

  @ApiProperty({ example: 5 })
  inactive!: number;

  @ApiProperty({ example: 6 })
  parentCount!: number;

  @ApiProperty({ example: 19 })
  childCount!: number;
}
