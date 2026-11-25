'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AuthorPost {
  id: string;
  title: string;
  contentType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  approvals: { action: string; rejectionReason: string | null; comment: string | null; createdAt: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-slate-100 text-slate-600',
};

export default function AuthorPostsPage() {
  const [posts, setPosts] = useState<AuthorPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/author/posts');
    if (res.ok) {
      const data = await res.json();
      setPosts(data.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void fetchPosts(); }, [fetchPosts]);

  const handleSubmit = async (id: string) => {
    await fetch(`/api/author/posts/${id}/submit`, { method: 'POST' });
    void fetchPosts();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Posts</h1>
        <Link href="/author/posts/create" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New Post
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No posts yet. Create your first post!</div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const latestApproval = post.approvals?.[0];
            return (
              <div key={post.id} className="border rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <h2 className="font-medium">{post.title}</h2>
                    <p className="text-sm text-gray-500">{post.contentType} • {new Date(post.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[post.status] ?? ''}`}>{post.status}</span>
                  <div className="flex gap-2">
                    <Link href={`/author/posts/${post.id}/edit`} className="text-sm text-blue-600 hover:underline">Edit</Link>
                    {(post.status === 'DRAFT' || post.status === 'REJECTED') && (
                      <button onClick={() => handleSubmit(post.id)} className="text-sm text-green-600 hover:underline">Submit</button>
                    )}
                  </div>
                </div>
                {latestApproval?.rejectionReason && (
                  <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-xs">
                    <strong>Rejection reason:</strong> {latestApproval.rejectionReason}
                  </div>
                )}
                {latestApproval?.action === 'CHANGES_REQUESTED' && latestApproval.comment && (
                  <div className="mt-2 p-2 bg-yellow-50 text-yellow-700 rounded text-xs">
                    <strong>Changes requested:</strong> {latestApproval.comment}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
