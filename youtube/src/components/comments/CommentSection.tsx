'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MoreVertical, Trash2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatTimeAgo, formatNumber } from '@/lib/utils';

interface CommentSectionProps {
  videoId: string;
}

export default function CommentSection({ videoId }: CommentSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [sortBy, setSortBy] = useState<'top' | 'newest'>('top');

  const {
    getCommentsByVideo,
    addComment,
    deleteComment,
    likeComment,
    dislikeComment,
    currentUser,
    isAuthenticated,
  } = useStore();

  const comments = getCommentsByVideo(videoId);
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'top') {
      return b.likes - a.likes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      return;
    }
    if (newComment.trim()) {
      addComment(videoId, newComment.trim());
      setNewComment('');
      setShowInput(false);
    }
  };

  const handleCancel = () => {
    setNewComment('');
    setShowInput(false);
  };

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-6 mb-6">
        <h2 className="text-xl font-semibold">댓글 {comments.length}개</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortBy('top')}
            className={`text-sm ${sortBy === 'top' ? 'font-semibold' : 'text-gray-600'}`}
          >
            인기 댓글순
          </button>
          <span className="text-gray-400">|</span>
          <button
            onClick={() => setSortBy('newest')}
            className={`text-sm ${sortBy === 'newest' ? 'font-semibold' : 'text-gray-600'}`}
          >
            최신순
          </button>
        </div>
      </div>

      {/* Add Comment */}
      <div className="flex gap-4 mb-6">
        {isAuthenticated ? (
          <img
            src={currentUser?.avatar}
            alt={currentUser?.name}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-zinc-700 flex items-center justify-center">
            <span className="text-lg">?</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onFocus={() => setShowInput(true)}
            placeholder="댓글 추가..."
            className="w-full pb-2 bg-transparent border-b border-gray-300 dark:border-zinc-700 focus:outline-none focus:border-black dark:focus:border-white"
          />
          {showInput && (
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!newComment.trim()}
                className={`px-4 py-2 rounded-full ${
                  newComment.trim()
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 dark:bg-zinc-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                댓글
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {sortedComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onLike={() => likeComment(comment.id)}
            onDislike={() => dislikeComment(comment.id)}
            onDelete={() => deleteComment(comment.id)}
            canDelete={currentUser?.id === comment.userId}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>

      {comments.length === 0 && (
        <p className="text-center py-10 text-gray-500">
          아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
        </p>
      )}
    </div>
  );
}

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    user: { name: string; avatar: string };
    likes: number;
    dislikes: number;
    createdAt: string;
  };
  onLike: () => void;
  onDislike: () => void;
  onDelete: () => void;
  canDelete: boolean;
  isAuthenticated: boolean;
}

function CommentItem({
  comment,
  onLike,
  onDislike,
  onDelete,
  canDelete,
  isAuthenticated,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      return;
    }
    onLike();
  };

  const handleDislike = () => {
    if (!isAuthenticated) {
      alert('로그인이 필요합니다.');
      return;
    }
    onDislike();
  };

  return (
    <div className="flex gap-4 group">
      <img
        src={comment.user.avatar}
        alt={comment.user.name}
        className="w-10 h-10 rounded-full"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{comment.user.name}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatTimeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="mt-1">{comment.content}</p>
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={handleLike}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            <ThumbsUp className="w-4 h-4" />
            {comment.likes > 0 && formatNumber(comment.likes)}
          </button>
          <button
            onClick={handleDislike}
            className="text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
          <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white">
            답글
          </button>
        </div>
      </div>
      {canDelete && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-lg py-2 z-10">
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-zinc-700 flex items-center gap-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
