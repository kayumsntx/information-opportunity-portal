import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoriesService } from './categories.service.js';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      category: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      categoryTranslation: {
        upsert: vi.fn(),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      },
    };

    service = new CategoriesService(mockPrisma);
  });

  describe('create', () => {
    it('creates a category with auto-generated slug', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce(null); // slug check
      mockPrisma.category.create.mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Jobs',
        slug: 'jobs',
        order: 0,
        isActive: true,
        parentId: null,
      });

      const result = await service.create({ name: 'Jobs' }, 'admin-1');

      expect(result.id).toBe('cat-1');
      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Jobs',
          slug: 'jobs',
          parentId: null,
          isActive: true,
        }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CATEGORY_CREATED',
          entityId: 'cat-1',
        }),
      });
    });

    it('throws ConflictException if slug already exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce({ id: 'existing-id', slug: 'jobs' });

      await expect(service.create({ name: 'Jobs', slug: 'jobs' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('validates parent category exists when parentId is provided', async () => {
      mockPrisma.category.findUnique
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // parent check

      await expect(
        service.create({ name: 'Government Jobs', parentId: 'non-existent-parent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update & circular check', () => {
    it('prevents a category from being its own parent', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce({ id: 'cat-1', slug: 'jobs' });

      await expect(
        service.update('cat-1', { parentId: 'cat-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('detects and rejects circular parent relationships', async () => {
      // Trying to make cat-1 a child of cat-3, where cat-3's parent is cat-2, and cat-2's parent is cat-1
      mockPrisma.category.findUnique
        .mockResolvedValueOnce({ id: 'cat-1', slug: 'jobs' }) // existing category check
        .mockResolvedValueOnce({ id: 'cat-3', name: 'Cat 3' }) // parent existence check
        .mockResolvedValueOnce({ parentId: 'cat-2' }) // cat-3 lookup
        .mockResolvedValueOnce({ parentId: 'cat-1' }); // cat-2 lookup -> references cat-1!

      await expect(
        service.update('cat-1', { parentId: 'cat-3' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete safety checks', () => {
    it('prevents deletion if category contains subcategories', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Jobs',
        children: [{ id: 'child-1' }],
        postCategories: [],
      });

      await expect(service.delete('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('prevents deletion if category contains posts', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Jobs',
        children: [],
        postCategories: [{ id: 'pc-1' }],
      });

      await expect(service.delete('cat-1')).rejects.toThrow(BadRequestException);
    });

    it('deletes category safely when no posts and no subcategories exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce({
        id: 'cat-1',
        name: 'Jobs',
        slug: 'jobs',
        children: [],
        postCategories: [],
      });
      mockPrisma.category.delete.mockResolvedValueOnce({ id: 'cat-1' });

      const result = await service.delete('cat-1', 'admin-1');

      expect(result.id).toBe('cat-1');
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'CATEGORY_DELETED' }),
      });
    });
  });

  describe('multilingual support and tree generation', () => {
    it('applies translation fallback for requested language', async () => {
      mockPrisma.category.findMany.mockResolvedValueOnce([
        {
          id: 'cat-1',
          name: 'Education',
          slug: 'education',
          description: 'English description',
          iconUrl: null,
          imageUrl: null,
          order: 0,
          isActive: true,
          parentId: null,
          parent: null,
          translations: [
            {
              id: 't-1',
              language: 'bn',
              name: 'শিক্ষা',
              description: 'বাংলা বিবরণ',
            },
          ],
          _count: { postCategories: 5, children: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findAll('bn');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('শিক্ষা');
      expect(result[0].description).toBe('বাংলা বিবরণ');
    });

    it('falls back to default name if translation for requested language is missing', async () => {
      mockPrisma.category.findMany.mockResolvedValueOnce([
        {
          id: 'cat-1',
          name: 'Education',
          slug: 'education',
          description: 'English description',
          iconUrl: null,
          imageUrl: null,
          order: 0,
          isActive: true,
          parentId: null,
          parent: null,
          translations: [],
          _count: { postCategories: 0, children: 0 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findAll('de');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Education');
    });

    it('findTree structures nested parent and child categories', async () => {
      mockPrisma.category.findMany.mockResolvedValueOnce([
        {
          id: 'cat-root',
          name: 'Jobs',
          slug: 'jobs',
          order: 1,
          isActive: true,
          parentId: null,
          translations: [],
          _count: { postCategories: 0 },
        },
        {
          id: 'cat-child',
          name: 'Gov Jobs',
          slug: 'gov-jobs',
          order: 1,
          isActive: true,
          parentId: 'cat-root',
          translations: [],
          _count: { postCategories: 0 },
        },
      ]);

      const tree = await service.findTree();

      expect(tree).toHaveLength(1);
      expect(tree[0].id).toBe('cat-root');
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('cat-child');
    });
  });

  describe('category statistics', () => {
    it('returns correct counts', async () => {
      mockPrisma.category.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(2)  // inactive
        .mockResolvedValueOnce(3)  // parentCount
        .mockResolvedValueOnce(7); // childCount

      const stats = await service.getCategoryStats();

      expect(stats).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        parentCount: 3,
        childCount: 7,
      });
    });
  });
});
