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
  const [hasMore, setHasMore] = useState(false);
  const [oldestAt, setOldestAt] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const pageSize = 40;
  const isAtBottomRef = useRef(true);
  const readingLockRef = useRef(false);
  const readingTimerRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const manualHoldRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const latestAtRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user && otherId) {
      fetchThread();
    }
  }, [user, authLoading, otherId]);

  useEffect(() => {
    if (!user || !otherId) return;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      manualHoldRef.current = false;
      setIsAtBottom(true);
      isAtBottomRef.current = true;
      fetchThread({ silent: true }).then(() => {
        requestAnimationFrame(scrollToBottom);
        setTimeout(scrollToBottom, 60);
        setTimeout(scrollToBottom, 180);
      });
    };
    const handlePageShow = () => {
      refresh();
    };
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', handlePageShow);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', handlePageShow);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [user, otherId]);

  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

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

  const mergeIncoming = (incoming: MessageRow[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const merged = [...prev];
      incoming.forEach((msg) => {
        if (!existingIds.has(msg.id)) {
          merged.push(msg);
        }
      });
      return merged;
    });
    const newest = incoming[incoming.length - 1];
    if (newest) {
      latestAtRef.current = newest.created_at;
    }
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
          mergeIncoming([msg]);
          if (isAtBottomRef.current && !manualHoldRef.current) {
            requestAnimationFrame(scrollToBottom);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherId]);

  useLayoutEffect(() => {
    if (manualHoldRef.current) return;
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (!messages.length) return;
    if (manualHoldRef.current) return;
    if (!isAtBottomRef.current) return;
    setTimeout(scrollToBottom, 0);
    setTimeout(scrollToBottom, 120);
    setTimeout(scrollToBottom, 320);
  }, [messages.length]);

  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = 'auto';
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 160)}px`;
  }, [content]);

  // Realtime only: polling disabled.

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
        .order('created_at', { ascending: false })
        .limit(pageSize);
      if (error) throw error;
      const newestFirst = data || [];
      const chronological = [...newestFirst].reverse();
      setMessages(chronological);
      if (chronological.length > 0) {
        latestAtRef.current = chronological[chronological.length - 1].created_at;
        setOldestAt(chronological[0].created_at);
      } else {
        latestAtRef.current = null;
        setOldestAt(null);
      }
      setHasMore(newestFirst.length === pageSize);

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
      if (!options?.silent) {
        setIsAtBottom(true);
        isAtBottomRef.current = true;
        requestAnimationFrame(scrollToBottom);
      }
    }
  };

  const fetchNewer = async () => {
    if (!latestAtRef.current) {
      await fetchThread({ silent: true });
      return;
    }
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user!.id})`)
        .gt('created_at', latestAtRef.current)
        .order('created_at', { ascending: true })
        .limit(pageSize);
      if (error) throw error;
      const incoming = data || [];
      if (incoming.length > 0) {
        mergeIncoming(incoming);
        if (isAtBottomRef.current && !manualHoldRef.current) {
          requestAnimationFrame(scrollToBottom);
        }
      }
    } catch (error) {
      console.error('新着メッセージ取得エラー:', error);
    }
  };

  useEffect(() => {
    if (!user || !otherId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (readingLockRef.current) return;
      fetchNewer();
    }, 7000);
    return () => {
      window.clearInterval(timer);
    };
  }, [user, otherId]);

  const loadOlder = async () => {
    if (!oldestAt || loadingOlder) return;
    try {
      setLoadingOlder(true);
      const container = listRef.current;
      const prevScrollHeight = container?.scrollHeight ?? 0;
      const prevScrollTop = container?.scrollTop ?? 0;
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user!.id})`)
        .lt('created_at', oldestAt)
        .order('created_at', { ascending: false })
        .limit(pageSize);
      if (error) throw error;
      const older = (data || []).reverse();
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
        setOldestAt(older[0].created_at);
        requestAnimationFrame(() => {
          if (!listRef.current) return;
          const newScrollHeight = listRef.current.scrollHeight;
          listRef.current.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
        });
      }
      setHasMore((data || []).length === pageSize);
    } catch (error) {
      console.error('過去メッセージ取得エラー:', error);
    } finally {
      setLoadingOlder(false);
    }
  };

  const submitMessage = async () => {
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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submitMessage();
  };

  const title = useMemo(() => {
    if (!otherUser) return 'メッセージ';
    return otherUser.display_name || otherUser.username;
  }, [otherUser]);

  if (authLoading || (loading && initialLoading)) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="card p-8 text-center text-gray-600">ユーザーが見つかりません</div>
    );
  }

  const handleScroll = () => {
    if (!listRef.current) return;
    const threshold = 20;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const scrolledUp = scrollTop < lastScrollTopRef.current - 2;
    lastScrollTopRef.current = scrollTop;
    const atBottom = scrollHeight - (scrollTop + clientHeight) < threshold;
    if (scrolledUp) {
      setIsAtBottom(false);
      isAtBottomRef.current = false;
      manualHoldRef.current = true;
    } else {
      setIsAtBottom(atBottom);
      isAtBottomRef.current = atBottom;
      if (atBottom) {
        manualHoldRef.current = false;
      }
    }
    if (!atBottom) {
      readingLockRef.current = true;
      if (readingTimerRef.current) {
        window.clearTimeout(readingTimerRef.current);
      }
      readingTimerRef.current = window.setTimeout(() => {
        readingLockRef.current = false;
      }, 8000);
    }
    if (scrollTop < 40 && hasMore && !loadingOlder) {
      loadOlder();
    }
  };

  const handleWheel = () => {
    if (isAtBottomRef.current) return;
    readingLockRef.current = true;
    if (readingTimerRef.current) {
      window.clearTimeout(readingTimerRef.current);
    }
    readingTimerRef.current = window.setTimeout(() => {
      readingLockRef.current = false;
    }, 8000);
  };

  const showJumpToLatest = !isAtBottom || manualHoldRef.current;

  return (
    <div className="-my-8 h-[calc(100svh-64px)] flex flex-col gap-4 overflow-hidden">
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
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
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
          onScroll={handleScroll}
          onWheel={handleWheel}
          className="flex-1 overflow-y-auto bg-gradient-to-b from-sky-50/60 via-white to-white px-4 py-5 space-y-4 pb-28"
        >
          {hasMore && (
            <div className="flex justify-center">
              <span className="text-xs text-gray-400">過去のメッセージを読み込み中...</span>
            </div>
          )}
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] md:max-w-[60%] ${isMine ? 'order-1' : 'order-2'}`}>
                    <div
                      className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        isMine
                          ? 'bg-sky-500 text-white rounded-br-md'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-md'
                      }`}
                    >
                      <span className="whitespace-pre-wrap break-words">{msg.content}</span>
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

        {showJumpToLatest && (
          <button
            type="button"
            onClick={() => {
              setIsAtBottom(true);
              manualHoldRef.current = false;
              scrollToBottom();
            }}
            className="absolute right-5 bottom-24 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-sky-600"
            aria-label="最新へ移動"
          >
            ↓
          </button>
        )}

        <form onSubmit={handleSubmit} className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-gray-100 bg-white space-y-2 sticky bottom-0">
          {sendError && (
            <p className="text-xs text-red-500">{sendError}</p>
          )}
          <div className="flex items-center gap-3">
            <textarea
              ref={inputRef}
              rows={1}
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (!sending) {
                    submitMessage();
                  }
                }
              }}
              className="input-field min-h-[44px] max-h-40 resize-none py-3"
              placeholder="メッセージを入力"
            />
            <button type="submit" className="btn-primary inline-flex items-center" disabled={sending || !content.trim()}>
              <Send className="w-4 h-4 mr-1" />
              送信
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
