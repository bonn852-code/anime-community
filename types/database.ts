export interface User {
  id: string;
  username: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  avatar_position?: string;
  is_suspended?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Anime {
  id: number;
  title: string;
  title_en?: string;
  season?: string;
  year?: number;
  genre?: string[];
  image_url?: string;
  description?: string;
  created_at: string;
}

export interface Review {
  id: number;
  user_id: string;
  anime_id: number;
  title: string;
  content: string;
  has_spoiler: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  review_id: number;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface Like {
  id: number;
  user_id: string;
  review_id: number;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: string;
  type: 'comment' | 'like' | 'follow';
  actor_id: string;
  review_id?: number;
  is_read: boolean;
  created_at: string;
}

export interface WatchlistItem {
  id: number;
  user_id: string;
  anime_id: number;
  status: 'plan' | 'watching' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}
