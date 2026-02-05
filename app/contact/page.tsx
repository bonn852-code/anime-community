'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

export default function ContactPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      setStatus('お問い合わせにはログインが必要です。');
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setStatus('件名と内容を入力してください。');
      return;
    }

    setLoading(true);
    setStatus('');

    try {
      const { error } = await supabase.from('inquiries').insert({
        user_id: user.id,
        email: user.email,
        subject: subject.trim(),
        message: message.trim(),
      });
      if (error) throw error;
      setSubject('');
      setMessage('');
      setStatus('送信しました。返信をお待ちください。');
    } catch (error) {
      console.error('お問い合わせ送信エラー:', error);
      setStatus('送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">お問い合わせ</h1>
        <p className="text-gray-600">不具合や要望はこちらからご連絡ください</p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 md:p-8 space-y-6">
        {status && (
          <div className="card p-4 text-sm text-gray-700 bg-pink-50/60">{status}</div>
        )}

        <div>
          <label className="text-sm font-semibold text-gray-900">件名</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input-field mt-2"
            placeholder="お問い合わせ件名"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-gray-900">内容</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input-field mt-2 min-h-[160px]"
            placeholder="詳細を入力してください"
          />
        </div>

        <button type="submit" className="btn-primary inline-flex items-center" disabled={loading}>
          <Send className="w-4 h-4 mr-2" />
          {loading ? '送信中...' : '送信する'}
        </button>
      </form>
    </div>
  );
}
