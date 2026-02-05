-- AnimeHub Database Setup Script
-- Supabaseダッシュボードで実行してください

-- ============================================
-- テーブル作成
-- ============================================

-- ユーザーテーブル (Supabase Authと連携)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- アニメ作品テーブル
CREATE TABLE IF NOT EXISTS public.animes (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  season VARCHAR(20),
  year INTEGER,
  genre TEXT[],
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 好きなアニメ（プロフィール用）
CREATE TABLE IF NOT EXISTS public.favorite_animes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  anime_id BIGINT REFERENCES public.animes(id) ON DELETE CASCADE,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- アニメ評価
CREATE TABLE IF NOT EXISTS public.anime_ratings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  anime_id BIGINT REFERENCES public.animes(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- 感想投稿
CREATE TABLE IF NOT EXISTS public.reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  anime_id BIGINT REFERENCES public.animes(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  has_spoiler BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- コメント
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  review_id BIGINT REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- いいね
CREATE TABLE IF NOT EXISTS public.likes (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  review_id BIGINT REFERENCES public.reviews(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

-- フォロー
CREATE TABLE IF NOT EXISTS public.follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- 通知
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  review_id BIGINT REFERENCES public.reviews(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理者ユーザー
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- お問い合わせ
CREATE TABLE IF NOT EXISTS public.inquiries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  email TEXT,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 管理設定
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id INTEGER PRIMARY KEY,
  last_sync_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- インデックス作成
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_animes_title_unique ON public.animes (LOWER(title));
CREATE INDEX IF NOT EXISTS idx_reviews_anime_id ON public.reviews(anime_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_review_id ON public.comments(review_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_review_id ON public.likes(review_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_favorite_animes_user_id ON public.favorite_animes(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_animes_display_order ON public.favorite_animes(user_id, display_order);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- ============================================
-- Row Level Security (RLS) ポリシー
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_animes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anime_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- users テーブルのポリシー
CREATE POLICY "users_select_policy" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_update_policy" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users_insert_policy" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- animes テーブルのポリシー
CREATE POLICY "animes_select_policy" ON public.animes FOR SELECT USING (true);
CREATE POLICY "animes_insert_policy" ON public.animes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- favorite_animes テーブルのポリシー
CREATE POLICY "favorite_animes_select_policy" ON public.favorite_animes FOR SELECT USING (true);
CREATE POLICY "favorite_animes_all_policy" ON public.favorite_animes FOR ALL USING (auth.uid() = user_id);

-- anime_ratings テーブルのポリシー
CREATE POLICY "anime_ratings_select_policy" ON public.anime_ratings FOR SELECT USING (true);
CREATE POLICY "anime_ratings_all_policy" ON public.anime_ratings FOR ALL USING (auth.uid() = user_id);

-- reviews テーブルのポリシー
CREATE POLICY "reviews_select_policy" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_policy" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_policy" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reviews_delete_policy" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- comments テーブルのポリシー
CREATE POLICY "comments_select_policy" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_policy" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_policy" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- likes テーブルのポリシー
CREATE POLICY "likes_select_policy" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_policy" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_policy" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- follows テーブルのポリシー
CREATE POLICY "follows_select_policy" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_policy" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_policy" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- notifications テーブルのポリシー
CREATE POLICY "notifications_select_policy" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_policy" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_policy" ON public.notifications FOR INSERT WITH CHECK (true);

-- admin_users テーブルのポリシー
CREATE POLICY "admin_users_select_policy" ON public.admin_users FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admin_users_insert_policy" ON public.admin_users FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin_users_delete_policy" ON public.admin_users FOR DELETE USING (auth.uid() = user_id);

-- inquiries テーブルのポリシー
CREATE POLICY "inquiries_select_policy" ON public.inquiries FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
);
CREATE POLICY "inquiries_insert_policy" ON public.inquiries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "inquiries_update_policy" ON public.inquiries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
);

-- admin_settings テーブルのポリシー
CREATE POLICY "admin_settings_select_policy" ON public.admin_settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
);
CREATE POLICY "admin_settings_update_policy" ON public.admin_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
);
CREATE POLICY "admin_settings_insert_policy" ON public.admin_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
);

-- ============================================
-- トリガー関数
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_anime_ratings_updated_at ON public.anime_ratings;
CREATE TRIGGER update_anime_ratings_updated_at 
BEFORE UPDATE ON public.anime_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at 
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Storage（画像アップロード用）
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('anime-images', 'anime-images', true)
ON CONFLICT (id) DO NOTHING;

-- avatars バケットのポリシー
CREATE POLICY "avatars_select_policy" ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_policy" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "avatars_update_policy" ON storage.objects
FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "avatars_delete_policy" ON storage.objects
FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- anime-images バケットのポリシー
CREATE POLICY "anime_images_select_policy" ON storage.objects
FOR SELECT
USING (bucket_id = 'anime-images');

CREATE POLICY "anime_images_insert_policy" ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'anime-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "anime_images_update_policy" ON storage.objects
FOR UPDATE
USING (bucket_id = 'anime-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "anime_images_delete_policy" ON storage.objects
FOR DELETE
USING (bucket_id = 'anime-images' AND auth.uid() IS NOT NULL);

-- ============================================
-- 初期データ（サンプル）
-- ============================================

INSERT INTO public.animes (title, title_en, season, year, genre, description) VALUES
('素晴らしいアニメ作品', 'Amazing Anime', '2024-winter', 2024, ARRAY['アクション', 'ファンタジー'], '主人公が異世界に転生し、仲間と共に世界を救う冒険に出る物語'),
('映像美アニメ', 'Beautiful Animation', '2024-spring', 2024, ARRAY['日常', '青春'], '高校生たちの日常を美しい映像で描いた作品'),
('サスペンスアニメ', 'Suspense Anime', '2024-summer', 2024, ARRAY['ミステリー', 'サスペンス'], '謎に満ちた事件を解決していくミステリー作品'),
('感動の物語', 'Emotional Story', '2024-fall', 2024, ARRAY['ドラマ', '感動'], '心温まる家族の絆を描いた感動作'),
('コメディアニメ', 'Comedy Anime', '2024-winter', 2024, ARRAY['コメディ', '日常'], '笑いあり涙ありの学園コメディ'),
('SFアドベンチャー', 'SF Adventure', '2024-spring', 2024, ARRAY['SF', 'アドベンチャー'], '未来を舞台にしたSFアドベンチャー')
ON CONFLICT DO NOTHING;

-- ============================================
-- ビュー作成（集計用）
-- ============================================

CREATE OR REPLACE VIEW public.review_stats AS
SELECT
    r.id AS review_id,
    r.title,
    r.content,
    r.has_spoiler,
    r.created_at,
    r.user_id,
    r.anime_id,
    u.username,
    u.display_name,
    u.avatar_url,
    a.title AS anime_title,
    COUNT(DISTINCT l.id) AS likes_count,
    COUNT(DISTINCT c.id) AS comments_count
FROM public.reviews r
LEFT JOIN public.users u ON r.user_id = u.id
LEFT JOIN public.animes a ON r.anime_id = a.id
LEFT JOIN public.likes l ON r.id = l.review_id
LEFT JOIN public.comments c ON r.id = c.review_id
GROUP BY r.id, u.id, a.id;

CREATE OR REPLACE VIEW public.anime_stats AS
SELECT
    a.id AS anime_id,
    a.title,
    a.title_en,
    a.season,
    a.year,
    a.genre,
    a.image_url,
    AVG(ar.rating) AS average_rating,
    COUNT(DISTINCT r.id) AS reviews_count
FROM public.animes a
LEFT JOIN public.anime_ratings ar ON a.id = ar.anime_id
LEFT JOIN public.reviews r ON a.id = r.anime_id
GROUP BY a.id;

CREATE OR REPLACE VIEW public.user_stats AS
SELECT
    u.id AS user_id,
    u.username,
    u.display_name,
    u.bio,
    u.avatar_url,
    u.created_at,
    COUNT(DISTINCT r.id) AS reviews_count,
    COUNT(DISTINCT f1.id) AS followers_count,
    COUNT(DISTINCT f2.id) AS following_count
FROM public.users u
LEFT JOIN public.reviews r ON u.id = r.user_id
LEFT JOIN public.follows f1 ON u.id = f1.following_id
LEFT JOIN public.follows f2 ON u.id = f2.follower_id
GROUP BY u.id;
