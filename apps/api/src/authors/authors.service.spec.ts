import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthorsService } from './authors.service.js';
import { AuthorStatus, AuthorType } from '../generated/prisma/enums.js';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SystemRole } from '../auth/constants/rbac.constants.js';

describe('AuthorsService', () => {
  let service: AuthorsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      authorProfile: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      role: {
        findUnique: vi.fn(),
      },
      userRole: {
        upsert: vi.fn(),
      },
      category: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      categoryAuthor: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockPrisma)),
    };

    service = new AuthorsService(mockPrisma);
  });

  describe('create (promote user to author)', () => {
    it('creates author profile and assigns CATEGORY_AUTHOR role in transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        authorProfile: null,
      });

      mockPrisma.role.findUnique.mockResolvedValueOnce({
        id: 'role-author-id',
        name: SystemRole.CATEGORY_AUTHOR,
      });

      mockPrisma.authorProfile.create.mockResolvedValueOnce({
        id: 'author-1',
        userId: 'user-1',
        displayName: 'John Writer',
        authorType: AuthorType.LOCAL,
        status: AuthorStatus.PENDING_REVIEW,
      });

      // findById lookup for response
      mockPrisma.authorProfile.findUnique.mockResolvedValueOnce({
        id: 'author-1',
        userId: 'user-1',
        displayName: 'John Writer',
        authorType: AuthorType.LOCAL,
        status: AuthorStatus.PENDING_REVIEW,
        user: { id: 'user-1', email: 'user@example.com', categoryAuthors: [] },
        _count: { posts: 0 },
      });

      const result = await service.create(
        {
          userId: 'user-1',
          authorType: AuthorType.LOCAL,
          displayName: 'John Writer',
        },
        'admin-1',
      );

      expect(result.id).toBe('author-1');
      expect(mockPrisma.authorProfile.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          displayName: 'John Writer',
          authorType: AuthorType.LOCAL,
          status: AuthorStatus.PENDING_REVIEW,
        }),
      });

      expect(mockPrisma.userRole.upsert).toHaveBeenCalledWith({
        where: {
          userId_roleId: {
            userId: 'user-1',
            roleId: 'role-author-id',
          },
        },
        create: {
          userId: 'user-1',
          roleId: 'role-author-id',
          assignedBy: 'admin-1',
        },
        update: {},
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'AUTHOR_PROMOTED',
          entityId: 'author-1',
        }),
      });
    });

    it('throws ConflictException if user already has an author profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@example.com',
        authorProfile: { id: 'existing-author-id' },
      });

      await expect(
        service.create({
          userId: 'user-1',
          authorType: AuthorType.LOCAL,
          displayName: 'John Writer',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({
          userId: 'non-existent',
          authorType: AuthorType.LOCAL,
          displayName: 'John Writer',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('category assignment', () => {
    it('assigns active categories to author and avoids duplicate insertions', async () => {
      mockPrisma.authorProfile.findUnique.mockResolvedValueOnce({
        id: 'author-1',
        userId: 'user-1',
        displayName: 'John Writer',
      });

      mockPrisma.category.findMany.mockResolvedValueOnce([
        { id: 'cat-1', name: 'Jobs', isActive: true },
        { id: 'cat-2', name: 'Education', isActive: true },
      ]);

      // cat-1 is already assigned, cat-2 is new
      mockPrisma.categoryAuthor.findUnique
        .mockResolvedValueOnce({ id: 'existing-ca' }) // cat-1
        .mockResolvedValueOnce(null); // cat-2

      // for getAuthorCategories
      mockPrisma.authorProfile.findUnique.mockResolvedValueOnce({
        id: 'author-1',
        userId: 'user-1',
      });
      mockPrisma.categoryAuthor.findMany.mockResolvedValueOnce([
        {
          id: 'ca-1',
          categoryId: 'cat-1',
          category: { name: 'Jobs', slug: 'jobs', iconUrl: null, isActive: true },
          assignedAt: new Date(),
        },
        {
          id: 'ca-2',
          categoryId: 'cat-2',
          category: { name: 'Education', slug: 'education', iconUrl: null, isActive: true },
          assignedAt: new Date(),
        },
      ]);

      const result = await service.assignCategories('author-1', ['cat-1', 'cat-2'], 'admin-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.categoryAuthor.create).toHaveBeenCalledTimes(1); // Only for cat-2
    });

    it('removes a category assignment from author', async () => {
      mockPrisma.authorProfile.findUnique.mockResolvedValueOnce({
        id: 'author-1',
        userId: 'user-1',
        displayName: 'John Writer',
      });

      mockPrisma.categoryAuthor.findUnique.mockResolvedValueOnce({
        id: 'ca-1',
        categoryId: 'cat-1',
        userId: 'user-1',
      });

      const result = await service.removeCategory('author-1', 'cat-1', 'admin-1');

      expect(result.message).toContain('successfully removed');
      expect(mockPrisma.categoryAuthor.delete).toHaveBeenCalledWith({
        where: {
          categoryId_userId: {
            categoryId: 'cat-1',
            userId: 'user-1',
          },
        },
      });
    });
  });

  describe('canAuthorPostInCategory validation rule', () => {
    it('returns true when author is ACTIVE, category is active, and author is assigned', async () => {
      mockPrisma.authorProfile.findUnique.mockResolvedValueOnce({
        id: 'author-1',
        userId: 'user-1',
        status: AuthorStatus.ACTIVE,
      });

      mockPrisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        isActive: true,
      });

      mockPrisma.categoryAuthor.findUnique.mockResolvedValueOnce({
        categoryId: 'cat-1',
        userId: 'user-1',
      });

      const canPost = await service.canAuthorPostInCategory('user-1', 'cat-1');
      expect(canPost).toBe(true);
    });

    it('returns false if author is SUSPENDED', async () => {
      mockPrisma.authorProfile.findUnique.mockResolvedValueOnce({
        id: 'author-1',
        userId: 'user-1',
        status: AuthorStatus.SUSPENDED,
      });

      const canPost = await service.canAuthorPostInCategory('user-1', 'cat-1');
      expect(canPost).toBe(false);
    });

    it('returns false if author is not assigned to the category', async () => {
      mockPrisma.authorProfile.findUnique.mockResolvedValueOnce({
        id: 'author-1',
        userId: 'user-1',
        status: AuthorStatus.ACTIVE,
      });

      mockPrisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        isActive: true,
      });

      mockPrisma.categoryAuthor.findUnique.mockResolvedValueOnce(null);

      const canPost = await service.canAuthorPostInCategory('user-1', 'cat-1');
      expect(canPost).toBe(false);
    });
  });

  describe('author statistics', () => {
    it('returns correct counts', async () => {
      mockPrisma.authorProfile.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(14) // local
        .mockResolvedValueOnce(6)  // international
        .mockResolvedValueOnce(16) // active
        .mockResolvedValueOnce(3)  // pending
        .mockResolvedValueOnce(1); // suspended

      const stats = await service.getAuthorStats();

      expect(stats).toEqual({
        total: 20,
        local: 14,
        international: 6,
        active: 16,
        pending: 3,
        suspended: 1,
      });
    });
  });
});
