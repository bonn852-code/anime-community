"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, User, Bell, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { signOut } from "@/lib/supabase";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="bg-gradient-to-br from-pink-500 to-rose-500 p-2 rounded-xl group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6 text-white" fill="white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent hidden sm:block">
              AnimeCom
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/")
                  ? "bg-pink-100 text-pink-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              ホーム
            </Link>
            <Link
              href="/animes"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/animes")
                  ? "bg-pink-100 text-pink-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              アニメ一覧
            </Link>
            <Link
              href="/reviews"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/reviews")
                  ? "bg-pink-100 text-pink-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              感想一覧
            </Link>
            <Link
              href="/users"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/users")
                  ? "bg-pink-100 text-pink-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              ユーザー検索
            </Link>
          </nav>

          <div className="flex items-center space-x-2">
            {!loading && user ? (
              <>
                <Link
                  href="/notifications"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative hidden sm:block"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                </Link>

                <Link
                  href="/profile"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors hidden sm:block"
                >
                  <User className="w-5 h-5 text-gray-600" />
                </Link>

                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors hidden sm:block"
                  title="ログアウト"
                >
                  <LogOut className="w-5 h-5 text-gray-600" />
                </button>
              </>
            ) : !loading ? (
              <Link href="/auth/login" className="btn-primary hidden sm:block">
                ログイン
              </Link>
            ) : null}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <div className="flex flex-col space-y-2">
              <Link
                href="/"
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive("/")
                    ? "bg-pink-100 text-pink-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                ホーム
              </Link>
              <Link
                href="/animes"
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive("/animes")
                    ? "bg-pink-100 text-pink-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                アニメ一覧
              </Link>
              <Link
                href="/reviews"
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive("/reviews")
                    ? "bg-pink-100 text-pink-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                感想一覧
              </Link>
              <Link
                href="/users"
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive("/users")
                    ? "bg-pink-100 text-pink-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                ユーザー検索
              </Link>
              {user ? (
                <>
                  <Link
                    href="/notifications"
                    className="px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-all"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    通知
                  </Link>
                  <Link
                    href="/profile"
                    className="px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-all"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    プロフィール
                  </Link>
                  <button
                    onClick={() => {
                      handleSignOut();
                      setIsMenuOpen(false);
                    }}
                    className="px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-all text-left"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="btn-primary text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  ログイン
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
