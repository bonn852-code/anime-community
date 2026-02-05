'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
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

export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const otherId = params.id as string;

  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [otherUser, setOtherUser] = useState<UserRow | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user && otherId) {
      fetchThread();
    }
  }, [user, authLoading, otherId]);

  const scrollToBottom = () => {
    const target = bottomRef.current || listRef.current;
    if (!target) return;
    // Use scrollIntoView for mobile Safari reliability.
    bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 50);
  };

  useEffect(() => {
    if (!user || !otherId) return;
    const channel = supabase
      .channel(`dm-thread-${user.id}-${otherId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as MessageRow;
          const isRelevant =
            (msg.sender_id === user.id && msg.recipient_id === otherId) ||
            (msg.sender_id === otherId && msg.recipient_id === user.id);
          if (!isRelevant) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          requestAnimationFrame(scrollToBottom);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherId]);

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [otherId]);

  useEffect(() => {
    const handleFocus = () => scrollToBottom();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        scrollToBottom();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!user || !otherId) return;
    const interval = setInterval(() => {
      fetchThread({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [user, otherId]);

  const fetchThread = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', otherId)
        .single();
      if (profileError) throw profileError;
      setOtherUser(profile);

      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user!.id})`)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);

      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('recipient_id', user!.id)
        .eq('sender_id', otherId)
        .eq('is_read', false);
    } catch (error) {
      console.error('メッセージ取得エラー:', error);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
      setInitialLoading(false);
      requestAnimationFrame(scrollToBottom);
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !content.trim()) return;
    if (otherId === user.id) {
      setSendError('自分自身には送信できません');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      const { error } = await supabase.from('direct_messages').insert({
        sender_id: user.id,
        recipient_id: otherId,
        content: content.trim(),
      });
      if (error) throw error;
      await supabase.from('notifications').insert({
        user_id: otherId,
        actor_id: user.id,
        type: 'dm',
        review_id: null,
      });
      setContent('');
      await fetchThread({ silent: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : '送信に失敗しました';
      setSendError(message);
      console.error('メッセージ送信エラー:', error);
    } finally {
      setSending(false);
    }
  };

  const title = useMemo(() => {
    if (!otherUser) return 'メッセージ';
    return otherUser.display_name || otherUser.username;
  }, [otherUser]);

  if (authLoading || (loading && initialLoading)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="card p-8 text-center text-gray-600">ユーザーが見つかりません</div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-4 overflow-hidden">
      <div className="flex items-center gap-3">
        <Link href="/messages" className="p-2 rounded-full bg-white shadow hover:shadow-md">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">@{otherUser.username}</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden flex-1 flex flex-col min-h-0 relative">
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white font-semibold overflow-hidden">
            {otherUser.avatar_url ? (
              <img src={otherUser.avatar_url} alt={otherUser.username} className="w-full h-full object-cover" />
            ) : (
              otherUser.display_name?.charAt(0) || otherUser.username.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{title}</p>
            <p className="text-xs text-gray-500">@{otherUser.username}</p>
          </div>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-pink-50/60 via-white to-white px-4 py-5 space-y-4 pb-28"
        >
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] md:max-w-[60%] ${isMine ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        isMine
                          ? 'bg-pink-500 text-white rounded-br-md'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <p className={`mt-1 text-[11px] text-gray-400 ${isMine ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      {isMine && (
                        <span className="ml-2">{msg.is_read ? '既読' : '送信済み'}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center">メッセージを送ってみましょう</p>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-white space-y-2 sticky bottom-0">
          {sendError && (
            <p className="text-xs text-red-500">{sendError}</p>
          )}
          <div className="flex items-center gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="input-field"
              placeholder="メッセージを入力"
            />
            <button type="submit" className="btn-primary inline-flex items-center" disabled={sending}>
              <Send className="w-4 h-4 mr-1" />
              送信
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
