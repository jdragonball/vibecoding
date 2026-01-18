'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import VideoCard from '@/components/video/VideoCard';
import CategoryChips from '@/components/home/CategoryChips';

export default function Home() {
  const { videos, sidebarOpen } = useStore();
  const [selectedCategory, setSelectedCategory] = useState('전체');

  const filteredVideos = useMemo(() => {
    if (selectedCategory === '전체') return videos;
    return videos.filter((video) => video.category === selectedCategory);
  }, [videos, selectedCategory]);

  return (
    <main
      className={`flex-1 ${sidebarOpen ? 'md:ml-60' : 'md:ml-[72px]'} transition-all duration-200`}
    >
      <div className="sticky top-14 bg-white dark:bg-zinc-900 z-30 px-4 border-b border-gray-200 dark:border-zinc-800">
        <CategoryChips
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
        {filteredVideos.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-xl">해당 카테고리의 동영상이 없습니다.</p>
          </div>
        )}
      </div>
    </main>
  );
}
