'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { categories } from '@/data/mock-data';

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryChips({
  selectedCategory,
  onSelectCategory,
}: CategoryChipsProps) {
  const [scrollPosition, setScrollPosition] = useState(0);

  const scroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('chips-container');
    if (container) {
      const scrollAmount = 200;
      const newPosition =
        direction === 'left'
          ? Math.max(0, scrollPosition - scrollAmount)
          : scrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  return (
    <div className="relative flex items-center">
      {scrollPosition > 0 && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 z-10 p-2 bg-white dark:bg-zinc-900 shadow-md rounded-full"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <div
        id="chips-container"
        className="flex gap-3 overflow-x-auto chips-container py-3 px-2"
      >
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                : 'bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 z-10 p-2 bg-white dark:bg-zinc-900 shadow-md rounded-full"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
