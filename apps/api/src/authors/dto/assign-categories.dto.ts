import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class AssignCategoriesDto {
  @ApiProperty({
    description: 'Array of category UUIDs to assign to this author',
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000'],
  })
  @IsArray({ message: 'categoryIds must be an array' })
  @ArrayNotEmpty({ message: 'categoryIds array must not be empty' })
  @IsUUID('4', { each: true, message: 'Each categoryId must be a valid UUID' })
  categoryIds!: string[];
}
