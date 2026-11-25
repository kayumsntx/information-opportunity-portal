export class PostResponseDto {
  id!: string;
  title!: string;
  slug!: string;
  excerpt?: string | null;
  content!: string;
  featuredImage?: string | null;
  contentType!: string;
  language!: string;
  status!: string;
  publishedAt?: Date | null;
  isFeatured!: boolean;
  viewsCount!: number;
  hasPendingRevision!: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  additionalImages?: unknown;
  attachments?: unknown;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourcePublicationDate?: Date | null;
  lastVerifiedDate?: Date | null;
  authorId!: string;
  createdAt!: Date;
  updatedAt!: Date;
  author?: {
    id: string;
    email: string;
    username?: string | null;
  };
  categories?: {
    category: { id: string; name: string; slug: string };
    isPrimary: boolean;
  }[];
  tags?: { tag: { id: string; name: string; slug: string } }[];
  revisions?: unknown[];
  approvals?: unknown[];
}

export class PaginatedPostsResponseDto {
  data!: PostResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class PostStatsDto {
  byStatus!: Record<string, number>;
  byContentType!: Record<string, number>;
  recentSubmissions!: number;
  total!: number;
}
