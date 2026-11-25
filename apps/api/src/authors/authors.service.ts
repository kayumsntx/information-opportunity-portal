import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SystemRole } from '../auth/constants/rbac.constants.js';
import { AuthorStatus, AuthorType } from '../generated/prisma/enums.js';
import { CreateAuthorDto } from './dto/create-author.dto.js';
import { UpdateAuthorDto } from './dto/update-author.dto.js';
import { UpdateOwnProfileDto } from './dto/update-own-profile.dto.js';
import { AuthorQueryDto } from './dto/author-query.dto.js';
import {
  AuthorProfileResponseDto,
  AuthorStatsDto,
  PaginatedAuthorsResponseDto,
} from './dto/author-response.dto.js';

@Injectable()
export class AuthorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Map author database entity to response DTO.
   */
  private mapAuthorResponse(author: any): AuthorProfileResponseDto {
    const assignedCategories = (author.user?.categoryAuthors || []).map((ca: any) => ({
      id: ca.id,
      categoryId: ca.categoryId,
      name: ca.category?.name,
      slug: ca.category?.slug,
      iconUrl: ca.category?.iconUrl,
      assignedAt: ca.assignedAt,
    }));

    return {
      id: author.id,
      userId: author.userId,
      displayName: author.displayName,
      bio: author.bio,
      profileImage: author.profileImage,
      country: author.country,
      location: author.location,
      language: author.language,
      website: author.website,
      socialLinks: (author.socialLinks as Record<string, any>) ?? null,
      authorType: author.authorType,
      status: author.status,
      user: author.user
        ? {
            id: author.user.id,
            email: author.user.email,
            phone: author.user.phone,
            status: author.user.status,
          }
        : undefined,
      assignedCategories,
      postsCount: author._count?.posts ?? 0,
      createdAt: author.createdAt,
      updatedAt: author.updatedAt,
    };
  }

  // ==========================================================================
  // ADMIN APIS
  // ==========================================================================

  /**
   * Promote an existing registered user to an author (creates AuthorProfile and assigns CATEGORY_AUTHOR role).
   */
  async create(dto: CreateAuthorDto, adminId?: string): Promise<AuthorProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { authorProfile: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${dto.userId}' not found`);
    }

    if (user.authorProfile) {
      throw new ConflictException(`User '${user.email}' already has an author profile`);
    }

    // Find the CATEGORY_AUTHOR system role
    const authorRole = await this.prisma.role.findUnique({
      where: { name: SystemRole.CATEGORY_AUTHOR },
    });

    if (!authorRole) {
      throw new NotFoundException(`Role '${SystemRole.CATEGORY_AUTHOR}' not configured in the system`);
    }

    // Validate category IDs if provided
    if (dto.categoryIds && dto.categoryIds.length > 0) {
      const validCategories = await this.prisma.category.findMany({
        where: {
          id: { in: dto.categoryIds },
          isActive: true,
        },
      });

      if (validCategories.length !== dto.categoryIds.length) {
        throw new BadRequestException('One or more specified categories do not exist or are inactive');
      }
    }

    // Execute in transaction
    const initialStatus = dto.status ?? AuthorStatus.PENDING_REVIEW;

    const createdAuthor = await this.prisma.$transaction(async (tx) => {
      // 1. Create AuthorProfile
      const profile = await tx.authorProfile.create({
        data: {
          userId: dto.userId,
          displayName: dto.displayName,
          authorType: dto.authorType,
          status: initialStatus,
          bio: dto.bio,
          profileImage: dto.profileImage,
          country: dto.country,
          location: dto.location,
          language: dto.language ?? 'en',
          website: dto.website,
          socialLinks: dto.socialLinks ?? undefined,
        },
      });

      // 2. Assign CATEGORY_AUTHOR role if user does not already have it
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId: dto.userId,
            roleId: authorRole.id,
          },
        },
        create: {
          userId: dto.userId,
          roleId: authorRole.id,
          assignedBy: adminId,
        },
        update: {},
      });

      // 3. Assign categories if provided
      if (dto.categoryIds && dto.categoryIds.length > 0) {
        for (const catId of dto.categoryIds) {
          await tx.categoryAuthor.create({
            data: {
              categoryId: catId,
              userId: dto.userId,
              assignedBy: adminId,
            },
          });
        }
      }

      return profile;
    });

    // Audit log
    await this.logAudit({
      userId: adminId,
      action: 'AUTHOR_PROMOTED',
      entityType: 'AuthorProfile',
      entityId: createdAuthor.id,
      description: `User '${user.email}' promoted to author '${createdAuthor.displayName}' (${createdAuthor.authorType})`,
      metadata: { userId: user.id, authorType: createdAuthor.authorType, status: createdAuthor.status },
    });

    return this.findById(createdAuthor.id);
  }

  /**
   * List authors with pagination, filters, and search.
   */
  async findAll(query: AuthorQueryDto): Promise<PaginatedAuthorsResponseDto> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.authorType) {
      where.authorType = query.authorType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.country) {
      where.country = { contains: query.country, mode: 'insensitive' };
    }

    if (query.search) {
      const searchTerm = query.search.trim();
      where.OR = [
        { displayName: { contains: searchTerm, mode: 'insensitive' } },
        { bio: { contains: searchTerm, mode: 'insensitive' } },
        { location: { contains: searchTerm, mode: 'insensitive' } },
        { country: { contains: searchTerm, mode: 'insensitive' } },
        { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    const [total, authors] = await Promise.all([
      this.prisma.authorProfile.count({ where }),
      this.prisma.authorProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            include: {
              categoryAuthors: {
                include: {
                  category: true,
                },
              },
            },
          },
          _count: {
            select: { posts: true },
          },
        },
      }),
    ]);

    return {
      data: authors.map((a) => this.mapAuthorResponse(a)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single author profile by AuthorProfile ID.
   */
  async findById(id: string): Promise<AuthorProfileResponseDto> {
    const author = await this.prisma.authorProfile.findUnique({
      where: { id },
      include: {
        user: {
          include: {
            categoryAuthors: {
              include: {
                category: true,
              },
            },
          },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!author) {
      throw new NotFoundException(`Author profile with ID '${id}' not found`);
    }

    return this.mapAuthorResponse(author);
  }

  /**
   * Update author profile details (Admin).
   */
  async update(id: string, dto: UpdateAuthorDto, adminId?: string): Promise<AuthorProfileResponseDto> {
    const author = await this.prisma.authorProfile.findUnique({
      where: { id },
    });

    if (!author) {
      throw new NotFoundException(`Author profile with ID '${id}' not found`);
    }

    const updated = await this.prisma.authorProfile.update({
      where: { id },
      data: {
        ...(dto.authorType && { authorType: dto.authorType }),
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.profileImage !== undefined && { profileImage: dto.profileImage }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.socialLinks !== undefined && { socialLinks: dto.socialLinks }),
        ...(dto.status && { status: dto.status }),
      },
    });

    await this.logAudit({
      userId: adminId,
      action: 'AUTHOR_PROFILE_UPDATED',
      entityType: 'AuthorProfile',
      entityId: id,
      description: `Author profile '${updated.displayName}' updated by admin`,
      metadata: { changes: dto },
    });

    return this.findById(id);
  }

  /**
   * Update author status (e.g. approve, suspend, activate).
   */
  async updateStatus(id: string, status: AuthorStatus, adminId?: string): Promise<AuthorProfileResponseDto> {
    const author = await this.prisma.authorProfile.findUnique({
      where: { id },
    });

    if (!author) {
      throw new NotFoundException(`Author profile with ID '${id}' not found`);
    }

    const updated = await this.prisma.authorProfile.update({
      where: { id },
      data: { status },
    });

    await this.logAudit({
      userId: adminId,
      action: 'AUTHOR_STATUS_CHANGED',
      entityType: 'AuthorProfile',
      entityId: id,
      description: `Author '${updated.displayName}' status changed from '${author.status}' to '${status}'`,
      metadata: { previousStatus: author.status, newStatus: status },
    });

    return this.findById(id);
  }

  /**
   * Assign categories to an author.
   */
  async assignCategories(authorId: string, categoryIds: string[], adminId?: string) {
    const author = await this.prisma.authorProfile.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException(`Author profile with ID '${authorId}' not found`);
    }

    // Validate categories exist and are active
    const categories = await this.prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        isActive: true,
      },
    });

    if (categories.length !== categoryIds.length) {
      throw new BadRequestException('One or more selected categories are invalid or inactive');
    }

    // Create assignments, ignoring duplicates
    const created: string[] = [];
    for (const cat of categories) {
      const existing = await this.prisma.categoryAuthor.findUnique({
        where: {
          categoryId_userId: {
            categoryId: cat.id,
            userId: author.userId,
          },
        },
      });

      if (!existing) {
        await this.prisma.categoryAuthor.create({
          data: {
            categoryId: cat.id,
            userId: author.userId,
            assignedBy: adminId,
          },
        });
        created.push(cat.name);
      }
    }

    await this.logAudit({
      userId: adminId,
      action: 'AUTHOR_CATEGORIES_ASSIGNED',
      entityType: 'AuthorProfile',
      entityId: authorId,
      description: `Assigned ${created.length} category(ies) to author '${author.displayName}'`,
      metadata: { authorId, assignedCategoryIds: categoryIds },
    });

    return this.getAuthorCategories(authorId);
  }

  /**
   * Remove a category assignment from an author.
   */
  async removeCategory(authorId: string, categoryId: string, adminId?: string) {
    const author = await this.prisma.authorProfile.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException(`Author profile with ID '${authorId}' not found`);
    }

    const assignment = await this.prisma.categoryAuthor.findUnique({
      where: {
        categoryId_userId: {
          categoryId,
          userId: author.userId,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Category assignment not found for this author');
    }

    await this.prisma.categoryAuthor.delete({
      where: {
        categoryId_userId: {
          categoryId,
          userId: author.userId,
        },
      },
    });

    await this.logAudit({
      userId: adminId,
      action: 'AUTHOR_CATEGORY_REMOVED',
      entityType: 'AuthorProfile',
      entityId: authorId,
      description: `Removed category '${categoryId}' from author '${author.displayName}'`,
      metadata: { authorId, categoryId },
    });

    return { message: 'Category assignment successfully removed', categoryId };
  }

  /**
   * Get all categories assigned to an author.
   */
  async getAuthorCategories(authorId: string) {
    const author = await this.prisma.authorProfile.findUnique({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException(`Author profile with ID '${authorId}' not found`);
    }

    const assignments = await this.prisma.categoryAuthor.findMany({
      where: { userId: author.userId },
      include: {
        category: true,
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map((ca) => ({
      id: ca.id,
      categoryId: ca.categoryId,
      name: ca.category.name,
      slug: ca.category.slug,
      iconUrl: ca.category.iconUrl,
      isActive: ca.category.isActive,
      assignedAt: ca.assignedAt,
    }));
  }

  /**
   * Get all authors assigned to a specific category.
   */
  async getAuthorsByCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID '${categoryId}' not found`);
    }

    const assignments = await this.prisma.categoryAuthor.findMany({
      where: { categoryId },
      include: {
        user: {
          include: {
            authorProfile: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    return assignments.map((ca) => ({
      assignmentId: ca.id,
      assignedAt: ca.assignedAt,
      userId: ca.userId,
      authorProfile: ca.user.authorProfile,
    }));
  }

  // ==========================================================================
  // AUTHOR SELF-SERVICE APIS
  // ==========================================================================

  /**
   * Get own author profile.
   */
  async getMyProfile(userId: string): Promise<AuthorProfileResponseDto> {
    const author = await this.prisma.authorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          include: {
            categoryAuthors: {
              include: {
                category: true,
              },
            },
          },
        },
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!author) {
      throw new NotFoundException('Author profile not found for the authenticated user');
    }

    return this.mapAuthorResponse(author);
  }

  /**
   * Update own author profile.
   */
  async updateMyProfile(userId: string, dto: UpdateOwnProfileDto): Promise<AuthorProfileResponseDto> {
    const author = await this.prisma.authorProfile.findUnique({
      where: { userId },
    });

    if (!author) {
      throw new NotFoundException('Author profile not found for the authenticated user');
    }

    const updated = await this.prisma.authorProfile.update({
      where: { userId },
      data: {
        ...(dto.displayName && { displayName: dto.displayName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.profileImage !== undefined && { profileImage: dto.profileImage }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.language !== undefined && { language: dto.language }),
        ...(dto.website !== undefined && { website: dto.website }),
        ...(dto.socialLinks !== undefined && { socialLinks: dto.socialLinks }),
      },
    });

    return this.findById(updated.id);
  }

  /**
   * Get own assigned categories.
   */
  async getMyCategories(userId: string) {
    const author = await this.prisma.authorProfile.findUnique({
      where: { userId },
    });

    if (!author) {
      throw new NotFoundException('Author profile not found for the authenticated user');
    }

    return this.getAuthorCategories(author.id);
  }

  // ==========================================================================
  // DASHBOARD METRICS & BUSINESS RULES
  // ==========================================================================

  /**
   * Dashboard statistics for authors.
   */
  async getAuthorStats(): Promise<AuthorStatsDto> {
    const [total, local, international, active, pending, suspended] = await Promise.all([
      this.prisma.authorProfile.count(),
      this.prisma.authorProfile.count({ where: { authorType: AuthorType.LOCAL } }),
      this.prisma.authorProfile.count({ where: { authorType: AuthorType.INTERNATIONAL } }),
      this.prisma.authorProfile.count({ where: { status: AuthorStatus.ACTIVE } }),
      this.prisma.authorProfile.count({ where: { status: AuthorStatus.PENDING_REVIEW } }),
      this.prisma.authorProfile.count({ where: { status: AuthorStatus.SUSPENDED } }),
    ]);

    return {
      total,
      local,
      international,
      active,
      pending,
      suspended,
    };
  }

  /**
   * Validation rule: Check if an author can submit content in a given category.
   */
  async canAuthorPostInCategory(userId: string, categoryId: string): Promise<boolean> {
    const author = await this.prisma.authorProfile.findUnique({
      where: { userId },
    });

    if (!author) {
      return false;
    }

    // Suspended or non-active authors cannot submit content
    if (author.status !== AuthorStatus.ACTIVE) {
      return false;
    }

    // Category must be active
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || !category.isActive) {
      return false;
    }

    // Must be assigned to the category
    const assignment = await this.prisma.categoryAuthor.findUnique({
      where: {
        categoryId_userId: {
          categoryId,
          userId,
        },
      },
    });

    return !!assignment;
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
      // Non-blocking
    }
  }
}
