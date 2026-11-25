'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const CONTENT_TYPES = ['JOB','EDUCATION','SCHOLARSHIP','MIGRATION','TRAINING','CAREER_GUIDE','GENERAL_ARTICLE'];

function slugify(text: string) {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreateAdminPostPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', content: '', featuredImage: '',
    contentType: 'JOB', language: 'en', categoryIds: '', tags: '',
    sourceName: '', sourceUrl: '', sourcePublicationDate: '',
    seoTitle: '', seoDescription: '', canonicalUrl: '',
    isFeatured: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'title' && !prev.slug) updated.slug = slugify(e.target.value);
      return updated;
    });
  };

  const submitForm = useCallback(async (action: 'draft' | 'submit') => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        categoryIds: form.categoryIds.split(',').map((s) => s.trim()).filter(Boolean),
        tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean),
        sourcePublicationDate: form.sourcePublicationDate || undefined,
      };

      const res = await fetch('/api/author/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message ?? 'Failed to create post');
        return;
      }

      const post = await res.json();

      if (action === 'submit') {
        await fetch(`/api/author/posts/${post.id}/submit`, { method: 'POST' });
      }

      router.push('/admin/posts');
    } finally {
      setSaving(false);
    }
  }, [form, router]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create New Post</h1>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input className="w-full border rounded-lg px-3 py-2" value={form.title} onChange={set('title')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input className="w-full border rounded-lg px-3 py-2 font-mono text-sm" value={form.slug} onChange={set('slug')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Content Type *</label>
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
          <label className="block text-sm font-medium mb-1">Category IDs (comma-separated) *</label>
          <input className="w-full border rounded-lg px-3 py-2" value={form.categoryIds} onChange={set('categoryIds')} placeholder="cat-id-1, cat-id-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Excerpt</label>
          <textarea className="w-full border rounded-lg px-3 py-2" rows={2} value={form.excerpt} onChange={set('excerpt')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Content *</label>
          <textarea className="w-full border rounded-lg px-3 py-2 font-mono text-sm" rows={12} value={form.content} onChange={set('content')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Featured Image URL</label>
          <input className="w-full border rounded-lg px-3 py-2" value={form.featuredImage} onChange={set('featuredImage')} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
          <input className="w-full border rounded-lg px-3 py-2" value={form.tags} onChange={set('tags')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Source Name</label>
            <input className="w-full border rounded-lg px-3 py-2" value={form.sourceName} onChange={set('sourceName')} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source URL</label>
            <input className="w-full border rounded-lg px-3 py-2" value={form.sourceUrl} onChange={set('sourceUrl')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Source Publication Date</label>
          <input type="date" className="border rounded-lg px-3 py-2" value={form.sourcePublicationDate} onChange={set('sourcePublicationDate')} />
        </div>
        <details className="border rounded-lg p-4">
          <summary className="font-medium cursor-pointer">SEO Settings</summary>
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">SEO Title</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.seoTitle} onChange={set('seoTitle')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SEO Description</label>
              <textarea className="w-full border rounded-lg px-3 py-2" rows={2} value={form.seoDescription} onChange={set('seoDescription')} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Canonical URL</label>
              <input className="w-full border rounded-lg px-3 py-2" value={form.canonicalUrl} onChange={set('canonicalUrl')} />
            </div>
          </div>
        </details>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isFeatured" checked={form.isFeatured} onChange={set('isFeatured')} />
          <label htmlFor="isFeatured" className="text-sm font-medium">Featured Post</label>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          disabled={saving}
          onClick={() => submitForm('draft')}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          disabled={saving}
          onClick={() => submitForm('submit')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Submit for Review
        </button>
      </div>
    </div>
  );
}
