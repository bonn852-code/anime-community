'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, MessageCircle, Heart, Save, UploadCloud } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import type { User } from '@/types/database';

interface UserStats {
  reviews_count: number;
  followers_count: number;
  following_count: number;
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

interface AnimeOption {
  id: number;
  title: string;
  title_en?: string;
  image_url?: string | null;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<FavoriteAnime[]>([]);
  const [animes, setAnimes] = useState<AnimeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
  });
  const [favoriteSelections, setFavoriteSelections] = useState<(number | '')[]>(['', '', '']);
  const [favoriteSearch, setFavoriteSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchAll();
    }
  }, [user, authLoading]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProfile(), fetchStats(), fetchReviews(), fetchFavorites(), fetchAnimes()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user!.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const fallbackUsername =
          (user.user_metadata?.username as string | undefined) ||
          user.email?.split('@')[0] ||
          `user-${user.id.slice(0, 8)}`;

        const { error: insertError } = await supabase.from('users').insert({
          id: user.id,
          username: fallbackUsername,
          display_name: fallbackUsername,
        });

        if (insertError) throw insertError;

        const { data: refreshed, error: refreshError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (refreshError) throw refreshError;
        setProfile(refreshed);
        setFormState({
          display_name: refreshed.display_name || '',
          bio: refreshed.bio || '',
          avatar_url: refreshed.avatar_url || '',
        });
        return;
      }

      setProfile(data);
      setFormState({
        display_name: data.display_name || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || '',
      });
    } catch (error) {
      console.error('プロフィール取得エラー:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await supabase
        .from('user_stats')
        .select('reviews_count, followers_count, following_count')
        .eq('user_id', user!.id)
        .single();

      if (data) {
        setStats({
          reviews_count: data.reviews_count || 0,
          followers_count: data.followers_count || 0,
          following_count: data.following_count || 0,
        });
      }
    } catch (error) {
      console.error('統計取得エラー:', error);
    }
  };

  const fetchReviews = async () => {
    try {
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
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      const normalized = (data || []).map((review) => {
        const animeValue = Array.isArray(review.animes) ? review.animes[0] ?? null : review.animes ?? null;
        return { ...review, animes: animeValue };
      });
      setReviews(normalized);
    } catch (error) {
      console.error('感想取得エラー:', error);
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from('favorite_animes')
        .select('anime_id, display_order, animes (id, title, image_url)')
        .eq('user_id', user!.id)
        .order('display_order', { ascending: true });

      if (error) throw error;
      const normalized = (data || []).map((item) => {
        const animeValue = Array.isArray(item.animes) ? item.animes[0] ?? null : item.animes ?? null;
        return { ...item, animes: animeValue };
      });
      setFavorites(normalized);

      const selections: (number | '')[] = ['', '', ''];
      normalized.forEach((item) => {
        if (item.display_order && item.display_order >= 1 && item.display_order <= 3) {
          selections[item.display_order - 1] = item.anime_id;
        }
      });
      setFavoriteSelections(selections);
    } catch (error) {
      console.error('お気に入り取得エラー:', error);
    }
  };

  const fetchAnimes = async () => {
    try {
      const { data, error } = await supabase
        .from('animes')
        .select('id, title, image_url')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnimes(data || []);
    } catch (error) {
      console.error('アニメ取得エラー:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          display_name: formState.display_name.trim(),
          bio: formState.bio.trim(),
          avatar_url: formState.avatar_url.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase
        .from('favorite_animes')
        .delete()
        .eq('user_id', user.id);

      const payload = favoriteSelections
        .map((animeId, index) =>
          animeId
            ? {
                user_id: user.id,
                anime_id: animeId,
                display_order: index + 1,
              }
            : null
        )
        .filter(Boolean) as { user_id: string; anime_id: number; display_order: number }[];

      if (payload.length > 0) {
        const { error: favoriteError } = await supabase.from('favorite_animes').insert(payload);
        if (favoriteError) throw favoriteError;
      }

      await fetchAll();
      setIsEditing(false);
    } catch (error) {
      console.error('プロフィール保存エラー:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setAvatarUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setFormState((prev) => ({ ...prev, avatar_url: data.publicUrl }));
    } catch (error) {
      console.error('アバターアップロードエラー:', error);
    } finally {
      setAvatarUploading(false);
    }
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
        <p className="text-gray-600">プロフィールが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="card p-6 md:p-8">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white text-5xl font-bold overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.display_name?.charAt(0) || profile.username.charAt(0).toUpperCase()
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-1">
                  {profile.display_name || profile.username}
                </h1>
                <p className="text-gray-600">@{profile.username}</p>
              </div>

              <button
                className="btn-secondary flex items-center justify-center mt-4 md:mt-0"
                onClick={() => setIsEditing((prev) => !prev)}
              >
                <Settings className="w-5 h-5 mr-2" />
                {isEditing ? '編集を閉じる' : 'プロフィール編集'}
              </button>
            </div>

            <div className="flex flex-wrap gap-6 mb-4">
              <div>
                <span className="text-2xl font-bold text-gray-900">
                  {stats?.reviews_count ?? reviews.length}
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

            {profile.bio && !isEditing && (
              <p className="text-gray-700">{profile.bio}</p>
            )}
          </div>
        </div>
      </div>

      {isEditing && (
        <div className="card p-6 md:p-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">プロフィール編集</h2>

          <div>
            <label className="text-sm font-semibold text-gray-900">表示名</label>
            <input
              value={formState.display_name}
              onChange={(e) => setFormState((prev) => ({ ...prev, display_name: e.target.value }))}
              className="input-field mt-2"
              placeholder="表示名"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-900">自己紹介</label>
            <textarea
              value={formState.bio}
              onChange={(e) => setFormState((prev) => ({ ...prev, bio: e.target.value }))}
              className="input-field mt-2 min-h-[140px]"
              placeholder="好きなアニメや推しポイントを書いてみよう"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-900">アバター画像URL</label>
            <input
              value={formState.avatar_url}
              onChange={(e) => setFormState((prev) => ({ ...prev, avatar_url: e.target.value }))}
              className="input-field mt-2"
              placeholder="https://..."
            />
            <div className="mt-3">
              <label className="text-xs font-semibold text-gray-600">画像をアップロード</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleAvatarUpload(file);
                    }
                  }}
                  className="text-sm text-gray-600"
                />
                {avatarUploading && (
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <UploadCloud className="w-4 h-4" />
                    アップロード中...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card p-5 bg-pink-50/60 space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <p className="text-sm font-semibold text-gray-900">お気に入りアニメ (最大3つ)</p>
            </div>
            <div>
              <label className="text-xs text-gray-500">検索</label>
              <input
                value={favoriteSearch}
                onChange={(e) => setFavoriteSearch(e.target.value)}
                className="input-field mt-2"
                placeholder="タイトルで絞り込み"
              />
            </div>
            {favoriteSelections.map((selection, index) => (
              <div key={index}>
                <label className="text-xs text-gray-500">お気に入り {index + 1}</label>
                <select
                  value={selection}
                  onChange={(e) => {
                    const next = [...favoriteSelections];
                    next[index] = e.target.value ? Number(e.target.value) : '';
                    setFavoriteSelections(next);
                  }}
                  className="input-field mt-2"
                >
                  <option value="">未選択</option>
                  {animes
                    .filter((anime) => {
                      if (!favoriteSearch.trim()) return true;
                      const query = favoriteSearch.toLowerCase();
                      return (
                        anime.title.toLowerCase().includes(query) ||
                        anime.title_en?.toLowerCase().includes(query)
                      );
                    })
                    .map((anime) => (
                    <option key={anime.id} value={anime.id}>
                      {anime.title}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="btn-primary inline-flex items-center justify-center"
            disabled={saving}
          >
            <Save className="w-4 h-4 mr-2" />
            保存する
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageCircle className="w-6 h-6 mr-2 text-pink-600" />
            最近の感想
          </h2>
        </div>

        {reviews.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {reviews.map((review: any) => (
              <div key={review.id} className="card p-6">
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
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">まだ感想が投稿されていません</p>
          </div>
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
