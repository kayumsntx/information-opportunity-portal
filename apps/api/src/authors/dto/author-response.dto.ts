import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuthorStatus, AuthorType } from '../../generated/prisma/enums.js';

export class AssignedCategorySummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  categoryId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiPropertyOptional()
  iconUrl?: string | null;

  @ApiProperty()
  assignedAt!: Date;
}

export class AuthorUserSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional()
  phone?: string | null;

  @ApiProperty()
  status!: string;
}

export class AuthorProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiPropertyOptional()
  bio?: string | null;

  @ApiPropertyOptional()
  profileImage?: string | null;

  @ApiPropertyOptional()
  country?: string | null;

  @ApiPropertyOptional()
  location?: string | null;

  @ApiPropertyOptional()
  language?: string | null;

  @ApiPropertyOptional()
  website?: string | null;

  @ApiPropertyOptional()
  socialLinks?: Record<string, any> | null;

  @ApiProperty({ enum: AuthorType })
  authorType!: AuthorType;

  @ApiProperty({ enum: AuthorStatus })
  status!: AuthorStatus;

  @ApiProperty({ type: () => AuthorUserSummaryDto })
  user?: AuthorUserSummaryDto;

  @ApiProperty({ type: () => [AssignedCategorySummaryDto] })
  assignedCategories?: AssignedCategorySummaryDto[];

  @ApiPropertyOptional()
  postsCount?: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class PaginatedAuthorsResponseDto {
  @ApiProperty({ type: () => [AuthorProfileResponseDto] })
  data!: AuthorProfileResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

export class AuthorStatsDto {
  @ApiProperty({ example: 45 })
  total!: number;

  @ApiProperty({ example: 30 })
  local!: number;

  @ApiProperty({ example: 15 })
  international!: number;

  @ApiProperty({ example: 38 })
  active!: number;

  @ApiProperty({ example: 5 })
  pending!: number;

  @ApiProperty({ example: 2 })
  suspended!: number;
}
