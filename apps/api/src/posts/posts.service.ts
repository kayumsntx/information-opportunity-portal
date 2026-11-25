import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  PostStatus,
  PostRevisionStatus,
  ApprovalAction,
  ContentType,
} from '../generated/prisma/enums.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { SubmitPostDto } from './dto/submit-post.dto.js';
import { ApprovePostDto } from './dto/approve-post.dto.js';
import { RejectPostDto } from './dto/reject-post.dto.js';
import { RequestChangesDto } from './dto/request-changes.dto.js';
import { PostQueryDto } from './dto/post-query.dto.js';

const POST_INCLUDE = {
  author: { select: { id: true, email: true, username: true } },
  categories: { include: { category: { select: { id: true, name: true, slug: true } } } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
};

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Slug helpers ───────────────────────────────────────────────────────────

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = this.slugify(base);
    let counter = 0;
    while (true) {
      const candidate = counter === 0 ? slug : `${slug}-${counter}`;
      const existing = await this.prisma.post.findUnique({ where: { slug: candidate } });
      if (!existing || existing.id === excludeId) return candidate;
      counter++;
    }
  }

  // ─── Authorization helpers ──────────────────────────────────────────────────

  async assertAuthorOwnsPost(postId: string, userId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) throw new ForbiddenException('You do not own this post');
  }

  async assertAuthorCanPostInCategory(userId: string, categoryId: string): Promise<void> {
    const assignment = await this.prisma.categoryAuthor.findFirst({
      where: { authorProfile: { userId }, categoryId, isActive: true },
    });
    if (!assignment) {
      throw new ForbiddenException(`You are not assigned to category ${categoryId}`);
    }
  }

  // ─── Tag helpers ─────────────────────────────────────────────────────────────

  private async upsertTags(tags: string[]): Promise<{ id: string }[]> {
    const result: { id: string }[] = [];
    for (const name of tags) {
      const slug = this.slugify(name);
      const tag = await this.prisma.tag.upsert({
        where: { slug },
        create: { name: name.trim(), slug },
        update: {},
      });
      result.push({ id: tag.id });
    }
    return result;
  }

  // ─── Category helpers ─────────────────────────────────────────────────────────

  private async buildCategoryConnects(
    categoryIds: string[],
    userId?: string,
  ): Promise<{ categoryId: string; isPrimary: boolean }[]> {
    if (!categoryIds || categoryIds.length === 0) {
      throw new BadRequestException('At least one category is required');
    }
    const connects: { categoryId: string; isPrimary: boolean }[] = [];
    for (let i = 0; i < categoryIds.length; i++) {
      const catId = categoryIds[i];
      const cat = await this.prisma.category.findUnique({ where: { id: catId } });
      if (!cat || !cat.isActive) {
        throw new BadRequestException(`Category ${catId} not found or inactive`);
      }
      if (userId) {
        await this.assertAuthorCanPostInCategory(userId, catId);
      }
      connects.push({ categoryId: catId, isPrimary: i === 0 });
    }
    return connects;
  }

  // ─── AUTHOR METHODS ──────────────────────────────────────────────────────────

  async createDraft(dto: CreatePostDto, userId: string) {
    const slug = await this.uniqueSlug(dto.slug || dto.title);
    const categoryConnects = await this.buildCategoryConnects(dto.categoryIds, userId);

    const tagIds = dto.tags && dto.tags.length > 0 ? await this.upsertTags(dto.tags) : [];

    const post = await this.prisma.post.create({
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        featuredImage: dto.featuredImage,
        contentType: dto.contentType,
        language: dto.language ?? 'en',
        status: PostStatus.DRAFT,
        isFeatured: dto.isFeatured ?? false,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        canonicalUrl: dto.canonicalUrl,
        additionalImages: dto.additionalImages ?? undefined,
        attachments: dto.attachments ?? undefined,
        sourceName: dto.sourceName,
        sourceUrl: dto.sourceUrl,
        sourcePublicationDate: dto.sourcePublicationDate ? new Date(dto.sourcePublicationDate) : undefined,
        lastVerifiedDate: dto.lastVerifiedDate ? new Date(dto.lastVerifiedDate) : undefined,
        authorId: userId,
        categories: { create: categoryConnects },
        tags: tagIds.length > 0 ? { create: tagIds.map((t) => ({ tagId: t.id })) } : undefined,
      },
      include: POST_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'POST_CREATED',
        entityType: 'Post',
        entityId: post.id,
        description: `Post created: ${post.title}`,
        metadata: { title: post.title, status: post.status },
      },
    });

    return post;
  }

  async findAuthorPosts(userId: string, query: PostQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      authorId: userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.contentType ? { contentType: query.contentType } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({ where, skip, take: limit, include: POST_INCLUDE, orderBy: { updatedAt: 'desc' } }),
      this.prisma.post.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findAuthorPostById(postId: string, userId: string) {
    await this.assertAuthorOwnsPost(postId, userId);
    return this.prisma.post.findUnique({
      where: { id: postId },
      include: { ...POST_INCLUDE, revisions: { orderBy: { revisionNumber: 'desc' } }, approvals: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async updateDraft(postId: string, dto: UpdatePostDto, userId: string) {
    await this.assertAuthorOwnsPost(postId, userId);
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status === PostStatus.PENDING || post.status === PostStatus.PUBLISHED) {
      throw new BadRequestException(`Cannot edit a post with status ${post.status}`);
    }

    let slug = post.slug;
    if (dto.slug && dto.slug !== post.slug) {
      slug = await this.uniqueSlug(dto.slug, postId);
    } else if (dto.title && dto.title !== post.title && !dto.slug) {
      slug = await this.uniqueSlug(dto.title, postId);
    }

    const categoryConnects = dto.categoryIds
      ? await this.buildCategoryConnects(dto.categoryIds, userId)
      : null;

    const tagIds = dto.tags ? await this.upsertTags(dto.tags) : null;

    return this.prisma.post.update({
      where: { id: postId },
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        featuredImage: dto.featuredImage,
        contentType: dto.contentType,
        language: dto.language,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        canonicalUrl: dto.canonicalUrl,
        additionalImages: dto.additionalImages ?? undefined,
        attachments: dto.attachments ?? undefined,
        sourceName: dto.sourceName,
        sourceUrl: dto.sourceUrl,
        sourcePublicationDate: dto.sourcePublicationDate ? new Date(dto.sourcePublicationDate) : undefined,
        lastVerifiedDate: dto.lastVerifiedDate ? new Date(dto.lastVerifiedDate) : undefined,
        ...(categoryConnects
          ? {
              categories: {
                deleteMany: {},
                create: categoryConnects,
              },
            }
          : {}),
        ...(tagIds
          ? {
              tags: {
                deleteMany: {},
                create: tagIds.map((t) => ({ tagId: t.id })),
              },
            }
          : {}),
      },
      include: POST_INCLUDE,
    });
  }

  async deleteDraft(postId: string, userId: string) {
    await this.assertAuthorOwnsPost(postId, userId);
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== PostStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT posts can be deleted');
    }

    await this.prisma.post.delete({ where: { id: postId } });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'POST_DELETED',
        entityType: 'Post',
        entityId: postId,
        description: `Post deleted: ${post.title}`,
        metadata: { title: post.title },
      },
    });

    return { message: 'Post deleted successfully' };
  }

  async submitForReview(postId: string, userId: string, dto: SubmitPostDto) {
    await this.assertAuthorOwnsPost(postId, userId);
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: { categories: true, tags: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== PostStatus.DRAFT && post.status !== PostStatus.REJECTED) {
      throw new BadRequestException(`Cannot submit a post with status ${post.status}`);
    }

    // Count existing revisions to determine next revision number
    const revisionCount = await this.prisma.postRevision.count({ where: { postId } });

    const revision = await this.prisma.postRevision.create({
      data: {
        postId,
        revisionNumber: revisionCount + 1,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        featuredImage: post.featuredImage,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        contentType: post.contentType as ContentType,
        language: post.language,
        canonicalUrl: post.canonicalUrl,
        additionalImages: post.additionalImages ?? undefined,
        attachments: post.attachments ?? undefined,
        sourceName: post.sourceName,
        sourceUrl: post.sourceUrl,
        sourcePublicationDate: post.sourcePublicationDate ?? undefined,
        lastVerifiedDate: post.lastVerifiedDate ?? undefined,
        authorId: userId,
        status: PostRevisionStatus.PENDING_REVIEW,
        changeLog: dto.changeLog,
        categoriesSnapshot: post.categories as unknown,
        tagsSnapshot: post.tags as unknown,
      },
    });

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PENDING, hasPendingRevision: true },
    });

    await this.prisma.postApproval.create({
      data: {
        postId,
        revisionId: revision.id,
        reviewerId: userId,
        action: ApprovalAction.SUBMITTED,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'POST_SUBMITTED',
        entityType: 'Post',
        entityId: postId,
        description: `Post submitted for review`,
        metadata: { status: updatedPost.status, revisionId: revision.id },
      },
    });

    return updatedPost;
  }

  async getAuthorRevisions(postId: string, userId: string) {
    await this.assertAuthorOwnsPost(postId, userId);
    return this.prisma.postRevision.findMany({
      where: { postId },
      orderBy: { revisionNumber: 'desc' },
    });
  }

  async getAuthorApprovals(postId: string, userId: string) {
    await this.assertAuthorOwnsPost(postId, userId);
    return this.prisma.postApproval.findMany({
      where: { postId },
      include: { reviewer: { select: { id: true, email: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── ADMIN METHODS ───────────────────────────────────────────────────────────

  async adminFindAll(query: PostQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.contentType ? { contentType: query.contentType } : {}),
      ...(query.authorId ? { authorId: query.authorId } : {}),
      ...(query.language ? { language: query.language } : {}),
      ...(query.isFeatured !== undefined ? { isFeatured: query.isFeatured } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
      ...(query.categoryId
        ? { categories: { some: { categoryId: query.categoryId } } }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({ where, skip, take: limit, include: POST_INCLUDE, orderBy: { updatedAt: 'desc' } }),
      this.prisma.post.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async adminFindById(id: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        ...POST_INCLUDE,
        revisions: { orderBy: { revisionNumber: 'desc' } },
        approvals: {
          include: { reviewer: { select: { id: true, email: true, username: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async adminUpdate(id: string, dto: UpdatePostDto, adminId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    let slug = post.slug;
    if (dto.slug && dto.slug !== post.slug) {
      slug = await this.uniqueSlug(dto.slug, id);
    }

    const categoryConnects = dto.categoryIds
      ? await this.buildCategoryConnects(dto.categoryIds)
      : null;

    const tagIds = dto.tags ? await this.upsertTags(dto.tags) : null;

    // If the post is PUBLISHED and content fields change, create a revision
    const contentChanged =
      post.status === PostStatus.PUBLISHED &&
      (dto.title !== undefined || dto.content !== undefined || dto.excerpt !== undefined);

    if (contentChanged) {
      const revisionCount = await this.prisma.postRevision.count({ where: { postId: id } });
      await this.prisma.postRevision.create({
        data: {
          postId: id,
          revisionNumber: revisionCount + 1,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          featuredImage: post.featuredImage,
          seoTitle: post.seoTitle,
          seoDescription: post.seoDescription,
          authorId: adminId,
          status: PostRevisionStatus.PENDING_REVIEW,
          changeLog: 'Admin edit of published post',
        },
      });
    }

    return this.prisma.post.update({
      where: { id },
      data: {
        title: dto.title,
        slug,
        excerpt: dto.excerpt,
        content: dto.content,
        featuredImage: dto.featuredImage,
        contentType: dto.contentType,
        language: dto.language,
        isFeatured: dto.isFeatured,
        seoTitle: dto.seoTitle,
        seoDescription: dto.seoDescription,
        canonicalUrl: dto.canonicalUrl,
        additionalImages: dto.additionalImages ?? undefined,
        attachments: dto.attachments ?? undefined,
        sourceName: dto.sourceName,
        sourceUrl: dto.sourceUrl,
        sourcePublicationDate: dto.sourcePublicationDate ? new Date(dto.sourcePublicationDate) : undefined,
        lastVerifiedDate: dto.lastVerifiedDate ? new Date(dto.lastVerifiedDate) : undefined,
        ...(categoryConnects
          ? { categories: { deleteMany: {}, create: categoryConnects } }
          : {}),
        ...(tagIds
          ? { tags: { deleteMany: {}, create: tagIds.map((t) => ({ tagId: t.id })) } }
          : {}),
      },
      include: POST_INCLUDE,
    });
  }

  async adminDelete(id: string, adminId: string) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    await this.prisma.post.delete({ where: { id } });
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'POST_DELETED',
        entityType: 'Post',
        entityId: id,
        description: `Admin deleted post: ${post.title}`,
        metadata: { title: post.title },
      },
    });
    return { message: 'Post deleted' };
  }

  async findPending() {
    return this.prisma.post.findMany({
      where: { status: PostStatus.PENDING },
      include: POST_INCLUDE,
      orderBy: { updatedAt: 'asc' },
    });
  }

  async approvePost(postId: string, adminId: string, dto: ApprovePostDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== PostStatus.PENDING) {
      throw new BadRequestException('Only PENDING posts can be approved');
    }

    const latestRevision = await this.prisma.postRevision.findFirst({
      where: { postId, status: PostRevisionStatus.PENDING_REVIEW },
      orderBy: { revisionNumber: 'desc' },
    });

    await this.prisma.postRevision.updateMany({
      where: { postId, status: PostRevisionStatus.PENDING_REVIEW },
      data: { status: PostRevisionStatus.APPROVED },
    });

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.APPROVED, hasPendingRevision: false },
    });

    await this.prisma.postApproval.create({
      data: {
        postId,
        revisionId: latestRevision?.id,
        reviewerId: adminId,
        action: ApprovalAction.APPROVED,
        comment: dto.comment,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'POST_APPROVED',
        entityType: 'Post',
        entityId: postId,
        description: 'Post approved',
        metadata: { status: PostStatus.APPROVED },
      },
    });

    return updatedPost;
  }

  async rejectPost(postId: string, adminId: string, dto: RejectPostDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== PostStatus.PENDING) {
      throw new BadRequestException('Only PENDING posts can be rejected');
    }

    const latestRevision = await this.prisma.postRevision.findFirst({
      where: { postId, status: PostRevisionStatus.PENDING_REVIEW },
      orderBy: { revisionNumber: 'desc' },
    });

    await this.prisma.postRevision.updateMany({
      where: { postId, status: PostRevisionStatus.PENDING_REVIEW },
      data: { status: PostRevisionStatus.REJECTED, rejectionReason: dto.rejectionReason },
    });

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.REJECTED, hasPendingRevision: false },
    });

    await this.prisma.postApproval.create({
      data: {
        postId,
        revisionId: latestRevision?.id,
        reviewerId: adminId,
        action: ApprovalAction.REJECTED,
        rejectionReason: dto.rejectionReason,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'POST_REJECTED',
        entityType: 'Post',
        entityId: postId,
        description: 'Post rejected',
        metadata: { status: PostStatus.REJECTED, rejectionReason: dto.rejectionReason },
      },
    });

    return updatedPost;
  }

  async requestChanges(postId: string, adminId: string, dto: RequestChangesDto) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== PostStatus.PENDING) {
      throw new BadRequestException('Only PENDING posts can have changes requested');
    }

    const latestRevision = await this.prisma.postRevision.findFirst({
      where: { postId, status: PostRevisionStatus.PENDING_REVIEW },
      orderBy: { revisionNumber: 'desc' },
    });

    await this.prisma.postRevision.updateMany({
      where: { postId, status: PostRevisionStatus.PENDING_REVIEW },
      data: { status: PostRevisionStatus.REJECTED },
    });

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.DRAFT, hasPendingRevision: false },
    });

    await this.prisma.postApproval.create({
      data: {
        postId,
        revisionId: latestRevision?.id,
        reviewerId: adminId,
        action: ApprovalAction.CHANGES_REQUESTED,
        comment: dto.comment,
      },
    });

    return updatedPost;
  }

  async publishPost(postId: string, adminId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== PostStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED posts can be published');
    }

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.PUBLISHED, publishedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'POST_PUBLISHED',
        entityType: 'Post',
        entityId: postId,
        description: 'Post published',
        metadata: { status: PostStatus.PUBLISHED },
      },
    });

    return updatedPost;
  }

  async unpublishPost(postId: string, adminId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.status !== PostStatus.PUBLISHED) {
      throw new BadRequestException('Only PUBLISHED posts can be unpublished');
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.APPROVED },
    });
  }

  async archivePost(postId: string, adminId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const updatedPost = await this.prisma.post.update({
      where: { id: postId },
      data: { status: PostStatus.ARCHIVED },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'POST_ARCHIVED',
        entityType: 'Post',
        entityId: postId,
        description: 'Post archived',
        metadata: { status: PostStatus.ARCHIVED },
      },
    });

    return updatedPost;
  }

  async getPostRevisions(postId: string) {
    return this.prisma.postRevision.findMany({
      where: { postId },
      orderBy: { revisionNumber: 'desc' },
    });
  }

  async getPostStats() {
    const [byStatusRaw, byContentTypeRaw, recentSubmissions, total] = await Promise.all([
      this.prisma.post.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.post.groupBy({ by: ['contentType'], _count: { id: true } }),
      this.prisma.post.count({
        where: {
          status: PostStatus.PENDING,
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.post.count(),
    ]);

    const byStatus: Record<string, number> = {};
    for (const row of byStatusRaw) byStatus[row.status] = row._count.id;

    const byContentType: Record<string, number> = {};
    for (const row of byContentTypeRaw) byContentType[row.contentType] = row._count.id;

    return { byStatus, byContentType, recentSubmissions, total };
  }

  // ─── PUBLIC METHODS ──────────────────────────────────────────────────────────

  async publicFindAll(query: PostQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      status: PostStatus.PUBLISHED,
      ...(query.contentType ? { contentType: query.contentType } : {}),
      ...(query.language ? { language: query.language } : {}),
      ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}),
      ...(query.categoryId
        ? { categories: { some: { categoryId: query.categoryId } } }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.post.findMany({ where, skip, take: limit, include: POST_INCLUDE, orderBy: { publishedAt: 'desc' } }),
      this.prisma.post.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async publicFindBySlug(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.PUBLISHED },
      include: POST_INCLUDE,
    });
    if (!post) throw new NotFoundException('Post not found');

    // Increment views
    await this.prisma.post.update({ where: { id: post.id }, data: { viewsCount: { increment: 1 } } });

    return post;
  }

  async publicFindFeatured() {
    return this.prisma.post.findMany({
      where: { status: PostStatus.PUBLISHED, isFeatured: true },
      include: POST_INCLUDE,
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });
  }
}
