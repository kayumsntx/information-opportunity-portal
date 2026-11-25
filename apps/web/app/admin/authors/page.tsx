'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Globe,
  MapPin,
  Shield,
  Layers,
} from 'lucide-react';

interface Author {
  id: string;
  userId: string;
  displayName: string;
  bio?: string | null;
  profileImage?: string | null;
  country?: string | null;
  location?: string | null;
  language?: string | null;
  website?: string | null;
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
    assignedAt: string;
  }>;
  postsCount?: number;
  createdAt: string;
}

interface AuthorStats {
  total: number;
  local: number;
  international: number;
  active: number;
  pending: number;
  suspended: number;
}

export default function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [stats, setStats] = useState<AuthorStats>({
    total: 0,
    local: 0,
    international: 0,
    active: 0,
    pending: 0,
    suspended: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Promote User Modal
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({
    userId: '',
    displayName: '',
    authorType: 'LOCAL' as 'LOCAL' | 'INTERNATIONAL',
    bio: '',
    country: '',
    location: '',
    language: 'en',
    website: '',
    status: 'ACTIVE' as 'ACTIVE' | 'PENDING_REVIEW',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchAuthors = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [authorRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/admin/authors?limit=100`, { headers }).catch(() => null),
        fetch(`${apiUrl}/api/v1/admin/authors/stats`, { headers }).catch(() => null),
      ]);

      if (authorRes && authorRes.ok) {
        const json = await authorRes.json();
        setAuthors(json.data || []);
      } else {
        // Fallback demo data
        setAuthors([
          {
            id: 'auth-1',
            userId: 'usr-1',
            displayName: 'Tareq Hassan',
            bio: 'Senior Education & Career Advisor specializing in European admissions and Ausbildung programs.',
            country: 'Germany',
            location: 'Frankfurt',
            language: 'en',
            authorType: 'INTERNATIONAL',
            status: 'ACTIVE',
            postsCount: 18,
            createdAt: '2026-01-15T08:00:00Z',
            user: { id: 'usr-1', email: 'tareq.h@portal.org', phone: '+49176123456', status: 'ACTIVE' },
            assignedCategories: [
              { id: 'ca-1', categoryId: 'c-3', name: 'Study Abroad', slug: 'study-abroad', assignedAt: '2026-01-16' },
              { id: 'ca-2', categoryId: 'c-4', name: 'Germany Ausbildung', slug: 'germany-ausbildung', assignedAt: '2026-01-16' },
            ],
          },
          {
            id: 'auth-2',
            userId: 'usr-2',
            displayName: 'Nusrat Jahan',
            bio: 'Government and Banking examination analyst covering regular job notices and preparation roadmaps.',
            country: 'Bangladesh',
            location: 'Dhaka',
            language: 'bn',
            authorType: 'LOCAL',
            status: 'ACTIVE',
            postsCount: 24,
            createdAt: '2026-02-10T09:30:00Z',
            user: { id: 'usr-2', email: 'nusrat.j@portal.org', phone: '+8801711223344', status: 'ACTIVE' },
            assignedCategories: [
              { id: 'ca-3', categoryId: 'c-1', name: 'Jobs', slug: 'jobs', assignedAt: '2026-02-11' },
              { id: 'ca-4', categoryId: 'c-2', name: 'Government Jobs', slug: 'government-jobs', assignedAt: '2026-02-11' },
            ],
          },
          {
            id: 'auth-3',
            userId: 'usr-3',
            displayName: 'Mohammad Farhan',
            bio: 'Immigration consultant for Gulf and East Asia skilled worker visa streams.',
            country: 'Japan',
            location: 'Tokyo',
            language: 'en',
            authorType: 'INTERNATIONAL',
            status: 'PENDING_REVIEW',
            postsCount: 0,
            createdAt: '2026-03-01T11:00:00Z',
            user: { id: 'usr-3', email: 'farhan.tokyo@portal.org', phone: null, status: 'ACTIVE' },
            assignedCategories: [],
          },
        ]);
      }

      if (statsRes && statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      } else {
        setStats({
          total: 3,
          local: 1,
          international: 2,
          active: 2,
          pending: 1,
          suspended: 0,
        });
      }
    } catch {
      showNotification('error', 'Failed to load authors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/authors`, {
        method: 'POST',
        headers,
        body: JSON.stringify(promoteForm),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to promote user to author');
      }

      showNotification('success', `User successfully promoted to Author (${promoteForm.authorType})`);
      setIsPromoteModalOpen(false);
      setPromoteForm({
        userId: '',
        displayName: '',
        authorType: 'LOCAL',
        bio: '',
        country: '',
        location: '',
        language: 'en',
        website: '',
        status: 'ACTIVE',
      });
      fetchAuthors();
    } catch (err: any) {
      showNotification('error', err.message || 'Error promoting user');
    }
  };

  const handleToggleStatus = async (author: Author, newStatus: 'ACTIVE' | 'SUSPENDED') => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/authors/${author.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Status change failed');
      showNotification('success', `Author '${author.displayName}' is now ${newStatus}`);
      fetchAuthors();
    } catch {
      showNotification('error', 'Failed to update author status');
    }
  };

  const filteredAuthors = authors.filter((a) => {
    const query = search.toLowerCase();
    const matchesSearch =
      a.displayName.toLowerCase().includes(query) ||
      (a.user?.email && a.user.email.toLowerCase().includes(query)) ||
      (a.country && a.country.toLowerCase().includes(query)) ||
      (a.location && a.location.toLowerCase().includes(query));

    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchesType = typeFilter === 'all' || a.authorType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Author Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Admin-controlled author onboarding, status management, and category assignments.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchAuthors()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsPromoteModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Promote User to Author</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Local</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.local}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-sky-600 uppercase tracking-wider">International</span>
          <p className="text-2xl font-bold text-sky-600 mt-1">{stats.international}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Active</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">Pending</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-red-600 uppercase tracking-wider">Suspended</span>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.suspended}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Author Types</option>
            <option value="LOCAL">Local Only</option>
            <option value="INTERNATIONAL">International Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING_REVIEW">Pending Review</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Author Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading authors...</div>
        ) : filteredAuthors.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No authors found matching your criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Author Profile</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Assigned Categories</th>
                  <th className="py-3 px-4">Posts</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAuthors.map((author) => (
                  <tr key={author.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                          {author.displayName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{author.displayName}</div>
                          <div className="text-xs text-slate-400">{author.user?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          author.authorType === 'INTERNATIONAL'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {author.authorType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {author.country ? (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {author.location ? `${author.location}, ` : ''}
                            {author.country}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {author.assignedCategories && author.assignedCategories.length > 0 ? (
                          author.assignedCategories.map((c) => (
                            <span
                              key={c.id}
                              className="inline-block px-2 py-0.5 rounded bg-slate-100 text-[11px] font-medium text-slate-700"
                            >
                              {c.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-amber-600 italic">No categories assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-700">{author.postsCount ?? 0}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          author.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : author.status === 'PENDING_REVIEW'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {author.status === 'ACTIVE' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : author.status === 'PENDING_REVIEW' ? (
                          <Clock className="w-3 h-3 text-amber-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-500" />
                        )}
                        <span>{author.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {author.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleToggleStatus(author, 'SUSPENDED')}
                            className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(author, 'ACTIVE')}
                            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium px-2 py-1 rounded hover:bg-emerald-50"
                          >
                            Activate
                          </button>
                        )}
                        <Link
                          href={`/admin/authors/${author.id}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
                        >
                          <span>Manage</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Promote User Modal */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-slate-900">Promote Registered User to Author</h3>
              </div>
              <button
                onClick={() => setIsPromoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePromoteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  User ID (UUID) *
                </label>
                <input
                  type="text"
                  required
                  value={promoteForm.userId}
                  onChange={(e) => setPromoteForm({ ...promoteForm, userId: e.target.value })}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  UUID of an existing registered user who will receive the CATEGORY_AUTHOR role.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Public Author Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={promoteForm.displayName}
                  onChange={(e) => setPromoteForm({ ...promoteForm, displayName: e.target.value })}
                  placeholder="e.g. Dr. Rafiqul Islam"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Author Type *
                  </label>
                  <select
                    value={promoteForm.authorType}
                    onChange={(e) => setPromoteForm({ ...promoteForm, authorType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="LOCAL">LOCAL</option>
                    <option value="INTERNATIONAL">INTERNATIONAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status *
                  </label>
                  <select
                    value={promoteForm.status}
                    onChange={(e) => setPromoteForm({ ...promoteForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PENDING_REVIEW">PENDING REVIEW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={promoteForm.country}
                    onChange={(e) => setPromoteForm({ ...promoteForm, country: e.target.value })}
                    placeholder="e.g. Germany"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={promoteForm.location}
                    onChange={(e) => setPromoteForm({ ...promoteForm, location: e.target.value })}
                    placeholder="e.g. Berlin"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Biography & Expertise
                </label>
                <textarea
                  rows={2}
                  value={promoteForm.bio}
                  onChange={(e) => setPromoteForm({ ...promoteForm, bio: e.target.value })}
                  placeholder="Summary of author background and areas of interest..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-sm"
                >
                  Confirm & Promote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
