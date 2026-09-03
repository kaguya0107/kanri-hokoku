/** 濁点・半濁点・小書きを清音に寄せて50音行を求める（B-09） */
const DAKU: Record<string, string> = {
  が:"か", ぎ:"き", ぐ:"く", げ:"け", ご:"こ", ざ:"さ", じ:"し", ず:"す", ぜ:"せ", ぞ:"そ",
  だ:"た", ぢ:"ち", づ:"つ", で:"て", ど:"と", ば:"は", び:"ひ", ぶ:"ふ", べ:"へ", ぼ:"ほ",
  ぱ:"は", ぴ:"ひ", ぷ:"ふ", ぺ:"へ", ぽ:"ほ",
  ぁ:"あ", ぃ:"い", ぅ:"う", ぇ:"え", ぉ:"お", っ:"つ", ゃ:"や", ゅ:"ゆ", ょ:"よ",
};

const ROWS: Record<string, string> = {
  あ:"あいうえお", か:"かきくけこ", さ:"さしすせそ", た:"たちつてと", な:"なにぬねの",
  は:"はひふへほ", ま:"まみむめも", や:"やゆよ", ら:"らりるれろ", わ:"わをん",
};

export const KANA_ROWS = Object.keys(ROWS);

/** カタカナ・全角スペース等を含む読みを正規化してひらがなに寄せる */
export function normalizeKana(input: string): string {
  return input
    .trim()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s　]/g, "");
}

export function kanaRow(kana: string): string {
  const n = normalizeKana(kana);
  let c = n.charAt(0);
  if (DAKU[c]) c = DAKU[c];
  for (const [row, chars] of Object.entries(ROWS)) if (chars.includes(c)) return row;
  return "";
}
