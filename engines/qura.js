// engines/qura.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك القرعة والفأل — «قرعة الإمام جعفر الصادق» (الطوخي)
//
// عودٌ رُباعيٌّ على أوجهه «ا ب ج د»، يُرمى ثلاثَ مرّات ⇒ ثلاثيّةٌ ⇒ بابٌ من ٦٤
// فيه آيةٌ وفأل. الرميُ هنا حتميٌّ من بذرةٍ من (الاسم + الأمّ + السؤال + التاريخ)،
// فنفسُ المدخلاتِ تُعطي نفسَ القرعةِ أبدًا — وهذا وجهُ المسألة.
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import {
  FACES, OPENING_PRAYER, BOOK_INDEX, ANSWERS, QURA_NOTE, SOURCE_META,
} from "../data/qura.data.js";

// FNV-1a 32-bit على نقاط اليونيكود — بذرةٌ حتميّة.
function hashStr(s) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// mulberry32 — مولّدٌ عشوائيٌّ حتميّ من بذرة.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const B4 = { "ا": 0, "ب": 1, "ج": 2, "د": 3 };
/** رقمُ الباب: من فهرس الكتاب إن وُجِد، وإلا بترتيبٍ رباعيٍّ قياسيّ. */
export function babNumber(key) {
  if (BOOK_INDEX[key] != null) return { bab: BOOK_INDEX[key], from: "فهرس الكتاب" };
  const [a, b, c] = [...key];
  return { bab: B4[a] * 16 + B4[b] * 4 + B4[c] + 1, from: "ترتيبٌ رباعيٌّ قياسيّ (الفهرس الأصليّ باهتُ المسح)" };
}

/**
 * ضربُ القرعة.
 * @param {string} name    اسمُ السائل
 * @param {string} mother  اسمُ الأمّ
 * @param {string} question السؤال (نيّةُ القرعة)
 * @param {Date|string|number} [when=today] تاريخُ اليوم (يُؤخذ يومُه فقط)
 * @returns {{throws:string[], key:string, bab:number, verse?:string,
 *            fortune?:string, tone?:string, transcribed:boolean, trace:string[]}}
 */
export function cast(name, mother, question, when) {
  const nName = abjad.normalize(name || "");
  const nMother = abjad.normalize(mother || "");
  const q = String(question || "");
  const day = new Date(when || Date.now());
  const dayKey = `${day.getUTCFullYear()}-${day.getUTCMonth() + 1}-${day.getUTCDate()}`;
  const seedStr = `${nName}|${nMother}|${q}|${dayKey}`;
  const seed = hashStr(seedStr);
  const rnd = mulberry32(seed);

  const throws = [0, 1, 2].map(() => FACES[Math.floor(rnd() * 4)]);
  const key = throws.join("");
  const bn = babNumber(key);
  const ans = ANSWERS[key] || null;

  const trace = [
    `البذرة = «${seedStr}» ⇒ FNV = ${seed}`,
    `رميُ العود ٣ مرّات (حتميٌّ من البذرة) ⇒ ${throws.join(" ، ")} ⇒ الثلاثيّة «${key}»`,
    `الباب رقم ${bn.bab} (${bn.from}).`,
    ans ? `نصُّ الباب ${ans.bab} منقولٌ: ${ans.tone}.` : `الباب ${bn.bab} موجودٌ في الكتاب، ولم يُنقَل نصُّه من هذا المسح.`,
    "لاحظْ: لم يُرمَ عودٌ حقيقيّ؛ الثلاثيّةُ دالّةٌ حتميّةٌ في اسمِك واسمِ أمّك وسؤالِك وتاريخِ يومِ الاستشارة — كرميةٍ فعليّةٍ جديدةٍ في كلِّ جلسة. فسؤالُك اليوم يُعطي نفسَ البابِ لو أعدتَه اليومَ نفسَه (لم ترمِ العودَ مرّتين)، لكنّه يُعطي بابًا آخرَ لو رجعتَ تسألُه غدًا — تمامًا كما لا يُعيد الرامي الحقيقيُّ نفسَ الرمية. والأبوابُ عباراتٌ تصدُقُ على كلّ حال.",
  ];

  return {
    input: { name: nName, mother: nMother, question: q, day: dayKey },
    prayer: OPENING_PRAYER,
    throws, key,
    bab: bn.bab, babFrom: bn.from,
    verse: ans?.verse || null,
    fortune: ans?.fortune || null,
    tone: ans?.tone || null,
    transcribed: !!ans,
    note: QURA_NOTE,
    source: SOURCE_META.title,
    trace,
  };
}

export const SOURCE = SOURCE_META;
export default { cast, babNumber, SOURCE, FACES };
