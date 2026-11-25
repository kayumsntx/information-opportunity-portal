'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ARCHIVED: 'bg-slate-100 text-slate-600',
};

const CONTENT_TYPES = ['JOB','EDUCATION','SCHOLARSHIP','MIGRATION','TRAINING','CAREER_GUIDE','GENERAL_ARTICLE'];

function EditPostContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [post, setPost] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', content: '', featuredImage: '',
    contentType: 'JOB', language: 'en', categoryIds: '', tags: '',
    sourceName: '', sourceUrl: '', sourcePublicationDate: '',
    seoTitle: '', seoDescription: '', canonicalUrl: '', isFeatured: false,
  });
  const [revisions, setRevisions] = useState<unknown[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      const [postRes, revRes] = await Promise.all([
        fetch(`/api/admin/posts/${id}`),
        fetch(`/api/admin/posts/${id}/revisions`),
      ]);
      if (postRes.ok) {
        const p = await postRes.json();
        setPost(p);
        setForm({
          title: p.title ?? '',
          slug: p.slug ?? '',
          excerpt: p.excerpt ?? '',
          content: p.content ?? '',
          featuredImage: p.featuredImage ?? '',
          contentType: p.contentType ?? 'JOB',
          language: p.language ?? 'en',
          categoryIds: (p.categories ?? []).map((pc: { category: { id: string } }) => pc.category.id).join(', '),
          tags: (p.tags ?? []).map((pt: { tag: { name: string } }) => pt.tag.name).join(', '),
          sourceName: p.sourceName ?? '',
          sourceUrl: p.sourceUrl ?? '',
          sourcePublicationDate: p.sourcePublicationDate ? p.sourcePublicationDate.substring(0, 10) : '',
          seoTitle: p.seoTitle ?? '',
          seoDescription: p.seoDescription ?? '',
          canonicalUrl: p.canonicalUrl ?? '',
          isFeatured: p.isFeatured ?? false,
        });
      }
      if (revRes.ok) setRevisions(await revRes.json());
      setLoading(false);
    })();
  }, [id]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        categoryIds: form.categoryIds.split(',').map((s) => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        sourcePublicationDate: form.sourcePublicationDate || undefined,
      };
      const res = await fetch(`/api/admin/posts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.message ?? 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  }, [form, id]);

  const action = useCallback(async (act: string, body?: unknown) => {
    setSaving(true);
    await fetch(`/api/admin/posts/${id}/${act}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    router.refresh();
    setSaving(false);
  }, [id, router]);

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  const status = (post?.status as string) ?? '';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold flex-1">Edit Post</h1>
        <span className={`px-3 py-1 rounded text-sm font-medium ${STATUS_COLORS[status] ?? ''}`}>{status}</span>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="grid grid-cols-3 gap-6">
        {/* Main form */}
        <div className="col-span-2 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input className="w-full border rounded-lg px-3 py-2" value={form.title} onChange={set('title')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Slug</label>
            <input className="w-full border rounded-lg px-3 py-2 font-mono text-sm" value={form.slug} onChange={set('slug')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Content Type</label>
              <select className="w-full border rounded-lg px-3 py-2" value={form.contentType} onChange={set('contentType')}>
                {CONTENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Language</label>
              <select className="w-full border rounded-lg px-3 py-2" value={form.language} onChange={set('language')}>
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category IDs (comma-separated)</label>
            <input className="w-full border rounded-lg px-3 py-2" value={form.categoryIds} onChange={set('categoryIds')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Excerpt</label>
            <textarea className="w-full border rounded-lg px-3 py-2" rows={2} value={form.excerpt} onChange={set('excerpt')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea className="w-full border rounded-lg px-3 py-2 font-mono text-sm" rows={14} value={form.content} onChange={set('content')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
            <input className="w-full border rounded-lg px-3 py-2" value={form.tags} onChange={set('tags')} />
          </div>
          <div className="flex gap-3 mt-4">
            <button disabled={saving} onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Save Changes</button>
          </div>
        </div>

        {/* Sidebar: approval actions + revision history */}
        <div className="space-y-4">
          {/* Admin Actions */}
          {status === 'PENDING' && (
            <div className="border rounded-xl p-4 space-y-3">
              <h2 className="font-semibold text-sm">Review Actions</h2>
              <div>
                <input
                  className="w-full border rounded px-2 py-1 text-sm mb-2"
                  placeholder="Approval comment (optional)"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                />
                <button onClick={() => action('approve', { comment: approvalComment })} className="w-full mb-2 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Approve</button>
              </div>
              <div>
                <input
                  className="w-full border rounded px-2 py-1 text-sm mb-2"
                  placeholder="Rejection reason (required)"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <button onClick={() => action('reject', { rejectionReason: rejectReason })} className="w-full mb-2 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Reject</button>
                <button onClick={() => action('request-changes', { comment: rejectReason })} className="w-full py-2 border rounded-lg text-sm hover:bg-gray-50">Request Changes</button>
              </div>
            </div>
          )}
          {status === 'APPROVED' && (
            <button onClick={() => action('publish')} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Publish Post</button>
          )}
          {status === 'PUBLISHED' && (
            <button onClick={() => action('archive')} className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">Archive</button>
          )}

          {/* Revision history */}
          <div className="border rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-3">Revisions ({revisions.length})</h2>
            {revisions.length === 0 ? (
              <p className="text-gray-400 text-xs">No revisions yet</p>
            ) : (
              <ul className="space-y-2">
                {(revisions as Array<{ id: string; revisionNumber: number; status: string; changeLog: string | null; createdAt: string }>).map((rev) => (
                  <li key={rev.id} className="text-xs border-b pb-2">
                    <div className="font-medium">Rev #{rev.revisionNumber} — {rev.status}</div>
                    {rev.changeLog && <div className="text-gray-500">{rev.changeLog}</div>}
                    <div className="text-gray-400">{new Date(rev.createdAt).toLocaleDateString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EditAdminPostPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading...</div>}>
      <EditPostContent />
    </Suspense>
  );
}
