'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import VideoCard from '@/components/video/VideoCard';
import { Filter } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { searchVideos, sidebarOpen } = useStore();

  const results = useMemo(() => {
    if (!query) return [];
    return searchVideos(query);
  }, [query, searchVideos]);

  return (
    <main
      className={`flex-1 ${sidebarOpen ? 'md:ml-60' : 'md:ml-[72px]'} transition-all duration-200`}
    >
      <div className="border-b border-gray-200 dark:border-zinc-800 px-4 py-3">
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
          <Filter className="w-5 h-5" />
          필터
        </button>
      </div>

      <div className="p-4 max-w-4xl">
        {query ? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              &quot;{query}&quot; 검색결과 {results.length}개
            </p>
            <div className="space-y-4">
              {results.map((video) => (
                <VideoCard key={video.id} video={video} layout="list" />
              ))}
            </div>
            {results.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl text-gray-500">검색 결과가 없습니다.</p>
                <p className="text-gray-400 mt-2">
                  다른 검색어로 시도해 보세요.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-gray-500">검색어를 입력하세요.</p>
          </div>
        )}
      </div>
    </main>
  );
}

function SearchLoading() {
  return (
    <main className="flex-1 md:ml-60 transition-all duration-200">
      <div className="p-4 max-w-4xl">
        <div className="text-center py-20">
          <p className="text-xl text-gray-500">로딩 중...</p>
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchContent />
    </Suspense>
  );
}
