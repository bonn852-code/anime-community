'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings, MessageCircle, Heart, Save, UploadCloud, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { maskNgWords } from '@/lib/ngWordFilter';
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

interface WatchlistItem {
  anime_id: number;
  status: 'plan' | 'watching' | 'completed' | 'paused';
  animes: {
    id: number;
    title: string;
    image_url: string | null;
  } | null;
}

interface Badge {
  key: string;
  label: string;
  tone: string;
}

interface UserCategory {
  id: number;
  name: string;
}

interface UserCategoryAnime {
  id: number;
  anime_id: number;
  category_id: number;
  animes: {
    id: number;
    title: string;
    image_url: string | null;
  } | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const parseAvatarPosition = (value: string | null | undefined): { x: number; y: number } => {
  if (!value) return { x: 50, y: 50 };
  const percentMatch = value.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    return {
      x: clamp(Number(percentMatch[1]), 0, 100),
      y: clamp(Number(percentMatch[2]), 0, 100),
    };
  }
  if (value === 'top') return { x: 50, y: 20 };
  if (value === 'bottom') return { x: 50, y: 80 };
  if (value === 'left') return { x: 20, y: 50 };
  if (value === 'right') return { x: 80, y: 50 };
  return { x: 50, y: 50 };
};

export default function ProfilePage() {
  const REVIEWS_PER_PAGE = 6;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<FavoriteAnime[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [categoryItems, setCategoryItems] = useState<UserCategoryAnime[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryAnimeId, setCategoryAnimeId] = useState<number | ''>('');
  const [categoryTargetId, setCategoryTargetId] = useState<number | ''>('');
  const [likesReceived, setLikesReceived] = useState(0);
  const [animes, setAnimes] = useState<AnimeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
    avatar_position: 'center',
  });
  const [favoriteSelections, setFavoriteSelections] = useState<(number | '')[]>(['', '', '']);
  const [favoriteSearch, setFavoriteSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [avatarPositionPicker, setAvatarPositionPicker] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const avatarAdjustingRef = useRef(false);
  const avatarPickerRef = useRef<HTMLDivElement | null>(null);

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
      await Promise.all([
        fetchProfile(),
        fetchStats(),
        fetchReviews(),
        fetchFavorites(),
        fetchWatchlist(),
        fetchLikesReceived(),
        fetchCategories(),
        fetchCategoryItems(),
        fetchAnimes(),
      ]);
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
          avatar_position: refreshed.avatar_position || 'center',
        });
        setAvatarPositionPicker(parseAvatarPosition(refreshed.avatar_position || 'center'));
        return;
      }

      setProfile(data);
      setFormState({
        display_name: data.display_name || '',
        bio: data.bio || '',
        avatar_url: data.avatar_url || '',
        avatar_position: data.avatar_position || 'center',
      });
      setAvatarPositionPicker(parseAvatarPosition(data.avatar_position || 'center'));
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      const normalized = (data || []).map((review) => {
        const animeValue = Array.isArray(review.animes) ? review.animes[0] ?? null : review.animes ?? null;
        return { ...review, animes: animeValue };
      });
      setReviews(normalized);
      setReviewPage(1);
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

  const fetchWatchlist = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('watchlists')
        .select('anime_id, status, animes (id, title, image_url)')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const normalized = (data || []).map((item) => {
        const animeValue = Array.isArray(item.animes) ? item.animes[0] ?? null : item.animes ?? null;
        return { ...item, animes: animeValue };
      });
      setWatchlist(normalized);
    } catch (error) {
      console.error('視聴リスト取得エラー:', error);
    }
  };

  const fetchCategories = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_categories')
      .select('id, name')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('カテゴリ取得エラー:', error);
      return;
    }
    setCategories(data || []);
  };

  const fetchCategoryItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('user_category_animes')
      .select('id, anime_id, category_id, animes (id, title, image_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('カテゴリ内アニメ取得エラー:', error);
      return;
    }
    const normalized = (data || []).map((item) => {
      const animeValue = Array.isArray(item.animes) ? item.animes[0] ?? null : item.animes ?? null;
      return { ...item, animes: animeValue };
    });
    setCategoryItems(normalized);
  };

  const handleCreateCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    const { error } = await supabase
      .from('user_categories')
      .insert({ user_id: user.id, name: newCategoryName.trim() });
    if (error) {
      console.error('カテゴリ作成エラー:', error);
      return;
    }
    setNewCategoryName('');
    await fetchCategories();
  };

  const handleAddToCategory = async () => {
    if (!user || !categoryTargetId || !categoryAnimeId) return;
    const { error } = await supabase
      .from('user_category_animes')
      .insert({
        user_id: user.id,
        category_id: categoryTargetId,
        anime_id: categoryAnimeId,
      });
    if (error) {
      console.error('カテゴリ追加エラー:', error);
      return;
    }
    setCategoryAnimeId('');
    await fetchCategoryItems();
  };

  const fetchLikesReceived = async () => {
    if (!user) return;
    try {
      const { count, error } = await supabase
        .from('likes')
        .select('id, reviews!inner(user_id)', { count: 'exact', head: true })
        .eq('reviews.user_id', user.id);
      if (error) throw error;
      setLikesReceived(count || 0);
    } catch (error) {
      console.error('いいね獲得数取得エラー:', error);
    }
  };

  const badges = useMemo<Badge[]>(() => {
    const results: Badge[] = [];
    const reviewCount = stats?.reviews_count ?? 0;
    const likeCount = likesReceived;

    const reviewTiers = [
      { min: 10, label: 'レビュー 10', tone: 'bg-blue-100 text-blue-700' },
      { min: 50, label: 'レビュー 50', tone: 'bg-purple-100 text-purple-700' },
      { min: 100, label: 'レビュー 100', tone: 'bg-sky-100 text-sky-700' },
      { min: 1000, label: 'レビュー 1000', tone: 'bg-yellow-100 text-yellow-700' },
    ];
    const likeTiers = [
      { min: 10, label: 'いいね 10', tone: 'bg-green-100 text-green-700' },
      { min: 50, label: 'いいね 50', tone: 'bg-emerald-100 text-emerald-700' },
      { min: 100, label: 'いいね 100', tone: 'bg-orange-100 text-orange-700' },
      { min: 1000, label: 'いいね 1000', tone: 'bg-red-100 text-red-700' },
    ];

    reviewTiers.forEach((tier) => {
      if (reviewCount >= tier.min) {
        results.push({ key: `review-${tier.min}`, label: tier.label, tone: tier.tone });
      }
    });

    likeTiers.forEach((tier) => {
      if (likeCount >= tier.min) {
        results.push({ key: `like-${tier.min}`, label: tier.label, tone: tier.tone });
      }
    });

    return results;
  }, [stats?.reviews_count, likesReceived]);

  const watchlistGroups = useMemo(() => {
    const groups: Record<'plan' | 'watching' | 'completed' | 'paused', WatchlistItem[]> = {
      plan: [],
      watching: [],
      completed: [],
      paused: [],
    };
    watchlist.forEach((item) => {
      groups[item.status].push(item);
    });
    return groups;
  }, [watchlist]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
    if (reviewPage > totalPages) {
      setReviewPage(totalPages);
    }
  }, [reviews.length, reviewPage]);

  const totalReviewPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const visibleReviews = reviews.slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE);

  const updateAvatarPositionFromClientPoint = (clientX: number, clientY: number) => {
    const target = avatarPickerRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
    setAvatarPositionPicker({ x, y });
  };

  const startAvatarAdjust = (clientX: number, clientY: number) => {
    avatarAdjustingRef.current = true;
    updateAvatarPositionFromClientPoint(clientX, clientY);
  };

  const moveAvatarAdjust = (clientX: number, clientY: number) => {
    if (!avatarAdjustingRef.current) return;
    updateAvatarPositionFromClientPoint(clientX, clientY);
  };

  const stopAvatarAdjust = () => {
    avatarAdjustingRef.current = false;
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
          display_name: maskNgWords(formState.display_name.trim()),
          bio: maskNgWords(formState.bio.trim()),
          avatar_url: formState.avatar_url.trim(),
          avatar_position: `${avatarPositionPicker.x}% ${avatarPositionPicker.y}%`,
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
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
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white text-5xl font-bold overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                  style={{ objectPosition: profile.avatar_position || 'center' }}
                />
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
                <p className="text-gray-600">@{profile.display_name || profile.username}</p>
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

            {badges.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {badges.map((badge) => (
                  <span key={badge.key} className={`badge ${badge.tone}`}>
                    {badge.label}
                  </span>
                ))}
              </div>
            )}

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

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900">プロフィール画像</label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
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
            {formState.avatar_url && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">丸の中をドラッグして位置を調整できます</p>
                <div
                  id="avatar-position-picker"
                  ref={avatarPickerRef}
                  className="relative w-32 h-32 rounded-full overflow-hidden border border-sky-200 touch-none select-none cursor-move"
                  onPointerDown={(event) => {
                    startAvatarAdjust(event.clientX, event.clientY);
                    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    moveAvatarAdjust(event.clientX, event.clientY);
                  }}
                  onPointerUp={stopAvatarAdjust}
                  onPointerCancel={stopAvatarAdjust}
                  onPointerLeave={stopAvatarAdjust}
                >
                  <img
                    src={formState.avatar_url}
                    alt="avatar preview"
                    className="pointer-events-none absolute left-1/2 top-1/2 max-w-none max-h-none"
                    style={{
                      width: '130%',
                      height: '130%',
                      objectFit: 'cover',
                      transform: `translate(-${avatarPositionPicker.x}%, -${avatarPositionPicker.y}%)`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="card p-5 bg-sky-50/60 space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-sky-500" />
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

      <div className="card p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-sky-600" />
          <h2 className="text-2xl font-bold text-gray-900">カスタムカテゴリ</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">カテゴリを追加</label>
            <div className="flex gap-2">
              <input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="input-field"
                placeholder="例: 泣ける / 神作 / 作業用"
              />
              <button type="button" onClick={handleCreateCategory} className="btn-secondary">
                追加
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">アニメをカテゴリに追加</label>
            <div className="grid sm:grid-cols-2 gap-2">
              <select
                value={categoryTargetId}
                onChange={(e) => setCategoryTargetId(Number(e.target.value))}
                className="input-field"
              >
                <option value="">カテゴリを選択</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <select
                value={categoryAnimeId}
                onChange={(e) => setCategoryAnimeId(Number(e.target.value))}
                className="input-field"
              >
                <option value="">アニメを選択</option>
                {animes.map((anime) => (
                  <option key={anime.id} value={anime.id}>
                    {anime.title}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={handleAddToCategory} className="btn-primary">
              追加する
            </button>
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 max-h-[520px] overflow-y-auto pr-1">
            {categories.map((category) => {
              const items = categoryItems.filter((item) => item.category_id === category.id);
              return (
                <div key={category.id} className="card p-5 space-y-3 bg-sky-50/50">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{category.name}</p>
                    <span className="text-xs text-gray-500">{items.length}件</span>
                  </div>
                  {items.length > 0 ? (
                    <div className="space-y-2">
                      {items.slice(0, 6).map((item) => (
                        <Link key={item.id} href={`/animes/${item.anime_id}`} className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white overflow-hidden flex-shrink-0">
                            {item.animes?.image_url ? (
                              <img
                                src={item.animes.image_url}
                                alt={item.animes.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                —
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-1 hover:text-sky-700 transition-colors">
                            {item.animes?.title || 'タイトル未設定'}
                          </p>
                        </Link>
                      ))}
                      {items.length > 6 && (
                        <p className="text-xs text-gray-400">他 {items.length - 6} 件</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">まだ追加されていません</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">カテゴリがまだありません</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">視聴リスト</h2>
          <span className="text-sm text-gray-500">
            {watchlist.length}件
          </span>
        </div>
        {watchlist.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6 max-h-[520px] overflow-y-auto pr-1">
            {(['watching', 'plan', 'completed', 'paused'] as const).map((status) => {
              const label =
                status === 'watching'
                  ? '見てる'
                  : status === 'plan'
                    ? '見たい'
                    : status === 'completed'
                      ? '見た'
                      : '中断';
              const items = watchlistGroups[status];
              if (items.length === 0) return null;
              return (
                <div key={status} className="card p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <span className="text-xs text-gray-500">{items.length}件</span>
                  </div>
                  <div className="space-y-2">
                    {items.slice(0, 6).map((item) => (
                      <Link key={item.anime_id} href={`/animes/${item.anime_id}`} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                          {item.animes?.image_url ? (
                            <img
                              src={item.animes.image_url}
                              alt={item.animes.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                              —
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-1 hover:text-sky-700 transition-colors">
                          {item.animes?.title || 'タイトル未設定'}
                        </p>
                      </Link>
                    ))}
                    {items.length > 6 && (
                      <p className="text-xs text-gray-400">他 {items.length - 6} 件</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-600">
            まだ視聴リストがありません
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <MessageCircle className="w-6 h-6 mr-2 text-sky-600" />
            最近の感想
          </h2>
        </div>

        {reviews.length > 0 ? (
          <div className="space-y-5">
            <div className="grid md:grid-cols-2 gap-6 max-h-[560px] overflow-y-auto pr-1">
              {visibleReviews.map((review: any) => (
                <div key={review.id} className="card p-6">
                  {review.animes && (
                    <Link
                      href={`/animes/${review.animes.id}`}
                      className="text-sm text-sky-600 font-medium mb-2 inline-block hover:text-sky-700"
                    >
                      {review.animes.title}
                    </Link>
                  )}

                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {review.title}
                  </h3>

                  <Link href={`/reviews/${review.id}`} className="text-gray-700 line-clamp-3 hover:text-sky-700 transition-colors block">
                    {review.content}
                  </Link>

                  <p className="text-sm text-gray-500 mt-3">
                    {new Date(review.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              ))}
            </div>
            {totalReviewPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewPage((page) => Math.max(1, page - 1))}
                  disabled={reviewPage === 1}
                  className="px-3 py-2 rounded-lg border border-sky-200 text-sm text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                {Array.from({ length: totalReviewPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setReviewPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      page === reviewPage
                        ? 'bg-sky-600 text-white'
                        : 'border border-sky-200 text-sky-700 hover:bg-sky-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setReviewPage((page) => Math.min(totalReviewPages, page + 1))}
                  disabled={reviewPage === totalReviewPages}
                  className="px-3 py-2 rounded-lg border border-sky-200 text-sm text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            )}
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
            <Heart className="w-6 h-6 mr-2 text-sky-600" />
            お気に入りアニメ
          </h2>
        </div>

        {favorites.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {favorites.map((favorite) => (
              <Link key={favorite.anime_id} href={`/animes/${favorite.anime_id}`} className="card overflow-hidden block">
                <div className="aspect-[3/4] bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100">
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
                <div className="p-3">
                  <p className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2">
                    {favorite.animes?.title || '未設定'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-600">お気に入りが未登録です</div>
        )}
      </div>
    </div>
  );
}
