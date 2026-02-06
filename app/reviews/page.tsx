'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface ReviewWithDetails {
  id: number;
  title: string;
  content: string;
  has_spoiler: boolean;
  created_at: string;
  users: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  animes: {
    id: number;
    title: string;
  } | null;
}

function ReviewsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const animeId = searchParams.get('animeId');

  useEffect(() => {
    fetchReviews();
  }, [animeId]);

  const fetchReviews = async () => {
    try {
      let query = supabase
        .from('reviews')
        .select(`
          id,
          title,
          content,
          has_spoiler,
          created_at,
          users (username, display_name, avatar_url),
          animes (id, title)
        `)
        .order('created_at', { ascending: false });

      const parsedAnimeId = animeId ? Number(animeId) : null;
      if (parsedAnimeId && Number.isFinite(parsedAnimeId)) {
        query = query.eq('anime_id', parsedAnimeId);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      const normalized = (data || []).map((review) => {
        const userValue = Array.isArray(review.users) ? review.users[0] ?? null : review.users ?? null;
        const animeValue = Array.isArray(review.animes) ? review.animes[0] ?? null : review.animes ?? null;
        return { ...review, users: userValue, animes: animeValue };
      });
      setReviews(normalized);
    } catch (error) {
      console.error('感想取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            感想一覧
          </h1>
          <p className="text-gray-600">
            みんなの最新感想をチェック
          </p>
        </div>
        
        {user && (
          <Link href="/reviews/new" className="btn-primary flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            感想を書く
          </Link>
        )}
      </div>

      {reviews.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {reviews.map((review) => (
            <Link key={review.id} href={`/reviews/${review.id}`}>
              <div className="card p-6 hover:shadow-2xl transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                      {review.users?.avatar_url ? (
                        <img
                          src={review.users.avatar_url}
                          alt={review.users.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        review.users?.display_name?.charAt(0) || review.users?.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {review.users?.display_name || review.users?.username}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(review.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                  </div>
                  {review.has_spoiler && (
                    <span className="badge bg-yellow-100 text-yellow-700">
                      ネタバレ
                    </span>
                  )}
                </div>

                {review.animes && (
                  <p className="text-sm text-sky-600 font-medium mb-2">
                    {review.animes.title}
                  </p>
                )}

                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                  {review.title}
                </h3>

                <p className="text-gray-700 line-clamp-3">
                  {review.content}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-4">
            まだ感想が投稿されていません
          </p>
          {user && (
            <Link href="/reviews/new" className="btn-primary inline-flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              最初の感想を書く
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense
      fallback={(
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
        </div>
      )}
    >
      <ReviewsContent />
    </Suspense>
  );
}
