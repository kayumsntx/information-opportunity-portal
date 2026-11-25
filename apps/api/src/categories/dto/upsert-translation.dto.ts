import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertTranslationDto {
  @ApiProperty({
    description: 'Language code (e.g. bn, en, de)',
    example: 'bn',
    enum: ['bn', 'en', 'de'],
  })
  @IsString({ message: 'Language must be a string' })
  @IsNotEmpty({ message: 'Language is required' })
  @IsIn(['bn', 'en', 'de'], { message: 'Language must be one of: bn, en, de' })
  language!: string;

  @ApiProperty({
    description: 'Translated category name',
    example: 'উচ্চশিক্ষা',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Translated category description',
    example: 'বিদেশে উচ্চশিক্ষার যাবতীয় তথ্য এবং সুযোগসুবিধা।',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;
}
