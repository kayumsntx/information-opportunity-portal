import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateOwnProfileDto {
  @ApiPropertyOptional({
    description: 'Public author display name',
  })
  @IsOptional()
  @IsString({ message: 'displayName must be a string' })
  @MinLength(2, { message: 'displayName must be at least 2 characters long' })
  @MaxLength(100, { message: 'displayName must not exceed 100 characters' })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Author biography',
  })
  @IsOptional()
  @IsString({ message: 'bio must be a string' })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Profile photo URL',
  })
  @IsOptional()
  @IsString({ message: 'profileImage must be a string' })
  profileImage?: string;

  @ApiPropertyOptional({
    description: 'Country',
  })
  @IsOptional()
  @IsString({ message: 'country must be a string' })
  country?: string;

  @ApiPropertyOptional({
    description: 'Location',
  })
  @IsOptional()
  @IsString({ message: 'location must be a string' })
  location?: string;

  @ApiPropertyOptional({
    description: 'Language',
  })
  @IsOptional()
  @IsString({ message: 'language must be a string' })
  language?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
  })
  @IsOptional()
  @IsString({ message: 'website must be a string' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Social links (JSON object)',
  })
  @IsOptional()
  socialLinks?: Record<string, string>;
}
