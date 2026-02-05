'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Anime } from '@/types/database';
import { useAuth } from '@/lib/AuthProvider';

export default function AnimesPage() {
  const { user } = useAuth();
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [filteredAnimes, setFilteredAnimes] = useState<Anime[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

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
  }, [searchQuery, animes]);

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
        .select('last_sync_at')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      setLastSyncAt(data?.last_sync_at ?? null);
    } catch (error) {
      console.error('同期情報取得エラー:', error);
    }
  };

  const canSync = () => {
    if (!lastSyncAt) return true;
    const last = new Date(lastSyncAt).getTime();
    const now = Date.now();
    return now - last >= 24 * 60 * 60 * 1000;
  };

  const syncFromApi = async () => {
    if (!user || !isAdmin) return;
    if (!canSync()) {
      setSyncMessage('更新は1日1回までです。時間をおいて再度お試しください。');
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

      const response = await fetch('https://api.jikan.moe/v4/seasons/now?limit=25');
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

      setSyncMessage(`${newItems.length}件の作品を追加しました。`);
      await fetchAnimes();
      await fetchLastSync();
    } catch (error) {
      console.error('API同期エラー:', error);
      setSyncMessage('API同期に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSyncLoading(false);
    }
  };

  const filterAnimes = () => {
    if (!searchQuery.trim()) {
      setFilteredAnimes(animes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const isHashtag = query.startsWith('#');
    
    const filtered = animes.filter((anime) => {
      if (isHashtag) {
        const tag = query.slice(1);
        return (
          anime.title.toLowerCase().includes(tag) ||
          anime.title_en?.toLowerCase().includes(tag) ||
          anime.genre?.some((g) => g.toLowerCase().includes(tag))
        );
      }
      return (
        anime.title.toLowerCase().includes(query) ||
        anime.title_en?.toLowerCase().includes(query)
      );
    });

    setFilteredAnimes(filtered);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
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
            <button
              type="button"
              onClick={syncFromApi}
              className="btn-secondary inline-flex items-center justify-center"
              disabled={syncLoading}
            >
              {syncLoading ? 'API同期中...' : 'APIから更新'}
            </button>
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
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="mt-3 flex items-start gap-2 text-sm text-gray-600">
          <Hash className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            <strong>検索のコツ:</strong> 「進撃」でタイトル検索、「#進撃」でハッシュタグ検索（作品名/ジャンル）
          </p>
        </div>
      </div>

      {filteredAnimes.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAnimes.map((anime) => (
            <Link key={anime.id} href={`/animes/${anime.id}`}>
              <div className="card overflow-hidden group cursor-pointer hover:scale-105 transition-transform">
                <div className="aspect-[3/4] bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 relative overflow-hidden">
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

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 line-clamp-2 mb-1 group-hover:text-pink-600 transition-colors">
                    {anime.title}
                  </h3>
                  
                  {anime.title_en && (
                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                      {anime.title_en}
                    </p>
                  )}

                  {anime.genre && anime.genre.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {anime.genre.slice(0, 3).map((g, index) => (
                        <span key={index} className="text-xs px-2 py-1 rounded-full bg-pink-100 text-pink-700">
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
