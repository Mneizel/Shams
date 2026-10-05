// engines/blend.js
// ─────────────────────────────────────────────────────────────────────────────
// المزجُ الموزونُ بين المصادر — دالّتان مشتركتان تستعملهما المحرّكات التي تجمع
// أكثرَ من كتاب (الجفر، الرمل، ...). كلُّ مصدرٍ { weight } يُضاف بوزنه.
//   weightedMean: متوسّطُ قيمةٍ عدديّة (ميل/درجة) موزونًا.
//   weightedTally: مجموعُ الأوزان لكلّ جوابٍ متقطّع (حرف/شكل) والأثقلُ منها.
// ─────────────────────────────────────────────────────────────────────────────

/** متوسّطٌ موزون: items[] و value(item) ⇒ رقم؛ الوزنُ item.weight. */
export function weightedMean(items, value = (x) => x.value) {
  let num = 0, den = 0;
  for (const it of items) { num += value(it) * it.weight; den += it.weight; }
  return den ? num / den : 0;
}

/** مجموعُ الأوزان لكلّ مفتاح، والمفتاحُ الأثقل (التعادلُ يُفصَل بـ tieBreak). */
export function weightedTally(items, key = (x) => x.key, tieBreak = () => 0) {
  const tally = {};
  for (const it of items) { const k = key(it); tally[k] = (tally[k] || 0) + it.weight; }
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1] || tieBreak(a[0], b[0]))[0];
  return { tally, top: top ? top[0] : null, topWeight: top ? top[1] : 0 };
}

export default { weightedMean, weightedTally };
