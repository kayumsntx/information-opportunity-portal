'use client';

import { useState, useEffect, useCallback } from 'react';

interface PendingPost {
  id: string;
  title: string;
  contentType: string;
  author: { email: string; username: string | null };
  updatedAt: string;
  categories: { category: { name: string }; isPrimary: boolean }[];
}

export default function PendingPostsPage() {
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/posts/pending');
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { void fetchPending(); }, [fetchPending]);

  const handleAction = async (id: string, action: string, body?: unknown) => {
    setActionLoading(`${id}-${action}`);
    await fetch(`/api/admin/posts/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    setActionLoading(null);
    void fetchPending();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pending Review</h1>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No posts pending review 🎉</div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-lg">{post.title}</h2>
                  <p className="text-sm text-gray-500">
                    {post.contentType} • {post.author?.username ?? post.author?.email} •{' '}
                    {post.categories?.map((pc) => pc.category.name).join(', ')} •{' '}
                    Submitted {new Date(post.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap shrink-0">
                  <button
                    disabled={actionLoading === `${post.id}-approve`}
                    onClick={() => handleAction(post.id, 'approve', {})}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                </div>
              </div>

              {/* Reject / Request Changes */}
              <div className="mt-4 flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  placeholder="Rejection reason or change request comment..."
                  value={rejectReasons[post.id] ?? ''}
                  onChange={(e) => setRejectReasons((prev) => ({ ...prev, [post.id]: e.target.value }))}
                />
                <button
                  disabled={!rejectReasons[post.id] || actionLoading === `${post.id}-reject`}
                  onClick={() => handleAction(post.id, 'reject', { rejectionReason: rejectReasons[post.id] })}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  disabled={!rejectReasons[post.id] || actionLoading === `${post.id}-request-changes`}
                  onClick={() => handleAction(post.id, 'request-changes', { comment: rejectReasons[post.id] })}
                  className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Request Changes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
