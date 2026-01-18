'use client';

import { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  MoreHorizontal,
  Flag,
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { Video } from '@/types';
import { formatNumber } from '@/lib/utils';

interface VideoActionsProps {
  video: Video;
}

export default function VideoActions({ video }: VideoActionsProps) {
  const { likeVideo, dislikeVideo, getLikeStatus, isAuthenticated } = useStore();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const likeStatus = getLikeStatus(video.id);

  const handleLike = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      return;
    }
    likeVideo(video.id);
  };

  const handleDislike = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      return;
    }
    dislikeVideo(video.id);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: video.title,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('링크가 복사되었습니다.');
    }
    setShowShareMenu(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Like/Dislike */}
      <div className="flex items-center bg-gray-100 dark:bg-zinc-800 rounded-full">
        <button
          onClick={handleLike}
          className={`flex items-center gap-2 px-4 py-2 rounded-l-full hover:bg-gray-200 dark:hover:bg-zinc-700 border-r border-gray-300 dark:border-zinc-600 ${
            likeStatus === 'like' ? 'text-blue-600' : ''
          }`}
        >
          <ThumbsUp
            className={`w-5 h-5 ${likeStatus === 'like' ? 'fill-current' : ''}`}
          />
          <span>{formatNumber(video.likes)}</span>
        </button>
        <button
          onClick={handleDislike}
          className={`flex items-center gap-2 px-4 py-2 rounded-r-full hover:bg-gray-200 dark:hover:bg-zinc-700 ${
            likeStatus === 'dislike' ? 'text-blue-600' : ''
          }`}
        >
          <ThumbsDown
            className={`w-5 h-5 ${likeStatus === 'dislike' ? 'fill-current' : ''}`}
          />
        </button>
      </div>

      {/* Share */}
      <div className="relative">
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
        >
          <Share2 className="w-5 h-5" />
          <span>공유</span>
        </button>
      </div>

      {/* Download */}
      <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700">
        <Download className="w-5 h-5" />
        <span>오프라인 저장</span>
      </button>

      {/* More */}
      <div className="relative">
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="p-2 bg-gray-100 dark:bg-zinc-800 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
        {showMoreMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-lg py-2 z-10">
            <button className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center gap-3">
              <Flag className="w-5 h-5" />
              신고
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
