'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, UserPlus, UserCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_position: string | null;
}

export default function UsersPage() {
  const ITEMS_PER_PAGE = 20;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = useMemo(() => users.filter((u) => u.id !== user?.id), [users, user]);

  const formatHandle = (profile: UserRow) => {
    if (profile.display_name) return profile.display_name;
    if (!profile.username) return '';
    if (profile.username.includes('@')) {
      return `user-${profile.id.slice(0, 6)}`;
    }
    return profile.username;
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user) {
      fetchUsers();
      fetchFollowing();
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, user, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('users')
        .select('id, username, display_name, avatar_url, avatar_position', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (search.trim()) {
        const q = search.trim();
        query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setUsers(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('ユーザー取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user!.id);

      if (error) throw error;
      setFollowingIds(new Set((data || []).map((row) => row.following_id)));
    } catch (error) {
      console.error('フォロー取得エラー:', error);
    }
  };

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    setActionLoadingId(targetId);
    try {
      if (followingIds.has(targetId)) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', targetId);

        if (error) throw error;
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: targetId });

        if (error) throw error;
        setFollowingIds((prev) => new Set(prev).add(targetId));

        await supabase.from('notifications').insert({
          user_id: targetId,
          actor_id: user.id,
          type: 'follow',
          review_id: null,
        });
      }
    } catch (error) {
      console.error('フォロー更新エラー:', error);
    } finally {
      setActionLoadingId(null);
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
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">ユーザーを探す</h1>
        <p className="text-gray-600">気になる人をフォローして感想を追いかけよう（{totalCount}人）</p>
      </div>

      <div className="card p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="ユーザー名で検索"
          />
        </div>
      </div>

      {filteredUsers.length > 0 ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
          {filteredUsers.map((profile) => {
            const isFollowing = followingIds.has(profile.id);
            const handle = formatHandle(profile);
            return (
              <div key={profile.id} className="card p-6 flex items-center justify-between gap-4">
                <Link href={`/users/${profile.id}`} className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.username}
                        className="w-full h-full object-cover"
                        style={{ objectPosition: profile.avatar_position || 'center' }}
                      />
                    ) : (
                      profile.display_name?.charAt(0) || profile.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {profile.display_name || profile.username}
                    </p>
                    <p className="text-sm text-gray-500 truncate">@{handle}</p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => toggleFollow(profile.id)}
                  className={
                    isFollowing
                      ? 'btn-secondary inline-flex items-center'
                      : 'btn-primary inline-flex items-center'
                  }
                  disabled={actionLoadingId === profile.id}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="w-4 h-4 mr-2" />
                      フォロー中
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      フォロー
                    </>
                  )}
                </button>
              </div>
            );
          })}
          </div>
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
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
        <div className="card p-8 text-center text-gray-600">該当するユーザーが見つかりません</div>
      )}

      <div className="text-sm text-gray-500">
        <Link href="/reviews" className="text-sky-600 hover:text-sky-700">
          感想一覧を見る
        </Link>
        <span className="mx-2">|</span>
        <Link href="/profile" className="text-sky-600 hover:text-sky-700">
          自分のプロフィールへ
        </Link>
      </div>
    </div>
  );
}
