'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Shield,
  FolderTree,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Globe,
  Mail,
  Phone,
  Calendar,
  ExternalLink,
  Edit2,
  AlertTriangle,
} from 'lucide-react';

interface AuthorDetail {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | null;
  profileImage?: string | null;
  country?: string | null;
  location?: string | null;
  language?: string | null;
  website?: string | null;
  socialLinks?: Record<string, any> | null;
  authorType: 'LOCAL' | 'INTERNATIONAL';
  status: 'ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED' | 'INACTIVE';
  user?: {
    id: string;
    email: string;
    phone?: string | null;
    status: string;
  };
  assignedCategories?: Array<{
    id: string;
    categoryId: string;
    name: string;
    slug: string;
    iconUrl?: string | null;
    assignedAt: string;
  }>;
  postsCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

function AuthorDetailContent() {
  const params = useParams();
  const authorId = params?.id as string;

  const [author, setAuthor] = useState<AuthorDetail | null>(null);
  const [allCategories, setAllCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  // Edit form state
  const [editForm, setEditForm] = useState({
    displayName: '',
    authorType: 'LOCAL' as 'LOCAL' | 'INTERNATIONAL',
    bio: '',
    country: '',
    location: '',
    language: 'en',
    website: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAuthor = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [authorRes, catRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/admin/authors/${authorId}`, { headers }).catch(() => null),
        fetch(`${apiUrl}/api/v1/admin/categories`, { headers }).catch(() => null),
      ]);

      if (authorRes && authorRes.ok) {
        const data = await authorRes.json();
        setAuthor(data);
        setEditForm({
          displayName: data.displayName || '',
          authorType: data.authorType || 'LOCAL',
          bio: data.bio || '',
          country: data.country || '',
          location: data.location || '',
          language: data.language || 'en',
          website: data.website || '',
        });
      } else {
        // Fallback demo author
        const demo: AuthorDetail = {
          id: authorId,
          userId: 'usr-1',
          displayName: 'Tareq Hassan',
          bio: 'Senior Education & Career Advisor specializing in European admissions and Ausbildung programs.',
          profileImage: null,
          country: 'Germany',
          location: 'Frankfurt',
          language: 'en',
          website: 'https://tareq-advisor.eu',
          socialLinks: { linkedin: 'https://linkedin.com/in/tareq' },
          authorType: 'INTERNATIONAL',
          status: 'ACTIVE',
          postsCount: 18,
          createdAt: '2026-01-15T08:00:00Z',
          updatedAt: '2026-02-01T10:00:00Z',
          user: {
            id: 'usr-1',
            email: 'tareq.h@portal.org',
            phone: '+49176123456',
            status: 'ACTIVE',
          },
          assignedCategories: [
            {
              id: 'ca-1',
              categoryId: 'c-3',
              name: 'Study Abroad',
              slug: 'study-abroad',
              assignedAt: '2026-01-16T12:00:00Z',
            },
            {
              id: 'ca-2',
              categoryId: 'c-4',
              name: 'Germany Ausbildung',
              slug: 'germany-ausbildung',
              assignedAt: '2026-01-16T12:00:00Z',
            },
          ],
        };
        setAuthor(demo);
        setEditForm({
          displayName: demo.displayName,
          authorType: demo.authorType,
          bio: demo.bio || '',
          country: demo.country || '',
          location: demo.location || '',
          language: demo.language || 'en',
          website: demo.website || '',
        });
      }

      if (catRes && catRes.ok) {
        const cats = await catRes.json();
        setAllCategories(cats);
      } else {
        setAllCategories([
          { id: 'c-1', name: 'Jobs', slug: 'jobs', isActive: true },
          { id: 'c-2', name: 'Government Jobs', slug: 'government-jobs', isActive: true },
          { id: 'c-3', name: 'Study Abroad', slug: 'study-abroad', isActive: true },
          { id: 'c-4', name: 'Germany Ausbildung', slug: 'germany-ausbildung', isActive: true },
        ]);
      }
    } catch {
      showNotification('error', 'Failed to fetch author details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorId) {
      fetchAuthor();
    }
  }, [authorId]);

  const handleUpdateStatus = async (newStatus: 'ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED' | 'INACTIVE') => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/authors/${authorId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Status update failed');
      showNotification('success', `Status updated to ${newStatus}`);
      fetchAuthor();
    } catch {
      showNotification('error', 'Failed to change status');
    }
  };

  const handleAssignCategories = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategoryIds.length === 0) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/authors/${authorId}/categories`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ categoryIds: selectedCategoryIds }),
      });
      if (!res.ok) throw new Error('Category assignment failed');
      showNotification('success', 'Categories assigned successfully');
      setIsAssignModalOpen(false);
      setSelectedCategoryIds([]);
      fetchAuthor();
    } catch (err: any) {
      showNotification('error', err.message || 'Error assigning categories');
    }
  };

  const handleRemoveCategory = async (categoryId: string, categoryName: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/authors/${authorId}/categories/${categoryId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Failed to remove category assignment');
      showNotification('success', `Removed '${categoryName}' from author`);
      fetchAuthor();
    } catch {
      showNotification('error', 'Error removing category');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/authors/${authorId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('Failed to update author profile');
      showNotification('success', 'Profile updated successfully');
      setIsEditModalOpen(false);
      fetchAuthor();
    } catch (err: any) {
      showNotification('error', err.message || 'Error updating profile');
    }
  };

  if (loading && !author) {
    return <div className="p-12 text-center text-slate-400">Loading author details...</div>;
  }

  if (!author) {
    return (
      <div className="p-12 text-center text-slate-400">
        <p>Author not found.</p>
        <Link href="/admin/authors" className="text-indigo-600 font-semibold mt-2 inline-block">
          Return to Authors list
        </Link>
      </div>
    );
  }

  // Categories not yet assigned to this author
  const assignedSet = new Set((author.assignedCategories || []).map((c) => c.categoryId));
  const availableCategories = allCategories.filter((c) => !assignedSet.has(c.id) && c.isActive);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Back link */}
      <div>
        <Link
          href="/admin/authors"
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Authors</span>
        </Link>
      </div>

      {/* Main Author Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-100">
              {author.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-3 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{author.displayName}</h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    author.authorType === 'INTERNATIONAL'
                      ? 'bg-sky-50 text-sky-700 border border-sky-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {author.authorType} AUTHOR
                </span>
                <span
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    author.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : author.status === 'PENDING_REVIEW'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {author.status === 'ACTIVE' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                  )}
                  <span>{author.status}</span>
                </span>
              </div>

              {author.bio && <p className="text-sm text-slate-600 mt-2 max-w-2xl">{author.bio}</p>}

              <div className="flex items-center space-x-4 mt-3 text-xs text-slate-500 flex-wrap gap-y-1">
                {author.country && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {author.location ? `${author.location}, ` : ''}
                      {author.country}
                    </span>
                  </span>
                )}
                {author.website && (
                  <a
                    href={author.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 text-indigo-600 hover:underline"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>{author.website}</span>
                  </a>
                )}
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Author since {new Date(author.createdAt).toLocaleDateString()}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium shadow-sm transition-all"
            >
              <Edit2 className="w-4 h-4 text-slate-500" />
              <span>Edit Details</span>
            </button>

            {author.status === 'ACTIVE' ? (
              <button
                onClick={() => handleUpdateStatus('SUSPENDED')}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm transition-all"
              >
                <XCircle className="w-4 h-4" />
                <span>Suspend Author</span>
              </button>
            ) : (
              <button
                onClick={() => handleUpdateStatus('ACTIVE')}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Activate Author</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Linked User Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h2>Linked Account Details</h2>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Email</span>
              <p className="font-medium text-slate-800 flex items-center space-x-1.5 mt-0.5">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{author.user?.email || 'N/A'}</span>
              </p>
            </div>

            {author.user?.phone && (
              <div>
                <span className="text-xs text-slate-400 uppercase font-semibold">Phone</span>
                <p className="font-medium text-slate-800 flex items-center space-x-1.5 mt-0.5">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{author.user.phone}</span>
                </p>
              </div>
            )}

            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">User ID</span>
              <p className="font-mono text-xs text-slate-500 break-all mt-0.5">{author.userId}</p>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Global Role</span>
              <p className="font-medium text-indigo-600 mt-0.5">CATEGORY_AUTHOR</p>
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold">Published Posts</span>
              <p className="text-lg font-bold text-slate-900 mt-0.5">{author.postsCount ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Assigned Categories */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-base">
              <FolderTree className="w-5 h-5 text-indigo-600" />
              <h2>Assigned Categories ({author.assignedCategories?.length ?? 0})</h2>
            </div>
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Assign Category</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            This author can only submit and manage posts within these assigned active categories.
          </p>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {author.assignedCategories && author.assignedCategories.length > 0 ? (
              author.assignedCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900">{cat.name}</div>
                    <div className="text-xs text-slate-400 font-mono">/{cat.slug}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-400">
                      Assigned {new Date(cat.assignedAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleRemoveCategory(cat.categoryId, cat.name)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                      title="Remove category assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-sm">
                No categories assigned yet. Click &quot;Assign Category&quot; to authorize posting topics.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Category Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Assign Categories</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignCategories} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
                  Select Active Categories
                </label>
                {availableCategories.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    All currently active categories are already assigned to this author.
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2">
                    {availableCategories.map((c) => {
                      const isChecked = selectedCategoryIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs font-medium transition-colors ${
                            isChecked ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span>{c.name}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategoryIds([...selectedCategoryIds, c.id]);
                              } else {
                                setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== c.id));
                              }
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedCategoryIds.length === 0}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 shadow-sm"
                >
                  Assign Selected ({selectedCategoryIds.length})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Author Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">Edit Author Details</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Location / City
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Website URL
                </label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Biography
                </label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthorDetailPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading author profile...</div>}>
      <AuthorDetailContent />
    </Suspense>
  );
}
