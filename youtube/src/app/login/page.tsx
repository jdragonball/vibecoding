'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    const success = login(email, password);
    if (success) {
      router.push('/');
    } else {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center min-h-[calc(100vh-56px)] bg-gray-50 dark:bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-white fill-current">
              <path d="M10 15l5.19-3L10 9v6m11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28-1.3.07-2.49.1-3.59.1L12 19c-4.19 0-6.8-.16-7.83-.44-.9-.25-1.48-.83-1.73-1.73-.13-.47-.22-1.1-.28-1.9-.07-.8-.1-1.49-.1-2.09L2 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33-.22 2.65-.28 1.3-.07 2.49-.1 3.59-.1L12 5c4.19 0 6.8.16 7.83.44.9.25 1.48.83 1.73 1.73z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold">로그인</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            YouTube Clone에 오신 것을 환영합니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">비밀번호</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            로그인
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            계정이 없으신가요?{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              회원가입
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-zinc-800">
          <p className="text-sm text-gray-500 text-center mb-4">테스트 계정</p>
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-zinc-800 p-3 rounded-lg">
            <p>이메일: cheolsu@example.com</p>
            <p>비밀번호: 아무거나 4자 이상</p>
          </div>
        </div>
      </div>
    </main>
  );
}
