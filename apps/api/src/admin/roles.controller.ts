import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RolesService } from './roles.service.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import {
  PermissionResponseDto,
  RoleResponseDto,
} from './dto/role-response.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Admin / Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/admin')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('roles')
  @Permissions('roles.read')
  @ApiOperation({ summary: 'List all system roles' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
    type: [RoleResponseDto],
  })
  async findAllRoles(): Promise<RoleResponseDto[]> {
    return this.rolesService.findAllRoles();
  }

  @Get('roles/:id')
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Get a specific role by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role retrieved successfully',
    type: RoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  async findRoleById(@Param('id') id: string): Promise<RoleResponseDto> {
    return this.rolesService.findRoleById(id);
  }

  @Get('permissions')
  @Permissions('permissions.read')
  @ApiOperation({ summary: 'List all available permissions' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions retrieved successfully',
    type: [PermissionResponseDto],
  })
  async findAllPermissions(): Promise<PermissionResponseDto[]> {
    return this.rolesService.findAllPermissions();
  }

  @Post('users/:userId/roles')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('users.assign_role')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role assigned successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or role not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already has this role',
  })
  async assignRole(
    @Param('userId') userId: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser('id') currentAdminId: string,
  ) {
    return this.rolesService.assignRoleToUser(
      userId,
      dto.roleId,
      currentAdminId,
    );
  }

  @Delete('users/:userId/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  @Permissions('users.assign_role')
  @ApiOperation({ summary: 'Revoke a role from a user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role revoked successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role assignment not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot remove the last active Super Admin',
  })
  async revokeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @CurrentUser('id') currentAdminId: string,
  ) {
    return this.rolesService.revokeRoleFromUser(
      userId,
      roleId,
      currentAdminId,
    );
  }
}
