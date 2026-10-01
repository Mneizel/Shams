// engines/debunk.js
// ─────────────────────────────────────────────────────────────────────────────
// طبقةُ كشف الدجل — يُظهِرُ آلةَ كلِّ «لعبة عرافة» ويُسمّي الحيلةَ التي تقوم عليها.
// المصادر: البيان في الكوتشينة والفنجان، الدراسة في علم الفراسة، سحر هاروت وماروت،
// أحكام الحكيم ج٤، هداية العباد.
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import {
  TECHNIQUES, FANJAN_POSITIONS, FANJAN_SYMBOLS, FANJAN_METHOD_NOTE,
  IKHTILAJ, IKHTILAJ_NOTE, BACKGAMMON, BACKGAMMON_NOTE,
  KOTSHINA, KOTSHINA_SPREAD, KOTSHINA_NOTE, PARLOR,
  SOURCE_META, DEBUNK_NOTE,
} from "../data/debunk.data.js";

export function techniques() {
  return Object.entries(TECHNIQUES).map(([name, t]) => ({ name, ...t }));
}

// ── قراءةُ الفنجان ─────────────────────────────────────────────────
export function listFanjanSymbols() { return Object.keys(FANJAN_SYMBOLS); }
export function fanjanRead(symbol, position = "الجهة الرائقة") {
  const s = FANJAN_SYMBOLS[symbol];
  if (!s) throw new Error("رمزٌ غير معروف: " + symbol + " — استعمل listFanjanSymbols()");
  const pos = FANJAN_POSITIONS.includes(position) ? position : FANJAN_POSITIONS[0];
  return {
    symbol, position: pos, meaning: s[pos],
    technique: "تخيُّل الأشكال + عبارة بارنوم",
    method: FANJAN_METHOD_NOTE,
    source: SOURCE_META.bayan.title,
    trace: [
      `الرمز «${symbol}» في «${pos}» ⇒ «${s[pos]}» [البيان].`,
      "تفلُ القهوةِ نقشٌ عشوائيّ؛ «رؤيةُ» الرمز فيه تخيُّلُ أشكال، والمعنى عبارةُ بارنوم. أدِرِ الفنجانَ ⇒ رموزٌ أخرى.",
    ],
  };
}

// ── علمُ الاختلاج ──────────────────────────────────────────────────
export function listIkhtilaj() { return Object.keys(IKHTILAJ); }
export function ikhtilaj(part, side = "—") {
  const p = IKHTILAJ[part];
  if (!p) throw new Error("عضوٌ غير معروف: " + part + " — استعمل listIkhtilaj()");
  const key = p[side] != null ? side : Object.keys(p)[0];
  return {
    part, side: key, omen: p[key],
    alternatives: Object.entries(p).map(([k, v]) => ({ side: k, omen: v })),
    technique: "انحياز التأكيد + عبارة بارنوم",
    note: IKHTILAJ_NOTE,
    source: SOURCE_META.dirasa.title,
    trace: [
      `اختلاجُ «${part}»${key !== "—" ? " (" + key + ")" : ""} ⇒ «${p[key]}» [الدراسة في الفراسة].`,
      "رفّةُ العضلةِ تشنُّجٌ لا يحمل خبرًا؛ القوائمُ متضاربةٌ والزمنُ مفتوح ⇒ يُذكَر ما وافق ويُنسى ما خالف.",
    ],
  };
}

// ── زهرُ الطاولة ──────────────────────────────────────────────────
export function backgammon(die1, die2) {
  const a = Math.max(1, Math.min(6, die1 | 0)), b = Math.max(1, Math.min(6, die2 | 0));
  const sum = a + b;
  const doubled = a === b;
  return {
    dice: [a, b], sum, doubled,
    omen: BACKGAMMON[sum] || "—",
    extra: doubled ? "عددان متساويان ⇒ «تصلُ أخبارٌ من الخارج»" : null,
    timing: "«في مدّةِ قسمةِ أيّامٍ من تاريخ الكشف» — إطارٌ مطّاط.",
    technique: "عبارة بارنوم + انحياز التأكيد",
    note: BACKGAMMON_NOTE, source: SOURCE_META.bayan.title,
  };
}

// ── الكوتشينة ─────────────────────────────────────────────────────
export function listCards() { return Object.keys(KOTSHINA); }
export function kotshinaCard(card) {
  const m = KOTSHINA[card];
  if (!m) throw new Error("ورقةٌ غير معروفة: " + card + " — استعمل listCards()");
  return { card, meaning: m, spreadPositions: KOTSHINA_SPREAD, technique: "قراءة باردة + عبارة بارنوم",
    note: KOTSHINA_NOTE, source: SOURCE_META.bayan.title };
}

/** فردةٌ حتميّةٌ لسبع ورقاتٍ (فتحةُ ٧) من بذرةِ (اسم + سؤال + تاريخ). */
export function kotshinaSpread(name, question, when) {
  const seedStr = `${abjad.normalize(name || "")}|${String(question || "")}|${new Date(when || Date.now()).toISOString().slice(0, 10)}`;
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  const deck = Object.keys(KOTSHINA);
  const rnd = () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pool = [...deck];
  const draw = [];
  for (let i = 0; i < 7; i++) draw.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return {
    seed: seedStr,
    cards: KOTSHINA_SPREAD.map((pos, i) => ({ position: pos, card: draw[i], meaning: KOTSHINA[draw[i]] })),
    technique: "قراءة باردة + عبارة بارنوم",
    note: KOTSHINA_NOTE + " الفردةُ هنا حتميّةٌ من اسمك وسؤالك وتاريخ اليوم — لا خلطَ حقيقيّ.",
    source: SOURCE_META.bayan.title,
  };
}

// ── ألعابُ الحساب ────────────────────────────────────────────────
export function listParlor() { return Object.keys(PARLOR); }

/** حلُّ لعبةِ «الأشياء الثلاثة المخبَّأة»: أرقامُ جلوس حاملي الأشياء ١..٣. */
export function threeObjects(seatOfObj1, seatOfObj2, seatOfObj3) {
  const s1 = seatOfObj1 | 0, s2 = seatOfObj2 | 0, s3 = seatOfObj3 | 0;
  const h1 = (2 * s1 + 5) * 5;
  const h2 = h1 + s2;
  const h3 = h2 * 10;
  const h4 = h3 + s3;
  const answer = h4 - 250;
  const hundreds = Math.floor(answer / 100), tens = Math.floor((answer % 100) / 10), units = answer % 10;
  return {
    seats: { obj1: s1, obj2: s2, obj3: s3 },
    steps: { h1, h2, h3, h4, minus250: answer },
    recovered: { obj1: hundreds, obj2: tens, obj3: units },
    correct: hundreds === s1 && tens === s2 && units === s3,
    identity: PARLOR["الأشياء الثلاثة المخبَّأة"].identity,
    technique: "إكراه رياضيّ",
    source: PARLOR["الأشياء الثلاثة المخبَّأة"].source,
  };
}

/** شرحُ «أعجوبة المراتب التسع». */
export function ranksNineTrick() {
  const desc = 987654321, asc = 123456789;
  const diff = desc - asc; // 864197532
  const digitSum = String(diff).split("").reduce((a, d) => a + +d, 0);
  return {
    descending: desc, ascending: asc, difference: diff, digitSum,
    explain: PARLOR["أعجوبة المراتب التسع"].identity,
    technique: "إكراه رياضيّ",
    source: PARLOR["أعجوبة المراتب التسع"].source,
  };
}

export function parlor(id) {
  const p = PARLOR[id];
  if (!p) throw new Error("لعبةٌ غير معروفة: " + id);
  return { id, ...p };
}

// ── تحليلُ ادّعاءٍ ────────────────────────────────────────────────
/** يُخمِّنُ أيَّ حِيَلٍ يستعملها نصُّ ادّعاءٍ من كلماته. */
export function analyzeClaim(text) {
  const q = abjad.normalize(String(text || ""));
  const hits = [];
  const map = [
    ["قراءة باردة", ["ارى شخصا", "حرف اسمه", "شخص قريب منك", "اراك", "تفكر في"]],
    ["عبارة بارنوم", ["طيب القلب", "يساء فهمك", "طاقة", "خيبة", "تحب ان", "احيانا تشك"]],
    ["تخيُّل الأشكال", ["الفنجان", "التفل", "القهوة", "شكل طائر", "شكل وجه", "الغيوم"]],
    ["إكراه رياضيّ", ["اضرب", "اجمع", "اطرح", "فكر في رقم", "ضاعف"]],
    ["رشُّ الاحتمالات", ["وجع في", "او الظهر", "او الراس", "احدهم", "ربما"]],
    ["انحيازُ التأكيد", ["قريبا", "في هذا العام", "خلال ايام", "عما قريب"]],
  ];
  for (const [tech, kws] of map) if (kws.some((k) => q.includes(abjad.normalize(k)))) hits.push(tech);
  return {
    text: String(text || ""),
    techniques: hits.length ? hits.map((n) => ({ name: n, ...TECHNIQUES[n] })) : [],
    verdict: hits.length ? `يستعمل: ${hits.join("، ")}` : "لا كلماتٍ دالّةً — اطلبِ التفاصيل واكشف الآلة يدويًّا.",
    note: DEBUNK_NOTE,
  };
}

export const SOURCES = SOURCE_META;
export const NOTE = DEBUNK_NOTE;

export default {
  techniques,
  listFanjanSymbols, fanjanRead,
  listIkhtilaj, ikhtilaj,
  backgammon,
  listCards, kotshinaCard, kotshinaSpread,
  listParlor, parlor, threeObjects, ranksNineTrick,
  analyzeClaim,
  SOURCES, NOTE,
};
