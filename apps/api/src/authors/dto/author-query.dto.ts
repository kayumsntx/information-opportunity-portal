import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuthorStatus, AuthorType } from '../../generated/prisma/enums.js';

export class AuthorQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search term for name, bio, email, or country' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AuthorType })
  @IsOptional()
  @IsEnum(AuthorType)
  authorType?: AuthorType;

  @ApiPropertyOptional({ enum: AuthorStatus })
  @IsOptional()
  @IsEnum(AuthorStatus)
  status?: AuthorStatus;

  @ApiPropertyOptional({ description: 'Filter by country' })
  @IsOptional()
  @IsString()
  country?: string;
}
