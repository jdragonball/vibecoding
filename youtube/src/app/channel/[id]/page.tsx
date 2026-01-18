'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Bell, BellOff } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { channels } from '@/data/mock-data';
import VideoCard from '@/components/video/VideoCard';
import { formatSubscribers, formatViews } from '@/lib/utils';

type TabType = 'videos' | 'about';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabType>('videos');
  const {
    getVideosByChannel,
    subscribe,
    unsubscribe,
    isSubscribed,
    isAuthenticated,
    sidebarOpen,
  } = useStore();

  const channel = channels.find((c) => c.id === channelId);
  const channelVideos = getVideosByChannel(channelId);
  const subscribed = isSubscribed(channelId);

  if (!channel) {
    return (
      <main className={`flex-1 ${sidebarOpen ? 'md:ml-60' : 'md:ml-[72px]'} p-8`}>
        <div className="text-center py-20">
          <h1 className="text-2xl font-semibold">채널을 찾을 수 없습니다</h1>
          <p className="text-gray-500 mt-2">
            요청하신 채널이 존재하지 않거나 삭제되었습니다.
          </p>
        </div>
      </main>
    );
  }

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (subscribed) {
      unsubscribe(channelId);
    } else {
      subscribe(channelId);
    }
  };

  return (
    <main className={`flex-1 ${sidebarOpen ? 'md:ml-60' : 'md:ml-[72px]'} transition-all duration-200`}>
      {/* Banner */}
      <div className="relative h-32 sm:h-48 md:h-56 bg-gray-200 dark:bg-zinc-800">
        <img
          src={channel.banner}
          alt={`${channel.name} 배너`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Channel Info */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4 py-4">
          <img
            src={channel.avatar}
            alt={channel.name}
            className="w-20 h-20 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-zinc-900 -mt-10 md:-mt-20 bg-white dark:bg-zinc-900"
          />
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">{channel.name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
              <span>@{channel.name.replace(/\s/g, '').toLowerCase()}</span>
              <span>•</span>
              <span>구독자 {formatSubscribers(channel.subscribers)}</span>
              <span>•</span>
              <span>동영상 {channelVideos.length}개</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
              {channel.description}
            </p>
          </div>
          <button
            onClick={handleSubscribe}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium ${
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

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-zinc-800">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('videos')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'videos'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              동영상
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'about'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              정보
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === 'videos' && (
            <>
              {channelVideos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {channelVideos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  <p className="text-xl">아직 업로드된 동영상이 없습니다.</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'about' && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-semibold mb-4">설명</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {channel.description}
              </p>

              <h2 className="text-lg font-semibold mt-8 mb-4">통계</h2>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <p>가입일: {channel.createdAt}</p>
                <p>총 조회수: {formatViews(channel.totalViews)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
