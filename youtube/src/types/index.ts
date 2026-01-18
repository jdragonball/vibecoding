export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  subscribers: number;
  createdAt: string;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  views: number;
  likes: number;
  dislikes: number;
  duration: string;
  createdAt: string;
  channelId: string;
  channel: Channel;
  category: string;
}

export interface Channel {
  id: string;
  name: string;
  avatar: string;
  banner: string;
  description: string;
  subscribers: number;
  totalViews: number;
  createdAt: string;
  userId: string;
}

export interface Comment {
  id: string;
  content: string;
  videoId: string;
  userId: string;
  user: User;
  likes: number;
  dislikes: number;
  createdAt: string;
  replies?: Comment[];
}

export interface Subscription {
  id: string;
  userId: string;
  channelId: string;
  createdAt: string;
}

export interface Like {
  id: string;
  userId: string;
  videoId?: string;
  commentId?: string;
  type: 'like' | 'dislike';
  createdAt: string;
}
