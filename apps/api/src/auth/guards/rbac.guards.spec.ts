import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { SystemRole } from '../constants/rbac.constants.js';

describe('RBAC Guards', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let permissionsGuard: PermissionsGuard;

  const createMockContext = (user?: any): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
    permissionsGuard = new PermissionsGuard(reflector);
  });

  describe('RolesGuard', () => {
    it('should allow access when no roles are required', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockContext();

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should throw 401 Unauthorized when request is unauthenticated', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([SystemRole.SUPER_ADMIN]);
      const context = createMockContext(undefined);

      expect(() => rolesGuard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should throw 403 Forbidden when REGISTERED_USER attempts to access SUPER_ADMIN endpoint', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([SystemRole.SUPER_ADMIN]);
      const context = createMockContext({
        id: 'user-1',
        roles: [SystemRole.REGISTERED_USER],
      });

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN to access any role-protected endpoint', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([SystemRole.CATEGORY_AUTHOR]);
      const context = createMockContext({
        id: 'admin-1',
        roles: [SystemRole.SUPER_ADMIN],
      });

      expect(rolesGuard.canActivate(context)).toBe(true);
    });

    it('should allow user when they have the matching role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([SystemRole.CATEGORY_AUTHOR]);
      const context = createMockContext({
        id: 'author-1',
        roles: [SystemRole.CATEGORY_AUTHOR],
      });

      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });

  describe('PermissionsGuard', () => {
    it('should allow access when no permissions are required', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
      const context = createMockContext();

      expect(permissionsGuard.canActivate(context)).toBe(true);
    });

    it('should throw 401 Unauthorized when request is unauthenticated', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['roles.read']);
      const context = createMockContext(undefined);

      expect(() => permissionsGuard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('should allow SUPER_ADMIN to pass all permission checks (wildcard access)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users.delete', 'settings.update']);
      const context = createMockContext({
        id: 'admin-1',
        roles: [SystemRole.SUPER_ADMIN],
        permissions: [], // Even if permissions array is empty, Super Admin passes
      });

      expect(permissionsGuard.canActivate(context)).toBe(true);
    });

    it('should throw 403 Forbidden when CATEGORY_AUTHOR attempts user-management permission (users.assign_role)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['users.assign_role']);
      const context = createMockContext({
        id: 'author-1',
        roles: [SystemRole.CATEGORY_AUTHOR],
        permissions: ['posts.create', 'posts.read', 'posts.update_own'],
      });

      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw 403 Forbidden when CATEGORY_AUTHOR attempts to approve or publish posts', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['posts.approve', 'posts.publish']);
      const context = createMockContext({
        id: 'author-1',
        roles: [SystemRole.CATEGORY_AUTHOR],
        permissions: ['posts.create', 'posts.read', 'posts.update_own', 'posts.submit'],
      });

      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw 403 Forbidden when REGISTERED_USER attempts admin permission (roles.read)', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['roles.read']);
      const context = createMockContext({
        id: 'user-1',
        roles: [SystemRole.REGISTERED_USER],
        permissions: ['posts.read'],
      });

      expect(() => permissionsGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow access when user has all required permissions', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['posts.create', 'posts.read']);
      const context = createMockContext({
        id: 'author-1',
        roles: [SystemRole.CATEGORY_AUTHOR],
        permissions: ['posts.create', 'posts.read', 'posts.update_own'],
      });

      expect(permissionsGuard.canActivate(context)).toBe(true);
    });
  });
});
