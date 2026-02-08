'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, Heart, MessageCircle, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface NotificationWithDetails {
  id: number;
  actor_id: string;
  type: string;
  is_read: boolean;
  created_at: string;
  actor: {
    username: string;
    display_name: string | null;
  } | null;
  reviews: {
    id: number;
    title: string;
  } | null;
}

export default function NotificationsPage() {
  const ITEMS_PER_PAGE = 20;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    } else if (user) {
      fetchNotifications();
    }
  }, [user, authLoading, currentPage]);

  const fetchNotifications = async () => {
    try {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const { data, error, count } = await supabase
        .from('notifications')
        .select(`
          id,
          actor_id,
          type,
          is_read,
          created_at,
          actor:actor_id (username, display_name),
          reviews:review_id (id, title)
        `, { count: 'exact' })
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setTotalCount(count || 0);
      const normalized = (data || []).map((item) => {
        const actorValue = Array.isArray(item.actor) ? item.actor[0] ?? null : item.actor ?? null;
        const reviewValue = Array.isArray(item.reviews) ? item.reviews[0] ?? null : item.reviews ?? null;
        return { ...item, actor: actorValue, reviews: reviewValue };
      });
      setNotifications(normalized);

      // 未読を既読に
      const unreadIds = (data || []).filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', unreadIds);
        window.dispatchEvent(new CustomEvent('notifications:read'));
      }
    } catch (error) {
      console.error('通知取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-sky-500" fill="currentColor" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'follow':
        return <User className="w-5 h-5 text-purple-500" />;
      case 'dm':
        return <MessageCircle className="w-5 h-5 text-sky-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationText = (notification: NotificationWithDetails) => {
    const actorName = notification.actor?.display_name || notification.actor?.username || 'ユーザー';
    
    switch (notification.type) {
      case 'like':
        return `${actorName}さんがあなたの感想にいいねしました`;
      case 'comment':
        return `${actorName}さんがあなたの感想にコメントしました`;
      case 'follow':
        return `${actorName}さんがあなたをフォローしました`;
      case 'dm':
        return `${actorName}さんからメッセージが届きました`;
      default:
        return '新しい通知があります';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          通知
        </h1>
        <p className="text-gray-600">
          {totalCount}件の通知
        </p>
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-6">
          {notifications.map((notification) => {
            const link =
              notification.type === 'dm'
                ? `/messages/${notification.actor_id}`
                : notification.type === 'follow'
                  ? `/users/${notification.actor_id}`
                : notification.reviews
                  ? `/reviews/${notification.reviews.id}`
                  : '#';
            return (
              <Link
                key={notification.id}
                href={link}
              >
              <div className={`card p-5 hover:shadow-lg transition-shadow ${
                !notification.is_read ? 'bg-sky-50' : ''
              }`}>
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 font-medium leading-relaxed">
                      {getNotificationText(notification)}
                    </p>
                    
                    {notification.reviews && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                        「{notification.reviews.title}」
                      </p>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-3">
                      {new Date(notification.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
            );
          })}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
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
          <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">
            通知はまだありません
          </p>
        </div>
      )}
    </div>
  );
}
