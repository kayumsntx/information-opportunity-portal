import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class CategoryStatusDto {
  @ApiProperty({
    description: 'Category active status',
    example: true,
  })
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsNotEmpty({ message: 'isActive is required' })
  isActive!: boolean;
}
