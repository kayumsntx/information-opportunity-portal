import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { UpsertTranslationDto } from './dto/upsert-translation.dto.js';
import {
  CategoryResponseDto,
  CategoryStatsDto,
  CategoryTreeItemDto,
} from './dto/category-response.dto.js';

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Apply language translation fallback to category name and description.
   */
  private applyTranslation<T extends {
    name: string;
    description?: string | null;
    translations?: Array<{ language: string; name: string; description?: string | null }>;
  }>(item: T, lang?: string): T {
    if (!lang || !item.translations || item.translations.length === 0) {
      return item;
    }

    const translation = item.translations.find((t) => t.language.toLowerCase() === lang.toLowerCase());
    if (translation) {
      return {
        ...item,
        name: translation.name,
        description: translation.description ?? item.description,
      };
    }

    return item;
  }

  // ==========================================================================
  // PUBLIC APIS
  // ==========================================================================

  /**
   * List all active categories (flat list).
   */
  async findAll(lang?: string): Promise<CategoryResponseDto[]> {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        translations: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            postCategories: true,
            children: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return categories.map((cat) => {
      const transformed = this.applyTranslation(cat, lang);
      return {
        id: transformed.id,
        name: transformed.name,
        slug: transformed.slug,
        description: transformed.description,
        iconUrl: transformed.iconUrl,
        imageUrl: transformed.imageUrl,
        order: transformed.order,
        isActive: transformed.isActive,
        parentId: transformed.parentId,
        parent: transformed.parent as any,
        postCount: transformed._count.postCategories,
        createdAt: transformed.createdAt,
        updatedAt: transformed.updatedAt,
      };
    });
  }

  /**
   * Return hierarchical tree of active categories.
   */
  async findTree(lang?: string): Promise<CategoryTreeItemDto[]> {
    const allActive = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        translations: true,
        _count: {
          select: {
            postCategories: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    // Translate each category first
    const translatedList = allActive.map((cat) => {
      const translated = this.applyTranslation(cat, lang);
      return {
        id: translated.id,
        name: translated.name,
        slug: translated.slug,
        description: translated.description,
        iconUrl: translated.iconUrl,
        imageUrl: translated.imageUrl,
        order: translated.order,
        isActive: translated.isActive,
        parentId: translated.parentId,
        postCount: translated._count.postCategories,
        createdAt: translated.createdAt,
        updatedAt: translated.updatedAt,
        children: [] as CategoryTreeItemDto[],
      };
    });

    // Map by ID
    const map = new Map<string, CategoryTreeItemDto>();
    for (const item of translatedList) {
      map.set(item.id, item);
    }

    const tree: CategoryTreeItemDto[] = [];

    for (const item of translatedList) {
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(item);
      } else {
        tree.push(item);
      }
    }

    return tree;
  }

  /**
   * Get single active category by slug.
   */
  async findBySlug(slug: string, lang?: string): Promise<CategoryResponseDto> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        translations: true,
        parent: true,
        children: {
          where: { isActive: true },
          include: { translations: true },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            postCategories: true,
          },
        },
      },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }

    const transformed = this.applyTranslation(category, lang);
    const translatedChildren = (category.children || []).map((child) =>
      this.applyTranslation(child, lang),
    );

    return {
      id: transformed.id,
      name: transformed.name,
      slug: transformed.slug,
      description: transformed.description,
      iconUrl: transformed.iconUrl,
      imageUrl: transformed.imageUrl,
      order: transformed.order,
      isActive: transformed.isActive,
      parentId: transformed.parentId,
      parent: transformed.parent as any,
      children: translatedChildren as any,
      translations: transformed.translations as any,
      postCount: transformed._count.postCategories,
      createdAt: transformed.createdAt,
      updatedAt: transformed.updatedAt,
    };
  }

  // ==========================================================================
  // ADMIN APIS
  // ==========================================================================

  /**
   * List all categories for Admin (flat or with child relations).
   */
  async adminFindAll() {
    const categories = await this.prisma.category.findMany({
      include: {
        translations: true,
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            children: true,
            postCategories: true,
            categoryAuthors: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      iconUrl: cat.iconUrl,
      imageUrl: cat.imageUrl,
      order: cat.order,
      isActive: cat.isActive,
      parentId: cat.parentId,
      parent: cat.parent,
      translations: cat.translations,
      childrenCount: cat._count.children,
      postsCount: cat._count.postCategories,
      authorsCount: cat._count.categoryAuthors,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    }));
  }

  /**
   * Get single category by ID for Admin.
   */
  async adminFindById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        translations: true,
        parent: true,
        children: {
          include: {
            translations: true,
            _count: {
              select: {
                postCategories: true,
              },
            },
          },
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: {
            postCategories: true,
            categoryAuthors: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    return {
      ...category,
      postCount: category._count.postCategories,
      authorCount: category._count.categoryAuthors,
    };
  }

  /**
   * Create a new category.
   */
  async create(dto: CreateCategoryDto, adminId?: string) {
    const targetSlug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    if (!targetSlug) {
      throw new BadRequestException('A valid category name or slug is required');
    }

    const existingSlug = await this.prisma.category.findUnique({
      where: { slug: targetSlug },
    });

    if (existingSlug) {
      throw new ConflictException(`Category with slug '${targetSlug}' already exists`);
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug: targetSlug,
        description: dto.description,
        iconUrl: dto.iconUrl,
        imageUrl: dto.imageUrl,
        parentId: dto.parentId ?? null,
        order: dto.order ?? 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });

    // Audit log
    await this.logAudit({
      userId: adminId,
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: category.id,
      description: `Category '${category.name}' created with slug '${category.slug}'`,
      metadata: { name: category.name, slug: category.slug, parentId: category.parentId },
    });

    return category;
  }

  /**
   * Update category details.
   */
  async update(id: string, dto: UpdateCategoryDto, adminId?: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    let targetSlug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      targetSlug = slugify(dto.slug);
      const conflict = await this.prisma.category.findUnique({
        where: { slug: targetSlug },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Category with slug '${targetSlug}' already exists`);
      }
    }

    // Validate parent hierarchy if parentId is being updated
    if (dto.parentId !== undefined) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      if (dto.parentId !== null) {
        const parent = await this.prisma.category.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent) {
          throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
        }

        // Check for circular inheritance
        await this.assertNoCircularParent(id, dto.parentId);
      }
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.slug && { slug: targetSlug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.order !== undefined && { order: dto.order }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        translations: true,
        parent: true,
      },
    });

    // Audit log
    await this.logAudit({
      userId: adminId,
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: id,
      description: `Category '${updated.name}' updated`,
      metadata: { changes: dto },
    });

    return updated;
  }

  /**
   * Toggle category active status.
   */
  async updateStatus(id: string, isActive: boolean, adminId?: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: { isActive },
    });

    await this.logAudit({
      userId: adminId,
      action: 'CATEGORY_STATUS_CHANGED',
      entityType: 'Category',
      entityId: id,
      description: `Category '${updated.name}' status changed to ${isActive ? 'ACTIVE' : 'INACTIVE'}`,
      metadata: { previousStatus: existing.isActive, newStatus: isActive },
    });

    return updated;
  }

  /**
   * Safe delete category: rejects if category contains children or posts.
   */
  async delete(id: string, adminId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        postCategories: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    if (category.children.length > 0) {
      throw new BadRequestException(
        `Cannot delete category '${category.name}' because it contains ${category.children.length} subcategory(ies). Please reassign or delete child categories first, or deactivate this category instead.`,
      );
    }

    if (category.postCategories.length > 0) {
      throw new BadRequestException(
        `Cannot delete category '${category.name}' because it contains ${category.postCategories.length} post(s). Deactivate this category instead of deleting to preserve content integrity.`,
      );
    }

    await this.prisma.category.delete({
      where: { id },
    });

    await this.logAudit({
      userId: adminId,
      action: 'CATEGORY_DELETED',
      entityType: 'Category',
      entityId: id,
      description: `Category '${category.name}' (${category.slug}) deleted`,
      metadata: { name: category.name, slug: category.slug },
    });

    return {
      message: `Category '${category.name}' successfully deleted`,
      id,
    };
  }

  /**
   * Upsert translation for a category.
   */
  async upsertTranslation(id: string, dto: UpsertTranslationDto, adminId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }

    const translation = await this.prisma.categoryTranslation.upsert({
      where: {
        categoryId_language: {
          categoryId: id,
          language: dto.language.toLowerCase(),
        },
      },
      create: {
        categoryId: id,
        language: dto.language.toLowerCase(),
        name: dto.name,
        description: dto.description,
      },
      update: {
        name: dto.name,
        description: dto.description,
      },
    });

    await this.logAudit({
      userId: adminId,
      action: 'CATEGORY_TRANSLATION_UPSERTED',
      entityType: 'Category',
      entityId: id,
      description: `Translation for '${category.name}' in language '${dto.language}' updated`,
      metadata: { language: dto.language, name: dto.name },
    });

    return translation;
  }

  /**
   * Dashboard statistics for categories.
   */
  async getCategoryStats(): Promise<CategoryStatsDto> {
    const [total, active, inactive, parentCount, childCount] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.category.count({ where: { isActive: false } }),
      this.prisma.category.count({ where: { parentId: null } }),
      this.prisma.category.count({ where: { parentId: { not: null } } }),
    ]);

    return {
      total,
      active,
      inactive,
      parentCount,
      childCount,
    };
  }

  /**
   * Helper to ensure no circular parent-child relationships.
   */
  private async assertNoCircularParent(categoryId: string, candidateParentId: string): Promise<void> {
    let currentParentId: string | null = candidateParentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (currentParentId === categoryId) {
        throw new BadRequestException('Circular parent-child relationship detected. A category cannot be a child of its own descendant.');
      }

      if (visited.has(currentParentId)) {
        break;
      }
      visited.add(currentParentId);

      const parentRecord: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });

      currentParentId = parentRecord?.parentId ?? null;
    }
  }

  /**
   * Helper to record audit logs safely.
   */
  private async logAudit(params: {
    userId?: string;
    action: string;
    entityType: string;
    entityId: string;
    description: string;
    metadata?: Record<string, any>;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId ?? null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          description: params.description,
          metadata: params.metadata ?? {},
        },
      });
    } catch {
      // Audit log failures should not fail the main business transaction
    }
  }
}
