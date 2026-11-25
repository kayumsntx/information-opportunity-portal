import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { AuthorStatus } from '../../generated/prisma/enums.js';

export class AuthorStatusDto {
  @ApiProperty({
    description: 'New status for the author',
    enum: AuthorStatus,
    example: AuthorStatus.ACTIVE,
  })
  @IsEnum(AuthorStatus, { message: 'status must be a valid AuthorStatus' })
  @IsNotEmpty({ message: 'status is required' })
  status!: AuthorStatus;
}
