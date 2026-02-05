'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface UserStats {
  reviews_count: number;
  followers_count: number;
  following_count: number;
}

interface ReviewRow {
  id: number;
  title: string;
  content: string;
  has_spoiler: boolean;
  created_at: string;
  animes: {
    id: number;
    title: string;
  } | null;
}

interface FavoriteAnime {
  anime_id: number;
  display_order: number | null;
  animes: {
    id: number;
    title: string;
    image_url: string | null;
  } | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [favorites, setFavorites] = useState<FavoriteAnime[]>([]);
  const [loading, setLoading] = useState(true);

  const handle = useMemo(() => {
    if (!profile) return '';
    if (profile.display_name) return profile.display_name;
    if (profile.username.includes('@')) {
      return `user-${profile.id.slice(0, 6)}`;
    }
    return profile.username;
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user && userId) {
      fetchAll();
    }
  }, [user, authLoading, userId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProfile(), fetchStats(), fetchReviews(), fetchFavorites()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, display_name, bio, avatar_url')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('ユーザー取得エラー:', error);
      return;
    }
    setProfile(data);
  };

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from('user_stats')
      .select('reviews_count, followers_count, following_count')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('統計取得エラー:', error);
      return;
    }
    if (data) {
      setStats({
        reviews_count: data.reviews_count || 0,
        followers_count: data.followers_count || 0,
        following_count: data.following_count || 0,
      });
    }
  };

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        title,
        content,
        has_spoiler,
        created_at,
        animes (id, title)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.error('感想取得エラー:', error);
      return;
    }

    const normalized = (data || []).map((review) => {
      const animeValue = Array.isArray(review.animes) ? review.animes[0] ?? null : review.animes ?? null;
      return { ...review, animes: animeValue };
    });
    setReviews(normalized);
  };

  const fetchFavorites = async () => {
    const { data, error } = await supabase
      .from('favorite_animes')
      .select('anime_id, display_order, animes (id, title, image_url)')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('お気に入り取得エラー:', error);
      return;
    }

    const normalized = (data || []).map((item) => {
      const animeValue = Array.isArray(item.animes) ? item.animes[0] ?? null : item.animes ?? null;
      return { ...item, animes: animeValue };
    });
    setFavorites(normalized);
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-600">ユーザーが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/users" className="p-2 rounded-full bg-white shadow hover:shadow-md">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
          <p className="text-gray-600">@{handle}</p>
        </div>
      </div>

      <div className="card p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.display_name?.charAt(0) || profile.username.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">
              {profile.display_name || profile.username}
            </h2>
            <p className="text-gray-600">@{handle}</p>
            <div className="mt-3">
              <Link href={`/messages/${profile.id}`} className="btn-primary inline-flex items-center">
                DMを送る
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 my-4">
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {stats?.reviews_count ?? 0}
                </span>
                <span className="text-gray-600 ml-2">感想</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {stats?.followers_count ?? 0}
                </span>
                <span className="text-gray-600 ml-2">フォロワー</span>
              </div>
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {stats?.following_count ?? 0}
                </span>
                <span className="text-gray-600 ml-2">フォロー中</span>
              </div>
            </div>

            {profile.bio && (
              <p className="text-gray-700">{profile.bio}</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageCircle className="w-6 h-6 mr-2 text-pink-600" />
            最近の感想
          </h2>
        </div>

        {reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {reviews.map((review) => (
              <Link key={review.id} href={`/reviews/${review.id}`}>
                <div className="card p-6 h-full">
                  {review.animes && (
                    <p className="text-sm text-pink-600 font-medium mb-2">
                      {review.animes.title}
                    </p>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {review.title}
                  </h3>
                  <p className="text-gray-700 line-clamp-3">{review.content}</p>
                  <p className="text-sm text-gray-500 mt-3">
                    {new Date(review.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-600">まだ感想が投稿されていません</div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Heart className="w-6 h-6 mr-2 text-pink-600" />
            お気に入りアニメ
          </h2>
        </div>

        {favorites.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {favorites.map((favorite) => (
              <div key={favorite.anime_id} className="card overflow-hidden">
                <div className="aspect-[3/4] bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200">
                  {favorite.animes?.image_url ? (
                    <img
                      src={favorite.animes.image_url}
                      alt={favorite.animes.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                      {favorite.animes?.title?.charAt(0) || 'A'}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900">
                    {favorite.animes?.title || '未設定'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-600">お気に入りが未登録です</div>
        )}
      </div>
    </div>
  );
}
