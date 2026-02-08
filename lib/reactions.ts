export type ReactionType = "heart" | "fire" | "wow" | "cry" | "agree";

export const REACTIONS: Array<{
  type: ReactionType;
  label: string;
  emoji: string;
  activeClass: string;
}> = [
  { type: "heart", label: "刺さった", emoji: "❤️", activeClass: "bg-rose-100 text-rose-700 border-rose-200" },
  { type: "fire", label: "熱い", emoji: "🔥", activeClass: "bg-orange-100 text-orange-700 border-orange-200" },
  { type: "wow", label: "神", emoji: "✨", activeClass: "bg-violet-100 text-violet-700 border-violet-200" },
  { type: "cry", label: "泣いた", emoji: "😭", activeClass: "bg-sky-100 text-sky-700 border-sky-200" },
  { type: "agree", label: "わかる", emoji: "👏", activeClass: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

export const createReactionCountMap = () =>
  REACTIONS.reduce((acc, item) => {
    acc[item.type] = 0;
    return acc;
  }, {} as Record<ReactionType, number>);
