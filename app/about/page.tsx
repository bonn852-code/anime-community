export default function AboutPage() {
  return (
    <div className="space-y-10">
      <div className="card p-8 md:p-10 bg-gradient-to-br from-sky-50 via-white to-indigo-50">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">このサイトについて</h1>
        <p className="text-gray-600 text-lg">
          AniWorldはアニメの感想を共有し、同じ作品が好きな仲間と繋がれるコミュニティです。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <span className="badge bg-sky-100 text-sky-700">感想投稿</span>
          <span className="badge bg-blue-100 text-blue-700">評価・検索</span>
          <span className="badge bg-purple-100 text-purple-700">フォロー</span>
          <span className="badge bg-emerald-100 text-emerald-700">DM</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-6 md:p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">できること</h2>
          <ul className="text-gray-700 space-y-2">
            <li>アニメの感想投稿・コメント・いいね</li>
            <li>作品の評価やハッシュタグ検索</li>
            <li>ユーザー検索とフォロー</li>
            <li>プロフィール編集とお気に入り登録</li>
            <li>アニメ視聴リスト（見たい / 見てる / 見た / 中断）</li>
            <li>投稿数やいいね獲得数に応じたバッジ</li>
          </ul>
        </div>

        <div className="card p-6 md:p-8 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">安心・安全への取り組み</h2>
          <ul className="text-gray-700 space-y-2">
            <li>NGワードは自動で伏字</li>
            <li>リスペクトを大切にしたコミュニティ運営</li>
            <li>作品やユーザーへの誹謗中傷はお控えください</li>
          </ul>
        </div>
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
