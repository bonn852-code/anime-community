"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Clapperboard,
  Home,
  LogOut,
  MessageCircle,
  PencilLine,
  Search,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { signOut, supabase } from "@/lib/supabase";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ホーム", icon: Home },
  { href: "/animes", label: "アニメ", icon: Clapperboard },
  { href: "/reviews", label: "感想", icon: PencilLine },
  { href: "/users", label: "検索", icon: Search },
  { href: "/messages", label: "DM", icon: MessageCircle },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dmUnreadCount, setDmUnreadCount] = useState(0);
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase() || "";
  const isAdmin = Boolean(user?.email && user.email.toLowerCase() === adminEmail);

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  const showUnreadBadge = pathname !== "/notifications" && unreadCount > 0;
  const showDmBadge = !pathname.startsWith("/messages") && dmUnreadCount > 0;

  const navItems = useMemo(() => NAV_ITEMS, []);

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
    const handleRead = () => fetchUnread();
    window.addEventListener("notifications:read", handleRead as EventListener);

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        fetchUnread
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("notifications:read", handleRead as EventListener);
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setDmUnreadCount(0);
      return;
    }

    const fetchDmUnread = async () => {
      const { count } = await supabase
        .from("direct_messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("is_read", false);
      setDmUnreadCount(count || 0);
    };

    fetchDmUnread();
    const interval = setInterval(fetchDmUnread, 6000);
    const handleRead = () => fetchDmUnread();
    window.addEventListener("dm:read", handleRead as EventListener);

    const channel = supabase
      .channel(`dm-unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages", filter: `recipient_id=eq.${user.id}` },
        fetchDmUnread
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("dm:read", handleRead as EventListener);
    };
  }, [user, pathname]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-sky-100 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4 md:h-20 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/animecom-logo.png" alt="AniWorld" className="h-10 w-auto md:h-12" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 rounded-full border border-sky-100 bg-sky-50/70 p-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const isDm = item.href === "/messages";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active ? "bg-white text-sky-700 shadow-sm" : "text-slate-600 hover:bg-white/70"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {isDm && showDmBadge && (
                    <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive("/admin") ? "bg-white text-sky-700 shadow-sm" : "text-slate-600 hover:bg-white/70"
                }`}
              >
                管理
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            {!loading && user ? (
              <>
                <Link
                  href="/notifications"
                  className="relative rounded-full p-2 text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
                  aria-label="通知"
                >
                  <Bell className="h-5 w-5" />
                  {showUnreadBadge && (
                    <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-sky-500" />
                  )}
                </Link>
                <Link
                  href="/profile"
                  className="rounded-full p-2 text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
                  aria-label="プロフィール"
                >
                  <User className="h-5 w-5" />
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-full p-2 text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
                  aria-label="ログアウト"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : !loading ? (
              <Link href="/auth/login" className="btn-primary !px-4 !py-2">
                ログイン
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-sky-100 bg-white/95 backdrop-blur lg:hidden">
        <div className={`mx-auto grid h-16 max-w-screen-md px-2 ${isAdmin ? "grid-cols-6" : "grid-cols-5"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isDm = item.href === "/messages";
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition ${
                  active ? "text-sky-700" : "text-slate-500"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "text-sky-600" : "text-slate-500"}`} />
                <span>{item.label}</span>
                {isDm && showDmBadge && (
                  <span className="absolute right-5 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition ${
                isActive("/admin") ? "text-sky-700" : "text-slate-500"
              }`}
            >
              <User className={`h-5 w-5 ${isActive("/admin") ? "text-sky-600" : "text-slate-500"}`} />
              <span>管理</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}
