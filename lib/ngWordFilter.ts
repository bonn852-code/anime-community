const NG_WORDS = [
  // TODO: Add project-specific NG words here.
  '死ね',
  'バカ',
  'くそ',
  'うざい',
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
