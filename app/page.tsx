 'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Users, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/AuthProvider';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-12">
      <section className="text-center py-12 px-4">
        <div className="inline-flex items-center space-x-2 bg-pink-100 text-pink-700 px-4 py-2 rounded-full mb-6 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">アニメ好きのためのコミュニティ</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 bg-clip-text text-transparent animate-slide-up">
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
              <span className="text-pink-600 font-bold">AnimeHub</span>
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
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
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
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-900">新作を発見</h3>
          <p className="text-gray-600">
            コミュニティの評価から、次に観る作品を見つけよう。
          </p>
        </div>
      </section>

      {!user && (
        <section className="card p-8 md:p-12 text-center bg-gradient-to-r from-pink-50 to-purple-50">
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
