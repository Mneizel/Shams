// engines/darj.js
// ─────────────────────────────────────────────────────────────────────────────
// «كتاب الدرج»: ما تدلُّ عليه الدرجةُ التي يقعُ فيها الطالعُ والنيّران وكلُّ كوكبٍ يومَ الميلاد.
// الدرجةُ الأولى = ٠°–١° من البرج (floor + 1). لكلِّ موضع: نعتُ الدرجة وطبعُها، وقولُ الكتابِ في ذلك الكوكبِ إن حلّها.
// حتميّ: نفسُ الخريطة ⇒ نفسُ النصوص.
// ─────────────────────────────────────────────────────────────────────────────

import { DEGREES, SIGN_INTRO, DARJ_SRC } from "../data/darj.data.js";

export const SRC = DARJ_SRC;

/** درجةُ موضعٍ في برجه: ٠–٠.٩٩ ⇒ ١ … ٢٩–٢٩.٩٩ ⇒ ٣٠ */
export function degreeNumber(degreeInSign) {
  return Math.min(30, Math.max(1, Math.floor(degreeInSign) + 1));
}

/** نصُّ درجةٍ بعينها، أو null إن أغفلها الناسخ */
export function at(sign, n) {
  const arr = DEGREES[sign];
  if (!arr) return null;
  const e = arr[n - 1];
  return e ? { sign, n, ...e } : null;
}

// أقوالُ الموتِ والقتل لا تُعرَضُ في القراءة (تبقى في البيانات وفي «الكشف»): حكمٌ قاطعٌ مخيفٌ من درجةٍ واحدة.
const GRIM = /يموت|يُقتل|يقتل|الموت|مات |قتل|لم يتنفّس|لم يعش|لا يعيشون|قصير المدّة|قِصر العمر|قصر العمر|قصير العمر|لم يطل عمره/;
export function displayText(text) {
  return (text || "").split("؛").map((p) => p.trim()).filter((p) => p && !GRIM.test(p)).join("؛ ");
}

/** درجاتُ المولد: الطالع، ثمّ الكواكبُ السبعة. لكلِّ كوكبٍ يُضمُّ قولُ الكتابِ فيه إن نصَّ عليه في تلك الدرجة. */
export function natal(sky) {
  const out = [];
  const asc = sky.ascendant;
  const an = degreeNumber(asc.degreeInSign);
  // «مَن وُلد بها» في الكتاب = مَن كانت طالعَه، فطبعُ الدرجةِ يُقرأ للطالعِ وحدَه؛ وللكواكبِ نعتُ الدرجةِ وقولُه في ذلك الكوكب
  const ae = at(asc.sign, an);
  out.push({ point: "الطالع", sign: asc.sign, n: an, entry: ae, text: ae ? displayText(ae.text) : "", planetNote: null });
  for (const [name, p] of Object.entries(sky.planets)) {
    const n = degreeNumber(p.degreeInSign);
    const e = at(p.sign, n);
    const note = e?.planets?.[name] || null;
    out.push({ point: name, sign: p.sign, n, entry: e, text: "", planetNote: note && !GRIM.test(note) ? note : null });
  }
  return { points: out, intro: SIGN_INTRO, src: SRC };
}

export default { degreeNumber, at, natal, displayText, SRC };
