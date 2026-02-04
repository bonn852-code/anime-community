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
}

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
  }, [search, user]);

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .order('created_at', { ascending: false })
        .limit(30);

      if (search.trim()) {
        const q = search.trim();
        query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">ユーザーを探す</h1>
        <p className="text-gray-600">気になる人をフォローして感想を追いかけよう</p>
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
        <div className="grid md:grid-cols-2 gap-6">
          {filteredUsers.map((profile) => {
            const isFollowing = followingIds.has(profile.id);
            const handle = formatHandle(profile);
            return (
              <div key={profile.id} className="card p-6 flex items-center justify-between gap-4">
                <Link href={`/users/${profile.id}`} className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white font-semibold overflow-hidden">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
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
      ) : (
        <div className="card p-8 text-center text-gray-600">該当するユーザーが見つかりません</div>
      )}

      <div className="text-sm text-gray-500">
        <Link href="/reviews" className="text-pink-600 hover:text-pink-700">
          感想一覧を見る
        </Link>
        <span className="mx-2">|</span>
        <Link href="/profile" className="text-pink-600 hover:text-pink-700">
          自分のプロフィールへ
        </Link>
      </div>
    </div>
  );
}
