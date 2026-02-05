'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface InquiryRow {
  id: number;
  user_id: string;
  email: string | null;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() || '';
  const isAdmin = Boolean(user?.email && user.email.toLowerCase() === adminEmail);

  const sorted = useMemo(
    () => [...inquiries].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [inquiries]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user && !isAdmin) {
      router.push('/');
      return;
    }
    if (user && isAdmin) {
      fetchInquiries();
    }
  }, [user, authLoading, isAdmin]);

  const fetchInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInquiries(data || []);
    } catch (error) {
      console.error('お問い合わせ取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveInquiry = async (id: number) => {
    try {
      const { error } = await supabase
        .from('inquiries')
        .update({ status: 'resolved' })
        .eq('id', id);
      if (error) throw error;
      setInquiries((prev) => prev.map((row) => (row.id === id ? { ...row, status: 'resolved' } : row)));
    } catch (error) {
      console.error('お問い合わせ更新エラー:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">管理者ダッシュボード</h1>
        <p className="text-gray-600">お問い合わせの管理</p>
      </div>

      {sorted.length > 0 ? (
        <div className="space-y-4">
          {sorted.map((item) => (
            <div key={item.id} className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">{new Date(item.created_at).toLocaleString('ja-JP')}</p>
                  <h3 className="text-xl font-bold text-gray-900 mt-2">{item.subject}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Mail className="w-4 h-4" />
                    {item.email || 'メール未設定'}
                  </div>
                </div>
                {item.status !== 'resolved' ? (
                  <button
                    type="button"
                    onClick={() => resolveInquiry(item.id)}
                    className="btn-secondary inline-flex items-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    対応済みにする
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-green-600">対応済み</span>
                )}
              </div>
              <p className="text-gray-700 mt-4 whitespace-pre-wrap">{item.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center text-gray-600">お問い合わせはまだありません</div>
      )}
    </div>
  );
}
