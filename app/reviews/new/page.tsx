'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Star, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { maskNgWords } from '@/lib/ngWordFilter';
import { useAuth } from '@/lib/AuthProvider';
interface AnimeOption {
  id: number;
  title: string;
}

function ReviewNewContent() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [animes, setAnimes] = useState<AnimeOption[]>([]);
  const [animeId, setAnimeId] = useState<number | ''>('');
  const [animeSearch, setAnimeSearch] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [hasSpoiler, setHasSpoiler] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const canSubmit = useMemo(() => {
    return Boolean(animeId) && title.trim().length > 0 && content.trim().length > 0;
  }, [animeId, title, content]);

  const filteredAnimes = useMemo(() => {
    if (!animeSearch.trim()) return animes;
    const query = animeSearch.trim().toLowerCase();
    return animes.filter((anime) => anime.title.toLowerCase().includes(query));
  }, [animes, animeSearch]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchAnimes();
    }
  }, [user, authLoading]);

  useEffect(() => {
    const queryAnimeId = searchParams.get('animeId');
    if (queryAnimeId) {
      const parsed = Number(queryAnimeId);
      if (Number.isFinite(parsed)) {
        setAnimeId(parsed);
      }
    }
  }, [searchParams]);

  const fetchAnimes = async () => {
    try {
      const { data, error } = await supabase
        .from('animes')
        .select('id, title')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnimes(data || []);
    } catch (error) {
      console.error('アニメ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !animeId || !canSubmit) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          anime_id: animeId,
          title: maskNgWords(title.trim()),
          content: maskNgWords(content.trim()),
          has_spoiler: hasSpoiler,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (rating) {
        const normalized = Math.min(5, Math.max(1, Math.round(rating)));
        const { error: ratingError } = await supabase
          .from('anime_ratings')
          .upsert(
            {
              user_id: user.id,
              anime_id: animeId,
              rating: normalized,
            },
            { onConflict: 'user_id,anime_id' }
          );

        if (ratingError) throw ratingError;
      }

      router.push(`/reviews/${data.id}`);
      router.refresh();
    } catch (error) {
      console.error('感想投稿エラー:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/reviews" className="p-2 rounded-full bg-white shadow hover:shadow-md">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">感想を書く</h1>
          <p className="text-gray-600">好きなアニメの感想をシェアしましょう</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
        <div>
          <label className="text-sm font-semibold text-gray-900">アニメを選択</label>
          <div className="mt-2">
            <input
              value={animeSearch}
              onChange={(e) => setAnimeSearch(e.target.value)}
              className="input-field"
              placeholder="タイトルで検索"
            />
          </div>
          <select
            value={animeId}
            onChange={(e) => setAnimeId(e.target.value ? Number(e.target.value) : '')}
            className="input-field mt-2"
          >
            <option value="">作品を選択してください</option>
            {filteredAnimes.map((anime) => (
              <option key={anime.id} value={anime.id}>
                {anime.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-900">タイトル</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field mt-2"
            placeholder="感想のタイトル"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-900">本文</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field mt-2 min-h-[180px]"
            placeholder="感想を書いてください"
          />
        </div>

        <div className="card p-4 bg-pink-50/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">評価 (任意)</p>
              <p className="text-xs text-gray-500">1〜5で評価を付けられます（何度でも変更OK）</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border touch-manipulation ${
                    rating && value <= rating
                      ? 'bg-pink-500 border-pink-500 text-white'
                      : 'bg-white border-gray-200 text-gray-400 hover:text-pink-500'
                  }`}
                  title={`${value}点`}
                >
                  <Star className="w-5 h-5" fill={rating && value <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={hasSpoiler}
            onChange={(e) => setHasSpoiler(e.target.checked)}
            className="w-4 h-4 text-pink-500 focus:ring-pink-400 border-gray-300 rounded"
          />
          ネタバレを含みます
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={!canSubmit || submitting}
          >
            投稿する
          </button>
          <Link href="/reviews" className="btn-secondary text-center">
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function ReviewNewPage() {
  return (
    <Suspense
      fallback={(
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      )}
    >
      <ReviewNewContent />
    </Suspense>
  );
}
