'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Post {
  id: string;
  title: string;
  slug: string;
  contentType: string;
  status: string;
  language: string;
  isFeatured: boolean;
  publishedAt: string | null;
  createdAt: string;
  author: { id: string; email: string; username: string | null };
  categories: { category: { id: string; name: string; slug: string }; isPrimary: boolean }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-slate-100 text-slate-600',
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [contentType, setContentType] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (contentType) params.set('contentType', contentType);
      const res = await fetch(`/api/admin/posts?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setPosts(data.data ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, contentType]);

  useEffect(() => { void fetchPosts(); }, [fetchPosts]);

  const handleAction = async (id: string, action: string, body?: unknown) => {
    await fetch(`/api/admin/posts/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    void fetchPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await fetch(`/api/admin/posts/${id}`, { method: 'DELETE' });
    void fetchPosts();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Posts</h1>
        <Link
          href="/admin/posts/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          className="border rounded-lg px-3 py-2 text-sm w-60"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">All Statuses</option>
          {['DRAFT','PENDING','APPROVED','PUBLISHED','REJECTED','ARCHIVED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={contentType}
          onChange={(e) => { setContentType(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          {['JOB','EDUCATION','SCHOLARSHIP','MIGRATION','TRAINING','CAREER_GUIDE','GENERAL_ARTICLE'].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Type</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Author</th>
              <th className="px-4 py-3 text-left">Categories</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : posts.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No posts found</td></tr>
            ) : posts.map((post) => (
              <tr key={post.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium max-w-xs truncate">{post.title}</td>
                <td className="px-4 py-3 text-gray-500">{post.contentType}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[post.status] ?? ''}`}>
                    {post.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{post.author?.username ?? post.author?.email}</td>
                <td className="px-4 py-3 text-gray-500">
                  {post.categories?.map((pc) => pc.category.name).join(', ')}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {post.publishedAt
                    ? new Date(post.publishedAt).toLocaleDateString()
                    : new Date(post.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 flex gap-2 flex-wrap">
                  <Link href={`/admin/posts/${post.id}/edit`} className="text-blue-600 hover:underline text-xs">Edit</Link>
                  {post.status === 'APPROVED' && (
                    <button onClick={() => handleAction(post.id, 'publish')} className="text-green-600 hover:underline text-xs">Publish</button>
                  )}
                  {post.status === 'PUBLISHED' && (
                    <button onClick={() => handleAction(post.id, 'archive')} className="text-orange-500 hover:underline text-xs">Archive</button>
                  )}
                  <button onClick={() => handleDelete(post.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>Total: {total}</span>
        <div className="flex gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 border rounded disabled:opacity-40">Prev</button>
          <span className="px-3 py-1">Page {page}</span>
          <button disabled={posts.length < 20} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
