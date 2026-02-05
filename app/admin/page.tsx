'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Mail, UserX, Trash2, Search } from 'lucide-react';
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

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  is_suspended: boolean | null;
  created_at: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<InquiryRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userSearch, setUserSearch] = useState('');
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
      fetchUsers();
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

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('users')
        .select('id, username, display_name, avatar_url, is_suspended, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (userSearch.trim()) {
        const q = userSearch.trim();
        query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
    }
  };

  const toggleSuspend = async (target: UserRow) => {
    try {
      const nextValue = !target.is_suspended;
      const { error } = await supabase
        .from('users')
        .update({ is_suspended: nextValue })
        .eq('id', target.id);
      if (error) throw error;
      setUsers((prev) =>
        prev.map((row) => (row.id === target.id ? { ...row, is_suspended: nextValue } : row))
      );
    } catch (error) {
      console.error('停止更新エラー:', error);
    }
  };

  const deleteUser = async (target: UserRow) => {
    const confirmDelete = window.confirm('このユーザーのプロフィールを削除しますか？');
    if (!confirmDelete) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', target.id);
      if (error) throw error;
      setUsers((prev) => prev.filter((row) => row.id !== target.id));
    } catch (error) {
      console.error('ユーザー削除エラー:', error);
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
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">管理者ダッシュボード</h1>
        <p className="text-gray-600">お問い合わせとユーザー管理</p>
      </div>

      <div className="card p-6 md:p-8 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">ユーザー管理</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onBlur={fetchUsers}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                fetchUsers();
              }
            }}
            className="input-field pl-10"
            placeholder="ユーザー名で検索"
          />
        </div>
        <p className="text-xs text-gray-500">
          停止するとログイン不可になります。削除はプロフィール情報のみ削除されます。
        </p>
        <div className="space-y-3">
          {users.length > 0 ? (
            users.map((item) => (
              <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-100 rounded-xl p-4">
                <div>
                  <p className="font-semibold text-gray-900">{item.display_name || item.username}</p>
                  <p className="text-sm text-gray-500">@{item.username}</p>
                  {item.is_suspended && (
                    <span className="text-xs font-semibold text-red-600">停止中</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleSuspend(item)}
                    className="btn-secondary inline-flex items-center"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    {item.is_suspended ? '停止解除' : '停止する'}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteUser(item)}
                    className="btn-secondary inline-flex items-center text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    削除
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">該当するユーザーがいません。</p>
          )}
        </div>
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
