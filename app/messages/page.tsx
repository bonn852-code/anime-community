'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface MessageRow {
  id: number;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Conversation {
  user: UserRow;
  lastMessage: MessageRow;
  unreadCount: number;
}

export default function MessagesPage() {
  const ITEMS_PER_PAGE = 12;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [users, setUsers] = useState<Record<string, UserRow>>({});
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user) {
      fetchMessages();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      fetchMessages();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-list-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as MessageRow;
          if (msg.sender_id !== user.id && msg.recipient_id !== user.id) return;
          fetchMessages();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as MessageRow;
          if (msg.sender_id !== user.id && msg.recipient_id !== user.id) return;
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetchMessages();
    }, 10000);
    return () => {
      window.clearInterval(timer);
    };
  }, [user]);

  const fetchMessages = async () => {
    try {
      setErrorMessage('');
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setMessages(data || []);

      const ids = new Set<string>();
      (data || []).forEach((item) => {
        const otherId = item.sender_id === user!.id ? item.recipient_id : item.sender_id;
        ids.add(otherId);
      });

      if (ids.size > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', Array.from(ids));
        if (profileError) throw profileError;
        const map: Record<string, UserRow> = {};
        (profiles || []).forEach((profile) => {
          map[profile.id] = profile;
        });
        setUsers(map);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '取得に失敗しました';
      setErrorMessage(message);
      console.error('メッセージ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const conversations = useMemo<Conversation[]>(() => {
    const map = new Map<string, Conversation>();
    messages.forEach((msg) => {
      const otherId = msg.sender_id === user?.id ? msg.recipient_id : msg.sender_id;
      const existing = map.get(otherId);
      const unread = msg.recipient_id === user?.id && !msg.is_read ? 1 : 0;
      if (!existing) {
        const profile = users[otherId];
        if (profile) {
          map.set(otherId, {
            user: profile,
            lastMessage: msg,
            unreadCount: unread,
          });
        }
      } else {
        existing.unreadCount += unread;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.lastMessage.created_at.localeCompare(a.lastMessage.created_at));
  }, [messages, users, user]);
  const totalPages = Math.max(1, Math.ceil(conversations.length / ITEMS_PER_PAGE));
  const visibleConversations = useMemo(
    () => conversations.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [conversations, currentPage]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [conversations.length]);

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">メッセージ</h1>
        <p className="text-gray-600">ユーザーとのDM履歴</p>
      </div>

      {errorMessage && (
        <div className="card p-4 text-sm text-red-600 bg-red-50 border border-red-200">
          {errorMessage}
        </div>
      )}

      {conversations.length > 0 ? (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {visibleConversations.map((conv) => (
            <Link key={conv.user.id} href={`/messages/${conv.user.id}`}>
              <div className="card p-5 flex items-center justify-between gap-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                    {conv.user.avatar_url ? (
                      <img src={conv.user.avatar_url} alt={conv.user.username} className="w-full h-full object-cover" />
                    ) : (
                      conv.user.display_name?.charAt(0) || conv.user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {conv.user.display_name || conv.user.username}
                    </p>
                    <p className="text-sm text-gray-500 line-clamp-1">
                      {conv.lastMessage.content}
                    </p>
                  </div>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="text-xs font-semibold bg-sky-100 text-sky-700 rounded-full px-2 py-1">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
            </Link>
            ))}
          </div>
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
        <div className="card p-8 text-center text-gray-600">まだメッセージがありません</div>
      )}

      <div className="text-sm text-gray-500">
        <Link href="/users" className="text-sky-600 hover:text-sky-700">
          ユーザー検索へ
        </Link>
      </div>
    </div>
  );
}
