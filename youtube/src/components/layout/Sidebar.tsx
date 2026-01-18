'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  Flame,
  ShoppingBag,
  Music2,
  Film,
  Radio,
  Gamepad2,
  Newspaper,
  Trophy,
  Lightbulb,
  Shirt,
  Settings,
  Flag,
  HelpCircle,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

const mainLinks = [
  { icon: Home, label: '홈', href: '/' },
  { icon: Compass, label: '탐색', href: '/explore' },
  { icon: PlaySquare, label: 'Shorts', href: '/shorts' },
  { icon: PlaySquare, label: '구독', href: '/subscriptions' },
];

const libraryLinks = [
  { icon: PlaySquare, label: '보관함', href: '/library' },
  { icon: Clock, label: '시청 기록', href: '/history' },
  { icon: ThumbsUp, label: '좋아요 표시한 동영상', href: '/liked' },
];

const exploreLinks = [
  { icon: Flame, label: '인기', href: '/trending' },
  { icon: ShoppingBag, label: '쇼핑', href: '/shopping' },
  { icon: Music2, label: '음악', href: '/music' },
  { icon: Film, label: '영화', href: '/movies' },
  { icon: Radio, label: '실시간', href: '/live' },
  { icon: Gamepad2, label: '게임', href: '/gaming' },
  { icon: Newspaper, label: '뉴스', href: '/news' },
  { icon: Trophy, label: '스포츠', href: '/sports' },
  { icon: Lightbulb, label: '학습', href: '/learning' },
  { icon: Shirt, label: '패션/뷰티', href: '/fashion' },
];

const settingsLinks = [
  { icon: Settings, label: '설정', href: '/settings' },
  { icon: Flag, label: '신고 기록', href: '/report-history' },
  { icon: HelpCircle, label: '고객센터', href: '/help' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, isAuthenticated, getSubscribedChannels } = useStore();
  const subscribedChannels = getSubscribedChannels();

  if (!sidebarOpen) {
    return (
      <aside className="fixed left-0 top-14 w-[72px] h-[calc(100vh-56px)] bg-white dark:bg-zinc-900 overflow-y-auto z-40 hidden md:block">
        <div className="py-2">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center px-1 py-4 hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                pathname === link.href ? 'bg-gray-100 dark:bg-zinc-800' : ''
              }`}
            >
              <link.icon className="w-6 h-6" />
              <span className="text-[10px] mt-1">{link.label}</span>
            </Link>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-14 w-60 h-[calc(100vh-56px)] bg-white dark:bg-zinc-900 overflow-y-auto z-40 hidden md:block scrollbar-thin">
      <div className="py-3 px-3">
        {/* Main Links */}
        <div className="pb-3 border-b border-gray-200 dark:border-zinc-800">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-6 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                pathname === link.href
                  ? 'bg-gray-100 dark:bg-zinc-800 font-medium'
                  : ''
              }`}
            >
              <link.icon className="w-6 h-6" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Library Links */}
        {isAuthenticated && (
          <div className="py-3 border-b border-gray-200 dark:border-zinc-800">
            <h3 className="px-3 py-1 text-sm font-semibold">나</h3>
            {libraryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-6 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                  pathname === link.href
                    ? 'bg-gray-100 dark:bg-zinc-800 font-medium'
                    : ''
                }`}
              >
                <link.icon className="w-6 h-6" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Subscriptions */}
        {isAuthenticated && subscribedChannels.length > 0 && (
          <div className="py-3 border-b border-gray-200 dark:border-zinc-800">
            <h3 className="px-3 py-1 text-sm font-semibold">구독</h3>
            {subscribedChannels.map((channel) => (
              <Link
                key={channel.id}
                href={`/channel/${channel.id}`}
                className="flex items-center gap-6 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <img
                  src={channel.avatar}
                  alt={channel.name}
                  className="w-6 h-6 rounded-full"
                />
                <span className="truncate">{channel.name}</span>
              </Link>
            ))}
          </div>
        )}

        {/* Explore Links */}
        <div className="py-3 border-b border-gray-200 dark:border-zinc-800">
          <h3 className="px-3 py-1 text-sm font-semibold">탐색</h3>
          {exploreLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-6 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                pathname === link.href
                  ? 'bg-gray-100 dark:bg-zinc-800 font-medium'
                  : ''
              }`}
            >
              <link.icon className="w-6 h-6" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Settings Links */}
        <div className="py-3">
          {settingsLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-6 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 ${
                pathname === link.href
                  ? 'bg-gray-100 dark:bg-zinc-800 font-medium'
                  : ''
              }`}
            >
              <link.icon className="w-6 h-6" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="py-4 px-3 text-xs text-gray-500">
          <p>© 2024 YouTube Clone</p>
          <p className="mt-2">Made with Next.js & TypeScript</p>
        </div>
      </div>
    </aside>
  );
}
