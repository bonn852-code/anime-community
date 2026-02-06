"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, User, Bell, Menu, X, LogOut, Home, Film, MessageCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { signOut } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() || "";
  const isAdmin = Boolean(user?.email && user.email.toLowerCase() === adminEmail);

  const isActive = (path: string) => pathname === path;
  const showUnreadBadge = pathname !== "/notifications" && unreadCount > 0;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("ログアウトエラー:", error);
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 8000);
    const handleRead = () => {
      fetchUnread();
    };
    window.addEventListener("notifications:read", handleRead as EventListener);

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => {
          fetchUnread();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("notifications:read", handleRead as EventListener);
    };
  }, [user]);

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-24 md:h-28">
          <Link href="/" className="flex items-center space-x-1 group">
            <img
              src="/animecom-logo.png"
              alt="AniWorld"
              className="h-24 w-auto sm:h-28 md:h-32"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              ホーム
            </Link>
            <Link
              href="/animes"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/animes")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              アニメ一覧
            </Link>
            <Link
              href="/reviews"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/reviews")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              感想一覧
            </Link>
            <Link
              href="/users"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/users")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              ユーザー検索
            </Link>
            <Link
              href="/contact"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/contact")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              お問い合わせ
            </Link>
            <Link
              href="/messages"
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isActive("/messages")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              DM
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive("/admin")
                    ? "bg-sky-100 text-sky-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                管理
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-2">
            {!loading && user ? (
              <>
                <Link
                  href="/notifications"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative hidden sm:block"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {showUnreadBadge && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  )}
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

        <div className="md:hidden pb-2">
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            <Link
              href="/"
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                isActive("/")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 bg-gray-100"
              }`}
            >
              <Home className="w-4 h-4" />
              ホーム
            </Link>
            <Link
              href="/animes"
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                isActive("/animes")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 bg-gray-100"
              }`}
            >
              <Film className="w-4 h-4" />
              アニメ
            </Link>
            <Link
              href="/reviews"
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                isActive("/reviews")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 bg-gray-100"
              }`}
            >
              <Heart className="w-4 h-4" />
              感想
            </Link>
            <Link
              href="/users"
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                isActive("/users")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 bg-gray-100"
              }`}
            >
              <Users className="w-4 h-4" />
              ユーザー
            </Link>
            <Link
              href="/messages"
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                isActive("/messages")
                  ? "bg-sky-100 text-sky-700"
                  : "text-gray-700 bg-gray-100"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              DM
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                  isActive("/admin")
                    ? "bg-sky-100 text-sky-700"
                    : "text-gray-700 bg-gray-100"
                }`}
              >
                管理
              </Link>
            )}
            {user ? (
              <>
                <Link
                  href="/notifications"
                  className={`relative flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                    isActive("/notifications")
                      ? "bg-sky-100 text-sky-700"
                      : "text-gray-700 bg-gray-100"
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  通知
                  {showUnreadBadge && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                  )}
                </Link>
                <Link
                  href="/profile"
                  className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                    isActive("/profile")
                      ? "bg-sky-100 text-sky-700"
                      : "text-gray-700 bg-gray-100"
                  }`}
                >
                  <User className="w-4 h-4" />
                  プロフ
                </Link>
              </>
            ) : (
              <Link
                href="/auth/login"
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-sm whitespace-nowrap ${
                  isActive("/auth/login")
                    ? "bg-sky-100 text-sky-700"
                    : "text-gray-700 bg-gray-100"
                }`}
              >
                ログイン
              </Link>
            )}
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <div className="flex flex-col space-y-2">
              <Link
                href="/"
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive("/")
                    ? "bg-sky-100 text-sky-700"
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
                    ? "bg-sky-100 text-sky-700"
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
                    ? "bg-sky-100 text-sky-700"
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
                    ? "bg-sky-100 text-sky-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                ユーザー検索
              </Link>
              <Link
                href="/contact"
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive("/contact")
                    ? "bg-sky-100 text-sky-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                お問い合わせ
              </Link>
              <Link
                href="/messages"
                className={`px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive("/messages")
                    ? "bg-sky-100 text-sky-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                DM
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    isActive("/admin")
                      ? "bg-sky-100 text-sky-700"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  管理
                </Link>
              )}
              {user ? (
                <>
                  <Link
                    href="/notifications"
                    className="px-4 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-all"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    通知{showUnreadBadge ? ` (${unreadCount})` : ""}
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
