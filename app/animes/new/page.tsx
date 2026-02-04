'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, UploadCloud } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

export default function AnimeNewPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [season, setSeason] = useState('');
  const [year, setYear] = useState('');
  const [genre, setGenre] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const canSubmit = useMemo(() => title.trim().length > 0, [title]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setErrorMessage('ログインが必要です。');
      return;
    }
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const normalizedTitle = title.trim();
      const normalizedTitleEn = titleEn.trim();

      const { data: existing } = await supabase
        .from('animes')
        .select('id, title')
        .or(
          `title.ilike.${normalizedTitle},title_en.ilike.${normalizedTitle}` +
            (normalizedTitleEn ? `,title.ilike.${normalizedTitleEn},title_en.ilike.${normalizedTitleEn}` : '')
        )
        .limit(1);

      if (existing && existing.length > 0) {
        setErrorMessage('同じタイトルのアニメが既に登録されています。');
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase
        .from('animes')
        .insert({
          title: normalizedTitle,
          title_en: normalizedTitleEn || null,
          season: season.trim() || null,
          year: year ? Number(year) : null,
          genre: genre
            ? genre
                .split(',')
                .map((g) => g.trim())
                .filter(Boolean)
            : null,
          image_url: imageUrl.trim() || null,
          description: description.trim() || null,
        })
        .select('id')
        .single();

      if (error) {
        if ((error as { code?: string }).code === '23505') {
          setErrorMessage('同じタイトルのアニメが既に登録されています。');
          return;
        }
        throw error;
      }

      if (!data?.id) {
        throw new Error('アニメの作成に失敗しました。');
      }

      router.push(`/animes/${data.id}`);
      router.refresh();
    } catch (error) {
      const messageParts = [
        (error as { message?: string })?.message,
        (error as { details?: string })?.details,
        (error as { hint?: string })?.hint,
        (error as { code?: string })?.code,
      ].filter(Boolean);
      const message =
        messageParts.length > 0
          ? messageParts.join(' / ')
          : typeof error === 'string'
            ? error
            : JSON.stringify(error);
      console.error('アニメ追加エラー:', message, error);
      setErrorMessage(`登録中にエラーが発生しました: ${message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!user) return;
    setImageUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/anime-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('anime-images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('anime-images').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } catch (error) {
      console.error('画像アップロードエラー:', error);
      setErrorMessage('画像のアップロードに失敗しました。');
    } finally {
      setImageUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/animes" className="p-2 rounded-full bg-white shadow hover:shadow-md">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">アニメを追加</h1>
          <p className="text-gray-600">みんなで作品を増やして感想をシェアしよう</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
        {errorMessage && (
          <div className="card p-4 bg-red-50 text-red-600 border border-red-100">
            {errorMessage}
          </div>
        )}

        <div>
          <label className="text-sm font-semibold text-gray-900">タイトル (必須)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field mt-2"
            placeholder="例: 素晴らしいアニメ作品"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-900">英語タイトル</label>
          <input
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="input-field mt-2"
            placeholder="例: Amazing Anime"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold text-gray-900">シーズン</label>
            <input
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="input-field mt-2"
              placeholder="2024-winter など"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-900">年</label>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, ''))}
              className="input-field mt-2"
              placeholder="2024"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-900">ジャンル (カンマ区切り)</label>
          <input
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="input-field mt-2"
            placeholder="アクション, ファンタジー"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-900">画像URL</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
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
                    handleImageUpload(file);
                  }
                }}
                className="text-sm text-gray-600"
              />
              {imageUploading && (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4" />
                  アップロード中...
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-900">概要</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field mt-2 min-h-[140px]"
            placeholder="作品の紹介文"
          />
        </div>

        <button type="submit" className="btn-primary inline-flex items-center" disabled={!canSubmit || submitting}>
          <Plus className="w-4 h-4 mr-2" />
          追加する
        </button>
      </form>
    </div>
  );
}
