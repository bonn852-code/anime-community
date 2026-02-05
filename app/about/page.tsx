export default function AboutPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">このサイトについて</h1>
        <p className="text-gray-600">AnimeComはアニメの感想を共有し、交流できるコミュニティです。</p>
      </div>

      <div className="card p-6 md:p-8 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">できること</h2>
        <ul className="text-gray-700 space-y-2">
          <li>アニメの感想投稿・コメント・いいね</li>
          <li>作品の評価やハッシュタグ検索</li>
          <li>ユーザー検索とフォロー</li>
          <li>プロフィール編集とお気に入り登録</li>
        </ul>
      </div>

      <div className="card p-6 md:p-8 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">お願い</h2>
        <p className="text-gray-700">
          作品やユーザーへのリスペクトを大切に、気持ちよく交流できる場づくりにご協力ください。
        </p>
      </div>
    </div>
  );
}
