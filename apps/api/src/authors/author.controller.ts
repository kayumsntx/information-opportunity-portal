import {
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthorsService } from './authors.service.js';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto.js';
import { AuthorProfileResponseDto } from './dto/author-response.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Author / Self')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/author')
export class AuthorController {
  constructor(private readonly authorsService: AuthorsService) {}

  @Get('profile')
  @Permissions('authors.read')
  @ApiOperation({ summary: 'Get authenticated author profile' })
  @ApiResponse({
    status: 200,
    description: 'Author profile retrieved successfully',
    type: AuthorProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Author profile not found for current user',
  })
  async getMyProfile(@CurrentUser('id') userId: string): Promise<AuthorProfileResponseDto> {
    return this.authorsService.getMyProfile(userId);
  }

  @Patch('profile')
  @Permissions('authors.update')
  @ApiOperation({ summary: 'Update authenticated author profile details' })
  @ApiResponse({
    status: 200,
    description: 'Author profile updated successfully',
    type: AuthorProfileResponseDto,
  })
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateOwnProfileDto,
  ): Promise<AuthorProfileResponseDto> {
    return this.authorsService.updateMyProfile(userId, dto);
  }

  @Get('categories')
  @Permissions('categories.read')
  @ApiOperation({ summary: 'Get categories assigned to authenticated author' })
  @ApiResponse({
    status: 200,
    description: 'Assigned categories retrieved successfully',
  })
  async getMyCategories(@CurrentUser('id') userId: string) {
    return this.authorsService.getMyCategories(userId);
  }
}
