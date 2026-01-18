'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Video } from '@/types';
import { useStore } from '@/store/useStore';
import { formatViews, formatTimeAgo, formatSubscribers } from '@/lib/utils';
import VideoActions from './VideoActions';

interface VideoInfoProps {
  video: Video;
}

export default function VideoInfo({ video }: VideoInfoProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { subscribe, unsubscribe, isSubscribed, isAuthenticated } = useStore();
  const subscribed = isSubscribed(video.channelId);

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (subscribed) {
      unsubscribe(video.channelId);
    } else {
      subscribe(video.channelId);
    }
  };

  return (
    <div className="mt-3">
      {/* Title */}
      <h1 className="text-xl font-semibold">{video.title}</h1>

      {/* Channel Info & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mt-3">
        {/* Channel */}
        <div className="flex items-center gap-3">
          <Link href={`/channel/${video.channelId}`}>
            <img
              src={video.channel.avatar}
              alt={video.channel.name}
              className="w-10 h-10 rounded-full"
            />
          </Link>
          <div>
            <Link
              href={`/channel/${video.channelId}`}
              className="font-semibold hover:text-gray-600"
            >
              {video.channel.name}
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              구독자 {formatSubscribers(video.channel.subscribers)}
            </p>
          </div>
          <button
            onClick={handleSubscribe}
            className={`ml-4 flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
              subscribed
                ? 'bg-gray-200 dark:bg-zinc-700 text-gray-800 dark:text-white'
                : 'bg-black dark:bg-white text-white dark:text-black'
            }`}
          >
            {subscribed ? (
              <>
                <BellOff className="w-5 h-5" />
                구독중
              </>
            ) : (
              '구독'
            )}
          </button>
        </div>

        {/* Actions */}
        <VideoActions video={video} />
      </div>

      {/* Description */}
      <div className="mt-4 p-3 bg-gray-100 dark:bg-zinc-800 rounded-xl">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span>{formatViews(video.views)}</span>
          <span>{formatTimeAgo(video.createdAt)}</span>
        </div>
        <p
          className={`mt-2 whitespace-pre-wrap ${
            !showFullDescription ? 'line-clamp-3' : ''
          }`}
        >
          {video.description}
        </p>
        <button
          onClick={() => setShowFullDescription(!showFullDescription)}
          className="mt-2 font-semibold text-sm"
        >
          {showFullDescription ? '간략히' : '더보기'}
        </button>
      </div>
    </div>
  );
}
