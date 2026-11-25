import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    description: 'UUID of the role to assign',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'roleId must be a valid UUID' })
  @IsNotEmpty({ message: 'roleId is required' })
  roleId!: string;
}
