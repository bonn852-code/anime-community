'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user && otherId) {
      fetchThread();
    }
  }, [user, authLoading, otherId]);

  const fetchThread = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !content.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('direct_messages').insert({
        sender_id: user.id,
        recipient_id: otherId,
        content: content.trim(),
      });
      if (error) throw error;
      setContent('');
      await fetchThread();
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
    } finally {
      setSending(false);
    }
  };

  const title = useMemo(() => {
    if (!otherUser) return 'メッセージ';
    return otherUser.display_name || otherUser.username;
  }, [otherUser]);

  if (authLoading || loading) {
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/messages" className="p-2 rounded-full bg-white shadow hover:shadow-md">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">@{otherUser.username}</p>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isMine = msg.sender_id === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                      isMine
                        ? 'bg-pink-500 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 text-center">メッセージを送ってみましょう</p>
          )}
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-3">
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
        </form>
      </div>
    </div>
  );
}
