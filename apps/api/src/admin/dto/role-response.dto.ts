import { ApiProperty } from '@nestjs/swagger';

export class PermissionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  module!: string | null;
}

export class RoleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty({ type: [PermissionResponseDto] })
  permissions!: PermissionResponseDto[];

  @ApiProperty({ description: 'Number of users assigned to this role' })
  userCount!: number;

  @ApiProperty()
  createdAt!: Date;
}
