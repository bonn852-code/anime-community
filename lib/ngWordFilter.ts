const NG_WORDS = [
  // Core abusive / harassment words (JP)
  '死ね',
  'しね',
  '消えろ',
  'ころす',
  '殺す',
  '殺してやる',
  'バカ',
  'ばか',
  '馬鹿',
  'あほ',
  'アホ',
  'ボケ',
  'ぼけ',
  'カス',
  'かす',
  'ゴミ',
  'ごみ',
  'クズ',
  'くず',
  'くそ',
  'クソ',
  'きもい',
  'キモい',
  'きしょい',
  'キショい',
  'うんこ',
  'ちんかす',
  'ぶっころす',
  'ぶっ殺す',
  '殴るぞ',
  '晒すぞ',
  '特定する',
  '住所晒す',
  '通報して潰す',
  '地雷女',
  '地雷男',
  'メンヘラ',
  'ブス',
  'デブ',
  'ハゲ',
  'ガイジ',
  'うざい',
  'うぜぇ',
  'うぜえ',
  // EN (basic)
  'kill yourself',
  'kys',
  'idiot',
  'stupid',
  'moron',
  'shut up',
  'f**k',
  'fuck',
  'bitch',
  'asshole',
];

export function maskNgWords(input: string) {
  if (!input) return input;
  let output = input;
  NG_WORDS.forEach((word) => {
    if (!word.trim()) return;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    output = output.replace(regex, (match) => '*'.repeat(match.length));
  });
  return output;
}
