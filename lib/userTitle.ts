export type UserTitle = {
  label: string;
  tone: string;
};

export const getUserTitle = (reviewsCount: number, likesReceived: number): UserTitle => {
  if (likesReceived >= 1000) {
    return { label: "レジェンド共感王", tone: "bg-amber-100 text-amber-700 border border-amber-200" };
  }
  if (reviewsCount >= 1000) {
    return { label: "レジェンドレビュー職人", tone: "bg-indigo-100 text-indigo-700 border border-indigo-200" };
  }
  if (likesReceived >= 100) {
    return { label: "共感王", tone: "bg-emerald-100 text-emerald-700 border border-emerald-200" };
  }
  if (reviewsCount >= 100) {
    return { label: "語り部マスター", tone: "bg-blue-100 text-blue-700 border border-blue-200" };
  }
  if (likesReceived >= 50) {
    return { label: "人気レビュアー", tone: "bg-cyan-100 text-cyan-700 border border-cyan-200" };
  }
  if (reviewsCount >= 50) {
    return { label: "レビュー職人", tone: "bg-sky-100 text-sky-700 border border-sky-200" };
  }
  if (likesReceived >= 10) {
    return { label: "注目ユーザー", tone: "bg-teal-100 text-teal-700 border border-teal-200" };
  }
  if (reviewsCount >= 10) {
    return { label: "新人レビュアー", tone: "bg-slate-100 text-slate-700 border border-slate-200" };
  }
  return { label: "はじめての投稿者", tone: "bg-gray-100 text-gray-700 border border-gray-200" };
};
