'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import VideoPlayer from '@/components/video/VideoPlayer';
import VideoInfo from '@/components/video/VideoInfo';
import VideoCard from '@/components/video/VideoCard';
import CommentSection from '@/components/comments/CommentSection';

export default function WatchPage() {
  const params = useParams();
  const videoId = params.id as string;
  const { getVideoById, videos, incrementViews, sidebarOpen } = useStore();
  const video = getVideoById(videoId);

  useEffect(() => {
    if (video) {
      incrementViews(videoId);
    }
  }, [videoId]);

  if (!video) {
    return (
      <main className={`flex-1 ${sidebarOpen ? 'md:ml-60' : 'md:ml-[72px]'} p-8`}>
        <div className="text-center py-20">
          <h1 className="text-2xl font-semibold">동영상을 찾을 수 없습니다</h1>
          <p className="text-gray-500 mt-2">
            요청하신 동영상이 존재하지 않거나 삭제되었습니다.
          </p>
        </div>
      </main>
    );
  }

  const relatedVideos = videos
    .filter((v) => v.id !== videoId)
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);

  return (
    <main className={`flex-1 ${sidebarOpen ? 'md:ml-60' : 'md:ml-[72px]'} transition-all duration-200`}>
      <div className="flex flex-col xl:flex-row gap-6 p-4 max-w-[1800px] mx-auto">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <VideoPlayer videoUrl={video.videoUrl} thumbnail={video.thumbnail} />
          <VideoInfo video={video} />
          <CommentSection videoId={videoId} />
        </div>

        {/* Related Videos */}
        <aside className="xl:w-[400px] flex-shrink-0">
          <h2 className="font-semibold mb-4">관련 동영상</h2>
          <div className="space-y-3">
            {relatedVideos.map((v) => (
              <RelatedVideoCard key={v.id} video={v} />
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

import Link from 'next/link';
import { Video } from '@/types';
import { formatViews, formatTimeAgo } from '@/lib/utils';

function RelatedVideoCard({ video }: { video: Video }) {
  return (
    <Link href={`/watch/${video.id}`} className="flex gap-2 group">
      <div className="relative flex-shrink-0 w-[168px] aspect-video rounded-lg overflow-hidden bg-gray-200 dark:bg-zinc-800">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
          {video.duration}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {video.channel.name}
        </p>
        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
          <span>{formatViews(video.views)}</span>
          <span>•</span>
          <span>{formatTimeAgo(video.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
