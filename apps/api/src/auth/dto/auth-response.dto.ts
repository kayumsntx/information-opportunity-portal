import { ApiProperty } from '@nestjs/swagger';

export class UserProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  phone!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({ type: [String] })
  roles!: string[];

  @ApiProperty({ type: () => UserProfileResponseDto, nullable: true })
  profile!: UserProfileResponseDto | null;

  @ApiProperty()
  createdAt!: Date;
}

export class TokensResponseDto {
  @ApiProperty({ description: 'JWT Bearer Access Token' })
  accessToken!: string;

  @ApiProperty({ description: 'Opaque or Cryptographic Refresh Token' })
  refreshToken!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;

  @ApiProperty({ type: () => TokensResponseDto })
  tokens!: TokensResponseDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Operation completed successfully' })
  message!: string;
}
