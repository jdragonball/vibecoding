'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Video, Comment, Subscription, Like } from '@/types';
import { videos as mockVideos, comments as mockComments, users, channels } from '@/data/mock-data';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string) => boolean;
  logout: () => void;

  // Videos
  videos: Video[];
  getVideoById: (id: string) => Video | undefined;
  getVideosByChannel: (channelId: string) => Video[];
  searchVideos: (query: string) => Video[];
  incrementViews: (videoId: string) => void;

  // Comments
  comments: Comment[];
  getCommentsByVideo: (videoId: string) => Comment[];
  addComment: (videoId: string, content: string) => void;
  deleteComment: (commentId: string) => void;

  // Likes
  likes: Like[];
  likeVideo: (videoId: string) => void;
  dislikeVideo: (videoId: string) => void;
  getLikeStatus: (videoId: string) => 'like' | 'dislike' | null;
  likeComment: (commentId: string) => void;
  dislikeComment: (commentId: string) => void;

  // Subscriptions
  subscriptions: Subscription[];
  subscribe: (channelId: string) => void;
  unsubscribe: (channelId: string) => void;
  isSubscribed: (channelId: string) => boolean;
  getSubscribedChannels: () => typeof channels;

  // UI State
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      currentUser: null,
      isAuthenticated: false,

      login: (email: string, password: string) => {
        const user = users.find((u) => u.email === email);
        if (user && password.length >= 4) {
          set({ currentUser: user, isAuthenticated: true });
          return true;
        }
        return false;
      },

      register: (name: string, email: string, password: string) => {
        const exists = users.find((u) => u.email === email);
        if (exists) return false;

        const newUser: User = {
          id: uuidv4(),
          name,
          email,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
          subscribers: 0,
          createdAt: new Date().toISOString().split('T')[0],
        };
        users.push(newUser);
        set({ currentUser: newUser, isAuthenticated: true });
        return true;
      },

      logout: () => {
        set({ currentUser: null, isAuthenticated: false });
      },

      // Videos
      videos: mockVideos,

      getVideoById: (id: string) => {
        return get().videos.find((v) => v.id === id);
      },

      getVideosByChannel: (channelId: string) => {
        return get().videos.filter((v) => v.channelId === channelId);
      },

      searchVideos: (query: string) => {
        const q = query.toLowerCase();
        return get().videos.filter(
          (v) =>
            v.title.toLowerCase().includes(q) ||
            v.description.toLowerCase().includes(q) ||
            v.channel.name.toLowerCase().includes(q)
        );
      },

      incrementViews: (videoId: string) => {
        set((state) => ({
          videos: state.videos.map((v) =>
            v.id === videoId ? { ...v, views: v.views + 1 } : v
          ),
        }));
      },

      // Comments
      comments: mockComments,

      getCommentsByVideo: (videoId: string) => {
        return get().comments.filter((c) => c.videoId === videoId);
      },

      addComment: (videoId: string, content: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const newComment: Comment = {
          id: uuidv4(),
          content,
          videoId,
          userId: currentUser.id,
          user: currentUser,
          likes: 0,
          dislikes: 0,
          createdAt: new Date().toISOString().split('T')[0],
        };

        set((state) => ({
          comments: [newComment, ...state.comments],
        }));
      },

      deleteComment: (commentId: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set((state) => ({
          comments: state.comments.filter(
            (c) => !(c.id === commentId && c.userId === currentUser.id)
          ),
        }));
      },

      // Likes
      likes: [],

      likeVideo: (videoId: string) => {
        const { currentUser, likes } = get();
        if (!currentUser) return;

        const existingLike = likes.find(
          (l) => l.videoId === videoId && l.userId === currentUser.id
        );

        if (existingLike) {
          if (existingLike.type === 'like') {
            // Remove like
            set((state) => ({
              likes: state.likes.filter((l) => l.id !== existingLike.id),
              videos: state.videos.map((v) =>
                v.id === videoId ? { ...v, likes: v.likes - 1 } : v
              ),
            }));
          } else {
            // Change dislike to like
            set((state) => ({
              likes: state.likes.map((l) =>
                l.id === existingLike.id ? { ...l, type: 'like' as const } : l
              ),
              videos: state.videos.map((v) =>
                v.id === videoId
                  ? { ...v, likes: v.likes + 1, dislikes: v.dislikes - 1 }
                  : v
              ),
            }));
          }
        } else {
          // Add new like
          const newLike: Like = {
            id: uuidv4(),
            userId: currentUser.id,
            videoId,
            type: 'like',
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            likes: [...state.likes, newLike],
            videos: state.videos.map((v) =>
              v.id === videoId ? { ...v, likes: v.likes + 1 } : v
            ),
          }));
        }
      },

      dislikeVideo: (videoId: string) => {
        const { currentUser, likes } = get();
        if (!currentUser) return;

        const existingLike = likes.find(
          (l) => l.videoId === videoId && l.userId === currentUser.id
        );

        if (existingLike) {
          if (existingLike.type === 'dislike') {
            // Remove dislike
            set((state) => ({
              likes: state.likes.filter((l) => l.id !== existingLike.id),
              videos: state.videos.map((v) =>
                v.id === videoId ? { ...v, dislikes: v.dislikes - 1 } : v
              ),
            }));
          } else {
            // Change like to dislike
            set((state) => ({
              likes: state.likes.map((l) =>
                l.id === existingLike.id ? { ...l, type: 'dislike' as const } : l
              ),
              videos: state.videos.map((v) =>
                v.id === videoId
                  ? { ...v, likes: v.likes - 1, dislikes: v.dislikes + 1 }
                  : v
              ),
            }));
          }
        } else {
          // Add new dislike
          const newLike: Like = {
            id: uuidv4(),
            userId: currentUser.id,
            videoId,
            type: 'dislike',
            createdAt: new Date().toISOString(),
          };
          set((state) => ({
            likes: [...state.likes, newLike],
            videos: state.videos.map((v) =>
              v.id === videoId ? { ...v, dislikes: v.dislikes + 1 } : v
            ),
          }));
        }
      },

      getLikeStatus: (videoId: string) => {
        const { currentUser, likes } = get();
        if (!currentUser) return null;

        const like = likes.find(
          (l) => l.videoId === videoId && l.userId === currentUser.id
        );
        return like?.type || null;
      },

      likeComment: (commentId: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId ? { ...c, likes: c.likes + 1 } : c
          ),
        }));
      },

      dislikeComment: (commentId: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set((state) => ({
          comments: state.comments.map((c) =>
            c.id === commentId ? { ...c, dislikes: c.dislikes + 1 } : c
          ),
        }));
      },

      // Subscriptions
      subscriptions: [],

      subscribe: (channelId: string) => {
        const { currentUser, subscriptions } = get();
        if (!currentUser) return;

        const exists = subscriptions.find(
          (s) => s.channelId === channelId && s.userId === currentUser.id
        );
        if (exists) return;

        const newSub: Subscription = {
          id: uuidv4(),
          userId: currentUser.id,
          channelId,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          subscriptions: [...state.subscriptions, newSub],
        }));
      },

      unsubscribe: (channelId: string) => {
        const { currentUser } = get();
        if (!currentUser) return;

        set((state) => ({
          subscriptions: state.subscriptions.filter(
            (s) => !(s.channelId === channelId && s.userId === currentUser.id)
          ),
        }));
      },

      isSubscribed: (channelId: string) => {
        const { currentUser, subscriptions } = get();
        if (!currentUser) return false;

        return subscriptions.some(
          (s) => s.channelId === channelId && s.userId === currentUser.id
        );
      },

      getSubscribedChannels: () => {
        const { currentUser, subscriptions } = get();
        if (!currentUser) return [];

        const subscribedChannelIds = subscriptions
          .filter((s) => s.userId === currentUser.id)
          .map((s) => s.channelId);

        return channels.filter((c) => subscribedChannelIds.includes(c.id));
      },

      // UI State
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }),
    }),
    {
      name: 'youtube-clone-storage',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        likes: state.likes,
        subscriptions: state.subscriptions,
        comments: state.comments,
      }),
    }
  )
);
