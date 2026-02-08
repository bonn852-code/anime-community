import { supabase } from "@/lib/supabase";
import { getUserTitle, type UserTitle } from "@/lib/userTitle";

export const fetchUserTitleMap = async (userIds: string[]): Promise<Record<string, UserTitle>> => {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};

  const [statsResult, likesResult] = await Promise.all([
    supabase.from("user_stats").select("user_id, reviews_count").in("user_id", ids),
    supabase.from("likes").select("reviews!inner(user_id)").in("reviews.user_id", ids),
  ]);

  const reviewsCountMap: Record<string, number> = {};
  (statsResult.data || []).forEach((row) => {
    reviewsCountMap[row.user_id as string] = (row.reviews_count as number) || 0;
  });

  const likesCountMap: Record<string, number> = {};
  (likesResult.data || []).forEach((row) => {
    const reviewUser = Array.isArray(row.reviews) ? row.reviews[0] : row.reviews;
    const reviewUserId = reviewUser?.user_id as string | undefined;
    if (!reviewUserId) return;
    likesCountMap[reviewUserId] = (likesCountMap[reviewUserId] || 0) + 1;
  });

  const titleMap: Record<string, UserTitle> = {};
  ids.forEach((id) => {
    titleMap[id] = getUserTitle(reviewsCountMap[id] || 0, likesCountMap[id] || 0);
  });
  return titleMap;
};
