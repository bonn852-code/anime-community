'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().finally(() => {
      router.replace('/');
      router.refresh();
    });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-gray-600">
      ログイン処理中...
    </div>
  );
}
