'use client';

import Link from 'next/link';
import { Video } from '@/types';
import { formatViews, formatTimeAgo } from '@/lib/utils';

interface VideoCardProps {
  video: Video;
  layout?: 'grid' | 'list';
}

export default function VideoCard({ video, layout = 'grid' }: VideoCardProps) {
  if (layout === 'list') {
    return (
      <Link href={`/watch/${video.id}`} className="flex gap-4 group">
        <div className="relative flex-shrink-0 w-[360px] aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-zinc-800">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
            {video.duration}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600">
            {video.title}
          </h3>
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
            <span>{formatViews(video.views)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.createdAt)}</span>
          </div>
          <Link
            href={`/channel/${video.channelId}`}
            className="flex items-center gap-2 mt-3 hover:text-gray-900 dark:hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={video.channel.avatar}
              alt={video.channel.name}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {video.channel.name}
            </span>
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
            {video.description}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div className="group">
      <Link href={`/watch/${video.id}`}>
        <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-zinc-800">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
            {video.duration}
          </span>
        </div>
      </Link>
      <div className="flex gap-3 mt-3">
        <Link href={`/channel/${video.channelId}`} className="flex-shrink-0">
          <img
            src={video.channel.avatar}
            alt={video.channel.name}
            className="w-9 h-9 rounded-full"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/watch/${video.id}`}>
            <h3 className="font-semibold line-clamp-2 group-hover:text-blue-600">
              {video.title}
            </h3>
          </Link>
          <Link
            href={`/channel/${video.channelId}`}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {video.channel.name}
          </Link>
          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
            <span>{formatViews(video.views)}</span>
            <span>•</span>
            <span>{formatTimeAgo(video.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
