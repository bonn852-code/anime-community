'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useFirstPostPending(userId?: string) {
  const [isFirstPostPending, setIsFirstPostPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    if (!userId) {
      setIsFirstPostPending(false);
      setLoading(false);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      setIsFirstPostPending((count || 0) === 0);
    } catch (error) {
      console.error('初投稿ステータス取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`first-post-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews', filter: `user_id=eq.${userId}` },
        fetchStatus
      )
      .subscribe();

    const onChanged = () => fetchStatus();
    window.addEventListener('reviews:changed', onChanged as EventListener);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('reviews:changed', onChanged as EventListener);
    };
  }, [userId, fetchStatus]);

  return {
    isFirstPostPending,
    loading,
    refresh: fetchStatus,
  };
}

