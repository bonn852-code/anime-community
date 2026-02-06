'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Hash, Star, MessageCircle, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';
import type { Anime } from '@/types/database';

interface ReviewWithUser {
  id: number;
  title: string;
  content: string;
  has_spoiler: boolean;
  created_at: string;
  users: {
    username: string;
    display_name: string | null;
  } | null;
}

interface AnimeStats {
  average_rating: number | null;
  reviews_count: number | null;
}

export default function AnimeDetailPage() {
  const params = useParams();
  const animeId = Number(params.id);
  const { user } = useAuth();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [stats, setStats] = useState<AnimeStats | null>(null);
  const [reviews, setReviews] = useState<ReviewWithUser[]>([]);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [watchStatus, setWatchStatus] = useState<'plan' | 'watching' | 'completed' | 'paused' | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [watchSubmitting, setWatchSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastTouchAtRef = useRef(0);

  const hashtag = useMemo(() => (anime ? `#${anime.title}` : '#アニメ'), [anime]);
  const displayRating = userRating ? Math.round(userRating) : null;

  useEffect(() => {
    if (!Number.isFinite(animeId)) return;
    fetchAnimeDetail();
  }, [animeId]);

  useEffect(() => {
    if (user && Number.isFinite(animeId)) {
      fetchUserRating();
      fetchWatchStatus();
    } else {
      setUserRating(null);
      setWatchStatus(null);
    }
  }, [user, animeId]);

  const fetchAnimeDetail = async () => {
    try {
      const { data: animeData, error: animeError } = await supabase
        .from('animes')
        .select('*')
        .eq('id', animeId)
        .single();

      if (animeError) throw animeError;
      setAnime(animeData);

      const { data: statsData } = await supabase
        .from('anime_stats')
        .select('average_rating, reviews_count')
        .eq('anime_id', animeId)
        .single();

      setStats(statsData || null);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          id,
          title,
          content,
          has_spoiler,
          created_at,
          users (username, display_name)
        `)
        .eq('anime_id', animeId)
        .order('created_at', { ascending: false })
        .limit(12);

      const normalized = (reviewsData || []).map((review) => {
        const userValue = Array.isArray(review.users) ? review.users[0] ?? null : review.users ?? null;
        return { ...review, users: userValue };
      });
      setReviews(normalized);
    } catch (error) {
      console.error('アニメ詳細取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRating = async () => {
    try {
      const { data } = await supabase
        .from('anime_ratings')
        .select('rating')
        .eq('anime_id', animeId)
        .eq('user_id', user!.id)
        .maybeSingle();

      const raw = data?.rating ?? null;
      setUserRating(raw ? Math.round(raw) : null);
    } catch (error) {
      console.error('評価取得エラー:', error);
    }
  };

  const fetchWatchStatus = async () => {
    try {
      const { data } = await supabase
        .from('watchlists')
        .select('status')
        .eq('anime_id', animeId)
        .eq('user_id', user!.id)
        .maybeSingle();
      setWatchStatus((data?.status as typeof watchStatus) ?? null);
    } catch (error) {
      console.error('視聴リスト取得エラー:', error);
    }
  };

  const handleRating = async (rating: number) => {
    if (!user) return;
    const normalized = Math.min(5, Math.max(1, Math.round(rating)));
    setRatingSubmitting(true);
    try {
      setUserRating(normalized);
      const { error } = await supabase
        .from('anime_ratings')
        .upsert(
          {
            user_id: user.id,
            anime_id: animeId,
            rating: normalized,
          },
          { onConflict: 'user_id,anime_id' }
        );

      if (error) throw error;
      await fetchAnimeDetail();
    } catch (error) {
      console.error('評価保存エラー:', error);
      await fetchUserRating();
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleWatchStatusChange = async (value: string) => {
    if (!user) return;
    const nextStatus = value as typeof watchStatus;
    setWatchSubmitting(true);
    try {
      if (!nextStatus) {
        await supabase
          .from('watchlists')
          .delete()
          .eq('anime_id', animeId)
          .eq('user_id', user.id);
        setWatchStatus(null);
        return;
      }
      const { error } = await supabase
        .from('watchlists')
        .upsert(
          {
            user_id: user.id,
            anime_id: animeId,
            status: nextStatus,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,anime_id' }
        );
      if (error) throw error;
      setWatchStatus(nextStatus);
    } catch (error) {
      console.error('視聴リスト更新エラー:', error);
    } finally {
      setWatchSubmitting(false);
    }
  };

  const handleRatingTap = (value: number, fromTouch = false) => {
    if (ratingSubmitting || !user) return;
    if (fromTouch) {
      lastTouchAtRef.current = Date.now();
    } else if (Date.now() - lastTouchAtRef.current < 500) {
      return;
    }
    handleRating(value);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-600">アニメが見つかりませんでした</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="card p-6 md:p-8">
        <div className="grid md:grid-cols-[240px_1fr] gap-6">
          <div className="rounded-2xl overflow-hidden shadow-md bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200">
            {anime.image_url ? (
              <img
                src={anime.image_url}
                alt={anime.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="aspect-[3/4] flex items-center justify-center text-white text-5xl font-bold">
                {anime.title.charAt(0)}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {anime.title}
              </h1>
              {anime.title_en && (
                <p className="text-gray-500">{anime.title_en}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {anime.genre?.map((g, index) => (
                <span key={index} className="text-xs px-3 py-1 rounded-full bg-pink-100 text-pink-700">
                  {g}
                </span>
              ))}
              {anime.season && anime.year && (
                <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                  {anime.year} {anime.season}
                </span>
              )}
            </div>

            {anime.description && (
              <p className="text-gray-700 leading-relaxed">{anime.description}</p>
            )}

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">平均評価</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.average_rating ? stats.average_rating.toFixed(1) : 'ー'}
                </p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">感想数</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.reviews_count ?? reviews.length}
                </p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">ハッシュタグ</p>
                <p className="text-lg font-semibold text-pink-600">{hashtag}</p>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">あなたの評価</p>
                  <p className="text-xs text-gray-500">1〜5で評価できます（何度でも変更OK）</p>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleRatingTap(value)}
                      onTouchStart={() => handleRatingTap(value, true)}
                      onPointerDown={(event) => {
                        if (event.pointerType === 'touch') {
                          handleRatingTap(value, true);
                        }
                      }}
                      disabled={!user || ratingSubmitting}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border touch-manipulation ${
                        displayRating && value <= displayRating
                          ? 'bg-pink-500 border-pink-500 text-white'
                          : 'bg-white border-gray-200 text-gray-400 hover:text-pink-500'
                      }`}
                      title={`${value}点`}
                    >
                      <Star className="w-5 h-5" fill={displayRating && value <= displayRating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              {!user && (
                <p className="text-xs text-gray-500 mt-3">
                  評価するにはログインが必要です。
                </p>
              )}
            </div>

            <div className="card p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">視聴ステータス</p>
                  <p className="text-xs text-gray-500">見たい/見てる/見た/中断 を管理</p>
                </div>
                <select
                  value={watchStatus ?? ''}
                  onChange={(e) => handleWatchStatusChange(e.target.value)}
                  disabled={!user || watchSubmitting}
                  className="input-field sm:w-48"
                >
                  <option value="">未設定</option>
                  <option value="plan">見たい</option>
                  <option value="watching">見てる</option>
                  <option value="completed">見た</option>
                  <option value="paused">中断</option>
                </select>
              </div>
              {!user && (
                <p className="text-xs text-gray-500 mt-3">
                  ステータス管理にはログインが必要です。
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={`/reviews/new?animeId=${anime.id}`}
                className="btn-primary inline-flex items-center justify-center"
              >
                感想を書く
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href={`/reviews?animeId=${anime.id}`}
                className="btn-secondary inline-flex items-center justify-center"
              >
                みんなの感想へ
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <MessageCircle className="w-6 h-6 mr-2 text-pink-600" />
              みんなの感想
            </h2>
            <div className="flex justify-end">
              <Link href="/reviews" className="text-sm font-semibold text-pink-600 hover:text-pink-700">
                もっと見る
              </Link>
            </div>
          </div>

          {reviews.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-5">
              {reviews.map((review) => (
                <Link key={review.id} href={`/reviews/${review.id}`}>
                  <div className="card p-5 h-full hover:shadow-2xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-500">
                        {review.users?.display_name || review.users?.username}
                      </p>
                      {review.has_spoiler && (
                        <span className="badge bg-yellow-100 text-yellow-700">ネタバレ</span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {review.title}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {review.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-3">
                      {new Date(review.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-10 text-center">
              <p className="text-gray-600">まだ感想がありません</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-3">
              <Hash className="w-5 h-5 text-pink-500 mt-1" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">この作品のハッシュタグ</p>
                <p className="text-xs text-gray-500">感想投稿時に使うと探しやすくなります。</p>
                <div className="mt-3">
                  <input
                    value={hashtag}
                    readOnly
                    className="input-field text-pink-600 font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <p className="text-sm font-semibold text-gray-900 mb-2">話題を始めよう</p>
            <p className="text-sm text-gray-600 mb-4">
              「{anime.title}」の感想や評価を投稿して、みんなと交流しよう。
            </p>
            <Link
              href={`/reviews/new?animeId=${anime.id}`}
              className="btn-primary inline-flex items-center justify-center w-full"
            >
              感想を投稿
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
