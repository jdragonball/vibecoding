'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Menu,
  Search,
  Mic,
  Video,
  Bell,
  User,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function Header() {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const { toggleSidebar, currentUser, isAuthenticated, logout, setSearchQuery } =
    useStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 z-50 flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link href="/" className="flex items-center gap-1">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 text-white fill-current"
            >
              <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
            </svg>
          </div>
          <span className="text-xl font-semibold hidden sm:block">
            YouTube
          </span>
        </Link>
      </div>

      {/* Center Section - Search */}
      <form
        onSubmit={handleSearch}
        className="flex-1 max-w-2xl mx-4 hidden sm:flex"
      >
        <div className="flex w-full">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="검색"
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-l-full bg-white dark:bg-zinc-900 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="px-6 bg-gray-100 dark:bg-zinc-800 border border-l-0 border-gray-300 dark:border-zinc-700 rounded-r-full hover:bg-gray-200 dark:hover:bg-zinc-700"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
        <button
          type="button"
          className="ml-2 p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
        >
          <Mic className="w-5 h-5" />
        </button>
      </form>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search */}
        <button className="sm:hidden p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
          <Search className="w-6 h-6" />
        </button>

        {isAuthenticated ? (
          <>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
              <Video className="w-6 h-6" />
            </button>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-600 rounded-full"></span>
            </button>
            <div className="relative group">
              <button className="ml-2">
                <img
                  src={currentUser?.avatar}
                  alt={currentUser?.name}
                  className="w-8 h-8 rounded-full"
                />
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-zinc-700">
                  <p className="font-semibold">{currentUser?.name}</p>
                  <p className="text-sm text-gray-500">{currentUser?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  로그아웃
                </button>
              </div>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 px-3 py-1.5 border border-blue-500 text-blue-500 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <User className="w-5 h-5" />
            <span className="hidden sm:inline">로그인</span>
          </Link>
        )}
      </div>
    </header>
  );
}
