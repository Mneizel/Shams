// engines/manazil.js
// ─────────────────────────────────────────────────────────────────────────────
// منازل القمر الـ٢٨ للاختيار: متى يدخلُ القمرُ كلَّ منزلةٍ في الأيّام القادمة، ومنزلةُ القمر يومَ المولد.
// المادّةُ (اسمُ المنزلة، ما تصلحُ له، روحانيّتُها، قولُ الكتاب) من falak.moonMansion — أي من
// «شمس المعارف الكبرى» كما هي في data/mansions-source.data.js؛ هنا الحسابُ الزمنيُّ وحده.
// ─────────────────────────────────────────────────────────────────────────────

import falak from "./falak.js";

const HOUR = 3600e3;

/**
 * لكلّ منزلةٍ من الـ٢٨: أوّلُ دخولٍ للقمر إليها بعد `from` وخروجُه منها (خطوةُ ساعةٍ ثمّ تدقيقٌ بالدقيقة).
 * القمرُ يدورُ المنازلَ كلَّها في نحو ٢٧٫٣ يومًا، فنافذةُ ٢٩ يومًا تغطّيها.
 * @returns [{ number, name, work, roohaniyya, sourceNote, enter: Date, leave: Date, now: boolean }]
 */
export function calendar(from = new Date(), days = 29) {
  const t0 = new Date(from).getTime();
  const at = (t) => falak.moonMansion(new Date(t));
  const first = at(t0);
  const out = new Map();
  out.set(first.number, { ...pick(first), enter: null, leave: null, now: true });
  let prev = first.number;
  for (let t = t0 + HOUR; t <= t0 + days * 24 * HOUR; t += HOUR) {
    const m = at(t);
    if (m.number === prev) continue;
    // تدقيقُ لحظة الانتقال بالدقيقة داخل الساعة السابقة
    let lo = t - HOUR, hi = t;
    while (hi - lo > 60e3) { const mid = (lo + hi) / 2; if (at(mid).number === prev) lo = mid; else hi = mid; }
    const cur = out.get(prev); if (cur && !cur.leave) cur.leave = new Date(hi);
    if (!out.has(m.number)) out.set(m.number, { ...pick(m), enter: new Date(hi), leave: null, now: false });
    prev = m.number;
  }
  return [...out.values()].sort((a, b) => a.number - b.number);
}

/** منزلةُ القمر يومَ المولد. إن جُهلت الساعة نُظر إلى أوّل اليوم وآخره: قد يكون القمرُ انتقل فيه بين منزلتين. */
export function natal(birth, timeKnown = true) {
  const b = new Date(birth);
  if (timeKnown) return { ...pick(falak.moonMansion(b)), alt: null };
  const d0 = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  const a = falak.moonMansion(new Date(d0)), z = falak.moonMansion(new Date(d0 + 24 * HOUR - 60e3));
  return { ...pick(falak.moonMansion(b)), alt: a.number === z.number ? null : [pick(a), pick(z)] };
}

function pick(m) {
  return { number: m.number, name: m.name, work: m.work, roohaniyya: m.roohaniyya, sourceNote: m.sourceNote };
}

export default { calendar, natal };
