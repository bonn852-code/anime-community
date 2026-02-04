'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Heart, MessageCircle, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface ReviewDetail {
  id: number;
  title: string;
  content: string;
  has_spoiler: boolean;
  created_at: string;
  user_id: string;
  users: {
    username: string;
    display_name: string | null;
  } | null;
  animes: {
    id: number;
    title: string;
  } | null;
}

interface CommentWithUser {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  users: {
    username: string;
    display_name: string | null;
  } | null;
}

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reviewId = Number(params.id);
  const { user } = useAuth();

  const [review, setReview] = useState<ReviewDetail | null>(null);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isOwner = useMemo(() => user && review && user.id === review.user_id, [user, review]);

  useEffect(() => {
    if (!Number.isFinite(reviewId)) return;
    fetchReview();
  }, [reviewId]);

  useEffect(() => {
    if (user && Number.isFinite(reviewId)) {
      fetchLikeState();
    } else {
      setLiked(false);
    }
  }, [user, reviewId]);

  const fetchReview = async () => {
    try {
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select(`
          id,
          title,
          content,
          has_spoiler,
          created_at,
          user_id,
          users (username, display_name),
          animes (id, title)
        `)
        .eq('id', reviewId)
        .single();

      if (reviewError) throw reviewError;
      const normalizedReview = {
        ...reviewData,
        users: Array.isArray(reviewData.users) ? reviewData.users[0] ?? null : reviewData.users ?? null,
        animes: Array.isArray(reviewData.animes) ? reviewData.animes[0] ?? null : reviewData.animes ?? null,
      };
      setReview(normalizedReview);

      await Promise.all([fetchComments(), fetchLikeCount()]);
    } catch (error) {
      console.error('感想取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select(`
        id,
        content,
        created_at,
        user_id,
        users (username, display_name)
      `)
      .eq('review_id', reviewId)
      .order('created_at', { ascending: true });

    const normalized = (data || []).map((comment) => {
      const userValue = Array.isArray(comment.users) ? comment.users[0] ?? null : comment.users ?? null;
      return { ...comment, users: userValue };
    });
    setComments(normalized);
  };

  const fetchLikeCount = async () => {
    const { count } = await supabase
      .from('likes')
      .select('id', { count: 'exact', head: true })
      .eq('review_id', reviewId);

    setLikeCount(count || 0);
  };

  const fetchLikeState = async () => {
    try {
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user!.id)
        .maybeSingle();

      setLiked(Boolean(data));
    } catch (error) {
      console.error('いいね状態取得エラー:', error);
    }
  };

  const handleToggleLike = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      if (liked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);

        if (error) throw error;
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ review_id: reviewId, user_id: user.id });

        if (error) throw error;
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('いいね更新エラー:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !commentContent.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          review_id: reviewId,
          user_id: user.id,
          content: commentContent.trim(),
        });

      if (error) throw error;
      setCommentContent('');
      setReplyTo(null);
      await fetchComments();
    } catch (error) {
      console.error('コメント投稿エラー:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
      await fetchComments();
    } catch (error) {
      console.error('コメント削除エラー:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!isOwner) return;
    const confirmDelete = window.confirm('この感想を削除しますか？');
    if (!confirmDelete) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId);

      if (error) throw error;
      router.push('/reviews');
      router.refresh();
    } catch (error) {
      console.error('感想削除エラー:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = (comment: CommentWithUser) => {
    const name = comment.users?.display_name || comment.users?.username || 'user';
    setReplyTo({ id: comment.id, name });
    if (!commentContent.startsWith(`@${name}`)) {
      setCommentContent(`@${name} `);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-600">感想が見つかりませんでした</p>
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
          <p className="text-sm text-pink-600 font-semibold">{review.animes?.title}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{review.title}</h1>
        </div>
      </div>

      <div className="card p-6 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white font-semibold">
              {review.users?.display_name?.charAt(0) || review.users?.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {review.users?.display_name || review.users?.username}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(review.created_at).toLocaleString('ja-JP')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {review.has_spoiler && (
              <span className="badge bg-yellow-100 text-yellow-700">ネタバレ</span>
            )}
            {isOwner && (
              <button
                type="button"
                onClick={handleDeleteReview}
                className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                disabled={submitting}
                title="削除"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{review.content}</p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleToggleLike}
            className={`px-4 py-2 rounded-full flex items-center gap-2 border transition-colors ${
              liked ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-600'
            }`}
            disabled={!user || submitting}
          >
            <Heart className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} />
            いいね {likeCount}
          </button>
          <span className="text-sm text-gray-500 flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            コメント {comments.length}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">コメント</h2>

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {comment.users?.display_name || comment.users?.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleReply(comment)}
                      className="text-xs font-semibold text-pink-600 hover:text-pink-700"
                    >
                      返信
                    </button>
                    {user?.id === comment.user_id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-600"
                        disabled={submitting}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-700 mt-3 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center text-gray-600">まだコメントがありません</div>
        )}

        <form onSubmit={handleCommentSubmit} className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">コメントを書く</p>
            {replyTo && (
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                返信先: {replyTo.name} (解除)
              </button>
            )}
          </div>
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            className="input-field min-h-[120px]"
            placeholder={user ? 'コメントを入力' : 'ログインするとコメントできます'}
            disabled={!user}
          />
          <button type="submit" className="btn-primary inline-flex items-center" disabled={!user || submitting}>
            送信
            <Send className="w-4 h-4 ml-2" />
          </button>
        </form>
      </div>
    </div>
  );
}
