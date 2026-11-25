import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { SystemRole } from '../constants/rbac.constants.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(SystemRole | string)[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No roles required -> allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Unauthenticated request
    if (!user) {
      throw new UnauthorizedException('Authentication required to access this resource');
    }

    const userRoles: string[] = user.roles || [];

    // SUPER_ADMIN has full platform access
    if (userRoles.includes(SystemRole.SUPER_ADMIN)) {
      return true;
    }

    // Check if user has at least one of the required roles
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Forbidden resource: Insufficient role permissions');
    }

    return true;
  }
}
