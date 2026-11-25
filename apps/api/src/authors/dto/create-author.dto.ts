import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AuthorStatus, AuthorType } from '../../generated/prisma/enums.js';

export class CreateAuthorDto {
  @ApiProperty({
    description: 'UUID of an existing registered user to promote',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'userId must be a valid UUID' })
  @IsNotEmpty({ message: 'userId is required' })
  userId!: string;

  @ApiProperty({
    description: 'Author type',
    enum: AuthorType,
    example: AuthorType.LOCAL,
  })
  @IsEnum(AuthorType, { message: 'authorType must be either LOCAL or INTERNATIONAL' })
  @IsNotEmpty({ message: 'authorType is required' })
  authorType!: AuthorType;

  @ApiProperty({
    description: 'Public author display name',
    example: 'Dr. Rafiqul Islam',
  })
  @IsString({ message: 'displayName must be a string' })
  @IsNotEmpty({ message: 'displayName is required' })
  @MinLength(2, { message: 'displayName must be at least 2 characters long' })
  @MaxLength(100, { message: 'displayName must not exceed 100 characters' })
  displayName!: string;

  @ApiPropertyOptional({
    description: 'Author biography and background',
    example: 'Education consultant and migration advisor with 10+ years experience in European studies.',
  })
  @IsOptional()
  @IsString({ message: 'bio must be a string' })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Author profile picture URL',
    example: 'https://cdn.example.com/avatars/rafiq.jpg',
  })
  @IsOptional()
  @IsString({ message: 'profileImage must be a string' })
  profileImage?: string;

  @ApiPropertyOptional({
    description: 'Country of residence or expertise',
    example: 'Germany',
  })
  @IsOptional()
  @IsString({ message: 'country must be a string' })
  country?: string;

  @ApiPropertyOptional({
    description: 'City or regional location',
    example: 'Berlin',
  })
  @IsOptional()
  @IsString({ message: 'location must be a string' })
  location?: string;

  @ApiPropertyOptional({
    description: 'Primary writing language',
    example: 'en',
    default: 'en',
  })
  @IsOptional()
  @IsString({ message: 'language must be a string' })
  language?: string;

  @ApiPropertyOptional({
    description: 'Personal or organization website URL',
    example: 'https://dr-rafiq.com',
  })
  @IsOptional()
  @IsString({ message: 'website must be a string' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Social links (JSON object)',
    example: { linkedin: 'https://linkedin.com/in/rafiq', twitter: 'https://twitter.com/rafiq' },
  })
  @IsOptional()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Initial author status. Defaults to PENDING_REVIEW unless admin approves immediately.',
    enum: AuthorStatus,
    default: AuthorStatus.PENDING_REVIEW,
  })
  @IsOptional()
  @IsEnum(AuthorStatus, { message: 'status must be a valid AuthorStatus' })
  status?: AuthorStatus;

  @ApiPropertyOptional({
    description: 'Optional category IDs to assign immediately',
    type: [String],
    example: ['e1d2c3b4-a5b6-7c8d-9e0f-1a2b3c4d5e6f'],
  })
  @IsOptional()
  @IsArray({ message: 'categoryIds must be an array' })
  @IsUUID('4', { each: true, message: 'Each categoryId must be a valid UUID' })
  categoryIds?: string[];
}
