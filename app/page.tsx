 'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Users, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthProvider';

export default function HomePage() {
  const { user } = useAuth();
  const [recommendedAnimes, setRecommendedAnimes] = useState<any[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<any[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ||
    (user?.user_metadata?.username as string | undefined) ||
    user?.email?.split('@')[0] ||
    'ゲスト';

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    if (!user) return;
    setRecommendLoading(true);
    try {
      const { data: recommendedUsersRaw } = await supabase
        .from('recommended_users')
        .select('recommended_user_id, overlap_count')
        .order('overlap_count', { ascending: false })
        .limit(6);

      const recommendedUserIds = (recommendedUsersRaw || []).map((row) => row.recommended_user_id);
      if (recommendedUserIds.length > 0) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        const followingSet = new Set((follows || []).map((row) => row.following_id));

        const { data: userProfiles } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .in('id', recommendedUserIds);
        const filteredUsers = (userProfiles || []).filter(
          (u) => u.id !== user.id && !followingSet.has(u.id)
        );
        setRecommendedUsers(filteredUsers);
      } else {
        const { data: latestUsers } = await supabase
          .from('users')
          .select('id, username, display_name, avatar_url')
          .order('created_at', { ascending: false })
          .limit(6);
        setRecommendedUsers((latestUsers || []).filter((u) => u.id !== user.id));
      }

      const { data: recommendedAnimesRaw } = await supabase
        .from('recommended_animes')
        .select('anime_id, score')
        .order('score', { ascending: false })
        .limit(6);
      const recommendedAnimeIds = (recommendedAnimesRaw || []).map((row) => row.anime_id);
      if (recommendedAnimeIds.length > 0) {
        const { data: animeDetails } = await supabase
          .from('animes')
          .select('id, title, image_url')
          .in('id', recommendedAnimeIds);
        const animeMap = new Map((animeDetails || []).map((a) => [a.id, a]));
        setRecommendedAnimes(recommendedAnimeIds.map((id) => animeMap.get(id)).filter(Boolean));
      } else {
        const { data: latestAnimes } = await supabase
          .from('animes')
          .select('id, title, image_url')
          .order('created_at', { ascending: false })
          .limit(6);
        setRecommendedAnimes(latestAnimes || []);
      }
    } catch (error) {
      console.error('レコメンド取得エラー:', error);
    } finally {
      setRecommendLoading(false);
    }
  };

  return (
    <div className="space-y-12">
      <section className="text-center py-12 px-4">
        <div className="inline-flex items-center space-x-2 bg-sky-100 text-sky-700 px-4 py-2 rounded-full mb-6 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">アニメ好きのためのコミュニティ</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-sky-600 via-blue-600 to-purple-600 bg-clip-text text-transparent animate-slide-up">
          好きなアニメで<br />繋がろう
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto animate-slide-up">
          感想を共有して、同じ作品を愛する仲間と出会える場所
        </p>
        
        {!user ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
            <Link href="/auth/signup" className="btn-primary">
              今すぐ始める
              <ArrowRight className="w-5 h-5 inline ml-2" />
            </Link>
            <Link href="/animes" className="btn-secondary">
              アニメを探す
            </Link>
          </div>
        ) : (
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 text-gray-700 text-sm font-semibold shadow-sm">
              おかえりなさい
              <span className="text-sky-600 font-bold">{displayName}</span>
            </div>
            <div className="mt-6 grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <Link href="/animes" className="card p-4 text-left hover:shadow-lg transition-shadow">
                <p className="text-sm text-gray-500 mb-1">今日の一本を探す</p>
                <p className="text-lg font-bold text-gray-900">アニメ一覧へ</p>
              </Link>
              <Link href="/reviews/new" className="card p-4 text-left hover:shadow-lg transition-shadow">
                <p className="text-sm text-gray-500 mb-1">観たらすぐ投稿</p>
                <p className="text-lg font-bold text-gray-900">感想を書く</p>
              </Link>
              <Link href="/profile" className="card p-4 text-left hover:shadow-lg transition-shadow">
                <p className="text-sm text-gray-500 mb-1">推しを見せる</p>
                <p className="text-lg font-bold text-gray-900">プロフィール</p>
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="card p-6 hover:scale-105 transition-transform">
          <div className="bg-gradient-to-br from-sky-500 to-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-900">感想を共有</h3>
          <p className="text-gray-600">
            観たアニメの感想を自由に投稿。ネタバレ配慮機能も完備。
          </p>
        </div>

        <div className="card p-6 hover:scale-105 transition-transform">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-900">仲間と繋がる</h3>
          <p className="text-gray-600">
            同じ作品が好きな人をフォローして、交流を楽しもう。
          </p>
        </div>

        <div className="card p-6 hover:scale-105 transition-transform">
          <div className="bg-gradient-to-br from-blue-500 to-sky-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-900">新作を発見</h3>
          <p className="text-gray-600">
            コミュニティの評価から、次に観る作品を見つけよう。
          </p>
        </div>
      </section>

      {user && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">あなたへのおすすめ</h2>
              <p className="text-gray-600">評価傾向が近い人や作品をピックアップ</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">おすすめユーザー</h3>
              {recommendLoading ? (
                <p className="text-sm text-gray-500">読み込み中...</p>
              ) : recommendedUsers.length > 0 ? (
                <div className="space-y-3">
                  {recommendedUsers.slice(0, 6).map((u) => (
                    <Link key={u.id} href={`/users/${u.id}`} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-semibold overflow-hidden">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          u.display_name?.charAt(0) || u.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{u.display_name || u.username}</p>
                        <p className="text-xs text-gray-500">@{u.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">おすすめできるユーザーがまだいません</p>
              )}
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">おすすめアニメ</h3>
              {recommendLoading ? (
                <p className="text-sm text-gray-500">読み込み中...</p>
              ) : recommendedAnimes.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {recommendedAnimes.slice(0, 6).map((anime) => (
                    <Link key={anime.id} href={`/animes/${anime.id}`} className="flex items-center gap-3">
                      <div className="w-12 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                        {anime.image_url ? (
                          <img src={anime.image_url} alt={anime.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">—</div>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{anime.title}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">おすすめできる作品がまだいません</p>
              )}
            </div>
          </div>
        </section>
      )}

      {!user && (
        <section className="card p-8 md:p-12 text-center bg-gradient-to-r from-sky-50 to-indigo-50">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900">
            今すぐ参加して、アニメの世界を広げよう
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            無料でアカウント作成。好きなアニメを登録して、感想を共有しましょう。
          </p>
          <Link href="/auth/signup" className="btn-primary inline-flex items-center">
            無料で始める
            <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
        </section>
      )}
    </div>
  );
}
