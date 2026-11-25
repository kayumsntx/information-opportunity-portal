import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import { SystemRole } from '../constants/rbac.constants.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required -> allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Unauthenticated request
    if (!user) {
      throw new UnauthorizedException('Authentication required to access this resource');
    }

    const userRoles: string[] = user.roles || [];

    // SUPER_ADMIN bypasses all permission checks (safe wildcard)
    if (userRoles.includes(SystemRole.SUPER_ADMIN)) {
      return true;
    }

    const userPermissions: string[] = user.permissions || [];

    // Check if user has all required permissions
    const hasAllRequired = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllRequired) {
      throw new ForbiddenException('Forbidden resource: Missing required permissions');
    }

    return true;
  }
}
