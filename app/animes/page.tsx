'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Anime } from '@/types/database';
import { useAuth } from '@/lib/AuthProvider';

export default function AnimesPage() {
  const ITEMS_PER_PAGE = 16;
  const { user } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [filteredAnimes, setFilteredAnimes] = useState<Anime[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSeasonSyncAt, setLastSeasonSyncAt] = useState<string | null>(null);
  const [lastTopSyncAt, setLastTopSyncAt] = useState<string | null>(null);
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [seasonKey, setSeasonKey] = useState<'winter' | 'spring' | 'summer' | 'fall'>(() => {
    const month = new Date().getMonth() + 1;
    if (month >= 1 && month <= 3) return 'winter';
    if (month >= 4 && month <= 6) return 'spring';
    if (month >= 7 && month <= 9) return 'summer';
    return 'fall';
  });
  const [topPages, setTopPages] = useState(1);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() || '';
  const isAdmin = Boolean(user?.email && user.email.toLowerCase() === adminEmail);

  useEffect(() => {
    fetchAnimes();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchLastSync();
    }
  }, [isAdmin]);

  useEffect(() => {
    filterAnimes();
  }, [searchQuery, animes, genreFilter, seasonFilter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAnimes.length / ITEMS_PER_PAGE));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredAnimes.length, currentPage]);

  const fetchAnimes = async () => {
    try {
      const { data, error } = await supabase
        .from('animes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnimes(data || []);
      setFilteredAnimes(data || []);
    } catch (error) {
      console.error('アニメ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLastSync = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('id, last_sync_at')
        .in('id', [1, 2]);
      if (error) throw error;
      const seasonRow = (data || []).find((row) => row.id === 1);
      const topRow = (data || []).find((row) => row.id === 2);
      setLastSeasonSyncAt(seasonRow?.last_sync_at ?? null);
      setLastTopSyncAt(topRow?.last_sync_at ?? null);
    } catch (error) {
      console.error('同期情報取得エラー:', error);
    }
  };

  const canSync = (lastSyncAt: string | null) => {
    if (!lastSyncAt) return true;
    const last = new Date(lastSyncAt).getTime();
    const now = Date.now();
    return now - last >= 24 * 60 * 60 * 1000;
  };

  const syncFromApi = async () => {
    if (!user || !isAdmin) return;
    if (!canSync(lastSeasonSyncAt)) {
      setSyncMessage('季節同期は1日1回までです。時間をおいて再度お試しください。');
      return;
    }
    setSyncLoading(true);
    setSyncMessage('');
    try {
      const { data: existing, error: existingError } = await supabase
        .from('animes')
        .select('title');

      if (existingError) throw existingError;
      const existingTitles = new Set((existing || []).map((item) => item.title.toLowerCase()));

      const response = await fetch(
        `https://api.jikan.moe/v4/seasons/${seasonYear}/${seasonKey}?limit=25`
      );
      if (!response.ok) throw new Error('API取得に失敗しました');
      const payload = await response.json();

      const items = (payload?.data || []).map((item: any) => {
        const title = item.title_japanese || item.title || '';
        const titleEn = item.title_english || item.title || '';
        const year = item.year || null;
        const season = item.season ? `${item.year || ''}-${item.season}` : null;
        const genres = Array.isArray(item.genres) ? item.genres.map((g: any) => g.name) : null;
        return {
          title,
          title_en: titleEn || null,
          season: season || null,
          year,
          genre: genres,
          image_url: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null,
          description: item.synopsis || null,
        };
      });

      const newItems = items.filter((item: any) => item.title && !existingTitles.has(item.title.toLowerCase()));

      if (newItems.length === 0) {
        setSyncMessage('追加できる新しい作品はありませんでした。');
        return;
      }

      const { error: insertError } = await supabase.from('animes').insert(newItems);
      if (insertError) throw insertError;

      await supabase
        .from('admin_settings')
        .upsert({ id: 1, last_sync_at: new Date().toISOString() });

      setSyncMessage(`季節同期: ${newItems.length}件の作品を追加しました。`);
      await fetchAnimes();
      await fetchLastSync();
    } catch (error) {
      console.error('API同期エラー:', error);
      setSyncMessage('季節同期に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSyncLoading(false);
    }
  };

  const syncTopFromApi = async () => {
    if (!user || !isAdmin) return;
    if (!canSync(lastTopSyncAt)) {
      setSyncMessage('人気同期は1日1回までです。時間をおいて再度お試しください。');
      return;
    }
    setSyncLoading(true);
    setSyncMessage('');
    try {
      const { data: existing, error: existingError } = await supabase
        .from('animes')
        .select('title');

      if (existingError) throw existingError;
      const existingTitles = new Set((existing || []).map((item) => item.title.toLowerCase()));

      const pages = Math.min(3, Math.max(1, topPages));
      const allItems: any[] = [];
      for (let page = 1; page <= pages; page += 1) {
        const response = await fetch(`https://api.jikan.moe/v4/top/anime?page=${page}&limit=25`);
        if (!response.ok) throw new Error('API取得に失敗しました');
        const payload = await response.json();
        const items = (payload?.data || []).map((item: any) => {
          const title = item.title_japanese || item.title || '';
          const titleEn = item.title_english || item.title || '';
          const year = item.year || null;
          const season = item.season ? `${item.year || ''}-${item.season}` : null;
          const genres = Array.isArray(item.genres) ? item.genres.map((g: any) => g.name) : null;
          return {
            title,
            title_en: titleEn || null,
            season: season || null,
            year,
            genre: genres,
            image_url: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || null,
            description: item.synopsis || null,
          };
        });
        allItems.push(...items);
      }

      const newItems = allItems.filter((item: any) => item.title && !existingTitles.has(item.title.toLowerCase()));

      if (newItems.length === 0) {
        setSyncMessage('人気同期: 追加できる新しい作品はありませんでした。');
        return;
      }

      const { error: insertError } = await supabase.from('animes').insert(newItems);
      if (insertError) throw insertError;

      await supabase
        .from('admin_settings')
        .upsert({ id: 2, last_sync_at: new Date().toISOString() });

      setSyncMessage(`人気同期: ${newItems.length}件の作品を追加しました。`);
      await fetchAnimes();
      await fetchLastSync();
    } catch (error) {
      console.error('API同期エラー:', error);
      setSyncMessage('人気同期に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSyncLoading(false);
    }
  };

  const filterAnimes = () => {
    if (!searchQuery.trim()) {
      const filtered = animes.filter((anime) => {
        const byGenre = genreFilter ? anime.genre?.includes(genreFilter) : true;
        const bySeason = seasonFilter ? anime.season === seasonFilter : true;
        return byGenre && bySeason;
      });
      setFilteredAnimes(filtered);
      return;
    }

    const query = searchQuery.toLowerCase();
    const isHashtag = query.startsWith('#');
    
    const filtered = animes.filter((anime) => {
      const byGenre = genreFilter ? anime.genre?.includes(genreFilter) : true;
      const bySeason = seasonFilter ? anime.season === seasonFilter : true;
      if (isHashtag) {
        const tag = query.slice(1);
        return (
          (anime.title.toLowerCase().includes(tag) ||
            anime.title_en?.toLowerCase().includes(tag) ||
            anime.genre?.some((g) => g.toLowerCase().includes(tag))) &&
          byGenre &&
          bySeason
        );
      }
      return (
        (anime.title.toLowerCase().includes(query) ||
          anime.title_en?.toLowerCase().includes(query)) &&
        byGenre &&
        bySeason
      );
    });

    setFilteredAnimes(filtered);
  };

  const totalPages = Math.max(1, Math.ceil(filteredAnimes.length / ITEMS_PER_PAGE));
  const paginatedAnimes = filteredAnimes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            アニメ一覧
          </h1>
          <p className="text-gray-600">
            {filteredAnimes.length}作品が見つかりました
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1990}
                max={2100}
                value={seasonYear}
                onChange={(e) => setSeasonYear(Number(e.target.value))}
                className="input-field w-24"
              />
              <select
                value={seasonKey}
                onChange={(e) => setSeasonKey(e.target.value as typeof seasonKey)}
                className="input-field w-28"
              >
                <option value="winter">冬</option>
                <option value="spring">春</option>
                <option value="summer">夏</option>
                <option value="fall">秋</option>
              </select>
              <button
                type="button"
                onClick={syncFromApi}
                className="btn-secondary inline-flex items-center justify-center"
                disabled={syncLoading}
              >
                {syncLoading ? '同期中...' : '季節同期'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={topPages}
                onChange={(e) => setTopPages(Number(e.target.value))}
                className="input-field w-24"
              >
                <option value={1}>Top 25</option>
                <option value={2}>Top 50</option>
                <option value={3}>Top 75</option>
              </select>
              <button
                type="button"
                onClick={syncTopFromApi}
                className="btn-secondary inline-flex items-center justify-center"
                disabled={syncLoading}
              >
                {syncLoading ? '同期中...' : '人気同期'}
              </button>
            </div>
          </div>
        )}
      </div>
      {syncMessage && (
        <div className="card p-4 text-sm text-gray-700">{syncMessage}</div>
      )}

      <div className="card p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="タイトル検索 または #作品名/ジャンル..."
            value={searchQuery}
            onChange={(e) => {
              setCurrentPage(1);
              setSearchQuery(e.target.value);
            }}
            className="input-field pl-10"
          />
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <select
            value={genreFilter}
            onChange={(e) => {
              setCurrentPage(1);
              setGenreFilter(e.target.value);
            }}
            className="input-field"
          >
            <option value="">ジャンルで絞り込み</option>
            {Array.from(
              new Set(
                animes.flatMap((anime) => anime.genre || [])
              )
            ).map((genre) => (
              <option key={genre} value={genre}>
                {genre}
              </option>
            ))}
          </select>
          <select
            value={seasonFilter}
            onChange={(e) => {
              setCurrentPage(1);
              setSeasonFilter(e.target.value);
            }}
            className="input-field"
          >
            <option value="">シーズンで絞り込み</option>
            {Array.from(new Set(animes.map((anime) => anime.season).filter(Boolean) as string[])).map(
              (season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              )
            )}
          </select>
        </div>
        <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
          <Hash className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            <strong>検索のコツ:</strong> 「進撃」でタイトル検索、「#進撃」でハッシュタグ検索（作品名/ジャンル）
          </p>
        </div>
      </div>

      {filteredAnimes.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-6">
            {paginatedAnimes.map((anime) => (
              <Link key={anime.id} href={`/animes/${anime.id}`}>
                <div className="card overflow-hidden group cursor-pointer hover:scale-105 transition-transform">
                  <div className="aspect-[3/4] bg-gradient-to-br from-sky-100 via-blue-100 to-indigo-100 relative overflow-hidden">
                    {anime.image_url ? (
                      <img
                        src={anime.image_url}
                        alt={anime.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                        {anime.title.charAt(0)}
                      </div>
                    )}
                  </div>

                  <div className="p-2 md:p-4">
                    <h3 className="text-xs md:text-base font-bold text-gray-900 line-clamp-2 mb-1 group-hover:text-sky-600 transition-colors">
                      {anime.title}
                    </h3>

                    {anime.title_en && (
                      <p className="hidden md:block text-xs text-gray-500 line-clamp-1 mb-2">
                        {anime.title_en}
                      </p>
                    )}

                    {anime.genre && anime.genre.length > 0 && (
                      <div className="hidden md:flex flex-wrap gap-1">
                        {anime.genre.slice(0, 3).map((g, index) => (
                          <span key={index} className="text-xs px-2 py-1 rounded-full bg-sky-100 text-sky-700">
                            {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-sky-200 text-sm text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                前へ
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg text-sm ${
                    page === currentPage
                      ? 'bg-sky-600 text-white'
                      : 'border border-sky-200 text-sky-700 hover:bg-sky-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 rounded-lg border border-sky-200 text-sm text-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                次へ
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            「{searchQuery}」に一致するアニメが見つかりませんでした
          </p>
        </div>
      )}
    </div>
  );
}
