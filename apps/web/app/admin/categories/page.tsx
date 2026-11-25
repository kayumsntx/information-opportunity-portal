'use client';

import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  Globe2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Layers,
  FileText,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
  order: number;
  isActive: boolean;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
  translations?: Array<{ id: string; language: string; name: string; description?: string | null }>;
  childrenCount?: number;
  postsCount?: number;
  authorsCount?: number;
}

interface CategoryStats {
  total: number;
  active: number;
  inactive: number;
  parentCount: number;
  childCount: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<CategoryStats>({
    total: 0,
    active: 0,
    inactive: 0,
    parentCount: 0,
    childCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'tree' | 'flat'>('flat');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [translationCategory, setTranslationCategory] = useState<Category | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    iconUrl: '',
    imageUrl: '',
    parentId: '',
    order: 0,
    isActive: true,
  });

  const [translationData, setTranslationData] = useState({
    language: 'bn',
    name: '',
    description: '',
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const [catRes, statsRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/admin/categories`, { headers }).catch(() => null),
        fetch(`${apiUrl}/api/v1/admin/categories/stats`, { headers }).catch(() => null),
      ]);

      if (catRes && catRes.ok) {
        const data = await catRes.json();
        setCategories(data);
      } else {
        // Fallback demo data if backend connection pending
        setCategories([
          {
            id: 'c-1',
            name: 'Jobs',
            slug: 'jobs',
            description: 'Employment and job vacancies across local and global sectors',
            order: 1,
            isActive: true,
            parentId: null,
            childrenCount: 3,
            postsCount: 14,
            authorsCount: 2,
            translations: [{ id: 't-1', language: 'bn', name: 'চাকরি', description: 'চাকরির যাবতীয় সুযোগ' }],
          },
          {
            id: 'c-2',
            name: 'Government Jobs',
            slug: 'government-jobs',
            description: 'Public sector circulars and exam schedules',
            order: 1,
            isActive: true,
            parentId: 'c-1',
            parent: { id: 'c-1', name: 'Jobs', slug: 'jobs' },
            childrenCount: 0,
            postsCount: 8,
            authorsCount: 1,
            translations: [],
          },
          {
            id: 'c-3',
            name: 'Study Abroad',
            slug: 'study-abroad',
            description: 'International education, universities, and scholarships',
            order: 2,
            isActive: true,
            parentId: null,
            childrenCount: 2,
            postsCount: 25,
            authorsCount: 3,
            translations: [{ id: 't-2', language: 'bn', name: 'উচ্চশিক্ষা', description: 'বিদেশে পড়াশোনা' }],
          },
          {
            id: 'c-4',
            name: 'Germany Ausbildung',
            slug: 'germany-ausbildung',
            description: 'Vocational training and visa guides for Germany',
            order: 1,
            isActive: true,
            parentId: 'c-3',
            parent: { id: 'c-3', name: 'Study Abroad', slug: 'study-abroad' },
            childrenCount: 0,
            postsCount: 12,
            authorsCount: 2,
            translations: [{ id: 't-3', language: 'de', name: 'Ausbildung in Deutschland', description: 'Duale Ausbildung' }],
          },
        ]);
      }

      if (statsRes && statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      } else {
        setStats({
          total: 4,
          active: 4,
          inactive: 0,
          parentCount: 2,
          childCount: 2,
        });
      }
    } catch {
      showNotification('error', 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      iconUrl: '',
      imageUrl: '',
      parentId: '',
      order: 0,
      isActive: true,
    });
    setIsFormModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      iconUrl: cat.iconUrl || '',
      imageUrl: cat.imageUrl || '',
      parentId: cat.parentId || '',
      order: cat.order,
      isActive: cat.isActive,
    });
    setIsFormModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const payload = {
      name: formData.name,
      slug: formData.slug || undefined,
      description: formData.description || undefined,
      iconUrl: formData.iconUrl || undefined,
      imageUrl: formData.imageUrl || undefined,
      parentId: formData.parentId ? formData.parentId : null,
      order: Number(formData.order),
      isActive: formData.isActive,
    };

    try {
      if (editingCategory) {
        const res = await fetch(`${apiUrl}/api/v1/admin/categories/${editingCategory.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Update failed');
        }
        showNotification('success', `Category '${formData.name}' updated successfully`);
      } else {
        const res = await fetch(`${apiUrl}/api/v1/admin/categories`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Creation failed');
        }
        showNotification('success', `Category '${formData.name}' created successfully`);
      }
      setIsFormModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      showNotification('error', err.message || 'An error occurred saving the category');
    }
  };

  const handleToggleStatus = async (cat: Category) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/categories/${cat.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      if (!res.ok) throw new Error('Status update failed');
      showNotification('success', `Category '${cat.name}' ${!cat.isActive ? 'activated' : 'deactivated'}`);
      fetchCategories();
    } catch {
      showNotification('error', 'Failed to toggle status');
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Delete failed');
      }
      showNotification('success', `Category '${categoryToDelete.name}' deleted successfully`);
      setIsDeleteModalOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete category');
    }
  };

  const openTranslationModal = (cat: Category) => {
    setTranslationCategory(cat);
    const existingBn = cat.translations?.find((t) => t.language === 'bn');
    setTranslationData({
      language: 'bn',
      name: existingBn?.name || '',
      description: existingBn?.description || '',
    });
    setIsTranslationModalOpen(true);
  };

  const handleSaveTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!translationCategory) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/categories/${translationCategory.id}/translations`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(translationData),
      });
      if (!res.ok) throw new Error('Failed to update translation');
      showNotification('success', `Translation for '${translationData.language.toUpperCase()}' saved`);
      setIsTranslationModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      showNotification('error', err.message || 'Error saving translation');
    }
  };

  // Filter categories
  const filteredCategories = categories.filter((cat) => {
    const matchesSearch =
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.slug.toLowerCase().includes(search.toLowerCase()) ||
      (cat.description && cat.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && cat.isActive) ||
      (statusFilter === 'inactive' && !cat.isActive);

    return matchesSearch && matchesStatus;
  });

  // Group for hierarchy
  const rootCategories = filteredCategories.filter((c) => !c.parentId);
  const getChildren = (parentId: string) => filteredCategories.filter((c) => c.parentId === parentId);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Category Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize multi-level hierarchical categories with multilingual translations.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchCategories()}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Active</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">Inactive</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.inactive}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Root / Parent</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.parentCount}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-sky-600 uppercase tracking-wider">Subcategories</span>
          <p className="text-2xl font-bold text-sky-600 mt-1">{stats.childCount}</p>
        </div>
      </div>

      {/* Filter and View Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            <button
              onClick={() => setViewMode('flat')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'flat' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-500'
              }`}
            >
              Flat View
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'tree' ? 'bg-white shadow-xs text-slate-900 font-semibold' : 'text-slate-500'
              }`}
            >
              Tree Hierarchy
            </button>
          </div>
        </div>
      </div>

      {/* Categories Content Table/List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading categories...</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No categories found matching your query.</div>
        ) : viewMode === 'tree' ? (
          /* Tree View */
          <div className="divide-y divide-slate-100 p-4">
            {rootCategories.map((root) => {
              const children = getChildren(root.id);
              return (
                <div key={root.id} className="py-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-3">
                      <FolderTree className="w-5 h-5 text-indigo-600" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900 text-sm">{root.name}</span>
                          <span className="text-xs text-slate-400 font-mono">/{root.slug}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              root.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {root.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {root.description && <p className="text-xs text-slate-500 mt-0.5">{root.description}</p>}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openTranslationModal(root)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-md hover:bg-white"
                        title="Manage Translations"
                      >
                        <Globe2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(root)}
                        className={`p-1.5 rounded-md hover:bg-white ${
                          root.isActive ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                        title={root.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {root.isActive ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEditModal(root)}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-white"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setCategoryToDelete(root);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-red-500 hover:text-red-700 rounded-md hover:bg-white"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories */}
                  {children.length > 0 && (
                    <div className="pl-8 pt-2 space-y-2 border-l-2 border-indigo-100 ml-5 mt-1">
                      {children.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-slate-800 text-xs">{sub.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono">/{sub.slug}</span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                  sub.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {sub.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => openTranslationModal(sub)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            >
                              <Globe2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(sub)}
                              className={`p-1 rounded ${sub.isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                            >
                              {sub.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => openEditModal(sub)}
                              className="p-1 text-slate-400 hover:text-slate-800 rounded"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setCategoryToDelete(sub);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1 text-red-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat Table View */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Name & Slug</th>
                  <th className="py-3 px-4">Parent Category</th>
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-4">Content</th>
                  <th className="py-3 px-4">Translations</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredCategories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{cat.name}</div>
                      <div className="text-xs text-slate-400 font-mono">/{cat.slug}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      {cat.parent ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 font-medium">
                          {cat.parent.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None (Root)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-xs font-mono">{cat.order}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs">
                      <span>{cat.postsCount ?? 0} posts</span>
                      {cat.childrenCount !== undefined && cat.childrenCount > 0 && (
                        <span className="ml-2 text-indigo-600">({cat.childrenCount} children)</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        {['bn', 'en', 'de'].map((lng) => {
                          const hasTrans = cat.translations?.some((t) => t.language.toLowerCase() === lng);
                          return (
                            <span
                              key={lng}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${
                                hasTrans ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {lng}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(cat)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${cat.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{cat.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openTranslationModal(cat)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                          title="Translations"
                        >
                          <Globe2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCategoryToDelete(cat);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Category Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Migration & Visas"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Slug (Optional)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. migration-visas"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Leave empty to generate automatically from name.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Parent Category (Optional)
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">None (Top-Level Category)</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Overview of this category..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Status
                  </label>
                  <label className="flex items-center space-x-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700">Active</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-sm"
                >
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg text-slate-900">Delete Category</h3>
            </div>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{categoryToDelete.name}</span>?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Safety Rule Notice:</p>
              <p>
                Categories containing published posts or subcategories cannot be deleted. If you only wish to hide this category, prefer deactivating it instead.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCategoryToDelete(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Translation Management Modal */}
      {isTranslationModalOpen && translationCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Globe2 className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-lg text-slate-900">
                  Translations for {translationCategory.name}
                </h3>
              </div>
              <button
                onClick={() => setIsTranslationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTranslation} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Language *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: 'bn', label: 'Bangla (বাংলা)' },
                    { code: 'en', label: 'English' },
                    { code: 'de', label: 'German (Deutsch)' },
                  ].map((lang) => {
                    const isSelected = translationData.language === lang.code;
                    return (
                      <button
                        type="button"
                        key={lang.code}
                        onClick={() => {
                          const existing = translationCategory.translations?.find((t) => t.language === lang.code);
                          setTranslationData({
                            language: lang.code,
                            name: existing?.name || '',
                            description: existing?.description || '',
                          });
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-600 text-indigo-700 font-semibold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {lang.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Translated Name *
                </label>
                <input
                  type="text"
                  required
                  value={translationData.name}
                  onChange={(e) => setTranslationData({ ...translationData, name: e.target.value })}
                  placeholder="e.g. উচ্চশিক্ষা"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Translated Description
                </label>
                <textarea
                  rows={3}
                  value={translationData.description}
                  onChange={(e) => setTranslationData({ ...translationData, description: e.target.value })}
                  placeholder="Language specific overview..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTranslationModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 shadow-sm"
                >
                  Save Translation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
