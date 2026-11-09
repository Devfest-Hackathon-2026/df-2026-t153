const DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

// 1..31 as kanji numerals the way a diary would write them (十一, 二十, 三十一)
export function kanjiNumber(n: number): string {
  if (n < 1 || n > 99 || !Number.isInteger(n)) return String(n);
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensPart = tens === 0 ? "" : tens === 1 ? "十" : `${DIGITS[tens]}十`;
  return `${tensPart}${DIGITS[ones]}`;
}

/** 十一月九日 */
export function kanjiDate(d: Date): string {
  return `${kanjiNumber(d.getMonth() + 1)}月${kanjiNumber(d.getDate())}日`;
}
