'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkSuspended = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('is_suspended')
          .eq('id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (data?.is_suspended) {
          localStorage.setItem('suspension_message', 'このアカウントは停止されています。');
          await supabase.auth.signOut();
          setUser(null);
        }
      } catch (error) {
        console.error('アカウント状態確認エラー:', error);
      }
    };

    checkSuspended();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
