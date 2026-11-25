'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FolderTree,
  Users,
  Shield,
  LayoutDashboard,
  Menu,
  X,
  Globe,
  Settings,
  ChevronRight,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

function NavLinks({
  isMobile,
  onItemClick,
}: {
  isMobile?: boolean;
  onItemClick?: () => void;
}) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Categories', href: '/admin/categories', icon: FolderTree },
    { name: 'Authors', href: '/admin/authors', icon: Users },
    { name: 'Roles & RBAC', href: '/admin/roles', icon: Shield },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  if (isMobile) {
    return (
      <div className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onItemClick}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <nav className="flex-1 space-y-1.5">
      {navigation.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
        const Icon = item.icon;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center space-x-3">
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{item.name}</span>
            </div>
            {isActive && <ChevronRight className="w-4 h-4 text-indigo-200" />}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Globe className="w-6 h-6 text-indigo-600" />
          <span className="font-bold text-lg text-slate-800">Admin Portal</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3">
          <Suspense fallback={<div className="h-40 bg-slate-100 animate-pulse rounded-lg" />}>
            <NavLinks isMobile onItemClick={() => setIsMobileMenuOpen(false)} />
          </Suspense>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen p-4">
        <div className="flex items-center space-x-3 px-3 py-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-800 leading-tight">Admin Portal</h1>
            <p className="text-xs text-slate-500">Information & Opportunity</p>
          </div>
        </div>

        <Suspense fallback={<div className="flex-1 bg-slate-100 animate-pulse rounded-xl" />}>
          <NavLinks />
        </Suspense>

        <div className="pt-4 mt-auto border-t border-slate-100">
          <div className="flex items-center space-x-3 px-3 py-2 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">Super Admin</p>
              <p className="text-[10px] text-emerald-600 font-medium">RBAC Full Access</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
