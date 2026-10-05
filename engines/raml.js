// engines/raml.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك علم الرمل (geomancy) — مزجٌ موزونٌ من عدّة مصادر:
//   «ميزان العدل في أحكام الرمل» (ملحق شمس المعارف) — الحكم والتسكين.
//   «الفلك المشحون في علم الرمل المصون» للنِّزْوي — الطبائع، الغلبة، التوقيت،
//     ثابت/منقلب، متحرّك/ساكن، عناصر البيوت العُمانيّة.
//   الأصل الزناتيّ — أسماء الأشكال المشرقيّة والمغربيّة وطرق التسكين.
//
// يبني «الطالع»: أربع أمّهات ← أربع بنات ← أربع منقولات (حفدة) ← شاهدان ←
// قاضٍ ← سهم القسمة، ثم يُسكِّن البيوت، ويحكم على المسألة بـ:
//   طبعِ شكلِ بيت المسألة + طبعِ القاضي + نصفِ طبعِ كلِّ شاهد
//   + موافقةِ عنصرِ الشكل لعنصرِ البيت (تُحسَب مرّتين: نظامٌ فلكيٌّ ونظامٌ عُمانيّ ثم تُمزَج)
//   + نظرِ الطالعِ إلى بيتِ المسألة (تثليث/تسديس/تربيع/مقابلة).
// ثم يُقدَّر التوقيت من عنصرِ الشكل وعددِ نقاطه.
//
// حتميّ بالكامل: من بذرة (اسم/أمّ/سؤال/وقت) نولّد نفس الطالع دائمًا؛ أو تُمرَّر
// ١٦ «ضربة» يدويًّا. لا رملَ ولا غيب — كلّه جمعُ أنماطٍ من بذرةٍ ثابتة.
// ─────────────────────────────────────────────────────────────────────────────

import { FIGURE_NATURE as ISK_NATURE, ISKANDARI_SRC } from "../data/raml-iskandari.data.js";
import { NAFHAT_HOUSES, NAFHAT_NAMES, NAFHAT_SRC } from "../data/raml-nafhat.data.js";
import abjad from "./abjad.js";
import { weightedMean } from "./blend.js";
import tukhiRaml from "./raml-tukhi.js";
import {
  FIGURES, HOUSES, TOPIC_HOUSE,
  HOUSE_ELEMENTS, ELEMENTS, ELEMENT_VICTORY, ELEMENT_FRIENDS, PLANET_OPPOSITION,
  FIGURE_IN_HOUSE_OVERRIDES, HOUSE_ASPECTS, TASKIN16_EXTRA, TASKIN_METHODS, SOURCES_META,
  HOUSES16, HOUSE_MNEMONIC, HOUSES16_NOTE,
} from "../data/raml.data.js";
import {
  THREE_PARTS, MIZAN_DARB_RULE, MUTHALLATH_LORE, MUTHALLATH_NOTE, SOURCE_META as MUTHALLATH_SRC,
} from "../data/raml-muthallath.data.js";

const BY_ROWS = new Map(FIGURES.map((f) => [f.rows.join(""), f]));
const BY_ID = new Map(FIGURES.map((f) => [f.id, f]));

/** جمع شكلين: صفًّا بصفّ، الزوجيّة تُعطي ٢ والفرديّة تُعطي ١. */
export function add(f1, f2) {
  const rows = f1.rows.map((v, i) => ((v + f2.rows[i]) % 2 === 0 ? 2 : 1));
  return BY_ROWS.get(rows.join(""));
}

export function figureByRows(rows) {
  return BY_ROWS.get(rows.join("")) || null;
}
export function figureById(id) {
  return BY_ID.get(id) || null;
}

// ── خصائصُ الشكلِ المشتقّة ─────────────────────────────────────────────
/**
 * @returns {{points:number, motion:string, stability:string, abdah:number,
 *            timeUnit:string, element:string}}
 */
export function figureProps(fig) {
  const f = typeof fig === "string" ? BY_ID.get(fig) : fig;
  const points = f.rows.reduce((s, v) => s + v, 0); // ٤..٨
  // متحرّك: النارُ والهواءُ مفتوحان (فردة) — «ضاحك متحرّك»؛ وإلّا «باكٍ ساكن».
  const motion = f.rows[0] === 1 && f.rows[1] === 1 ? "متحرّك" : "ساكن";
  // منقلب: أوّلُه وآخرُه فردٌ ؛ ثابت: أوّلُه وآخرُه زوجٌ ؛ وإلّا متوسّط.
  const stability =
    f.rows[0] === 1 && f.rows[3] === 1 ? "منقلب" :
    f.rows[0] === 2 && f.rows[3] === 2 ? "ثابت" : "متوسّط";
  // عددُ أبدح: نار=١ هواء=٢ ماء=٤ تراب=٨ لكلِّ صفٍّ فردٍ.
  const abdah = [1, 2, 4, 8].reduce((s, w, i) => s + (f.rows[i] === 1 ? w : 0), 0);
  return { points, motion, stability, abdah, timeUnit: ELEMENTS[f.element].time, element: f.element };
}

/** الغالبُ عند تعارضِ عنصرين، أو null عند التعادل. */
export function elementVictor(a, b) {
  for (const [w, l] of ELEMENT_VICTORY) {
    if (a === w && b === l) return a;
    if (b === w && a === l) return b;
  }
  return null;
}

/** هل الشكلان صديقان (عنصرُهما في فريقٍ واحد)؟ */
export function areFriends(f1, f2) {
  const a = (typeof f1 === "string" ? BY_ID.get(f1) : f1).element;
  const b = (typeof f2 === "string" ? BY_ID.get(f2) : f2).element;
  if (a === b) return true;
  return ELEMENT_FRIENDS.some((p) => p.includes(a) && p.includes(b));
}

/** تضادٌّ كوكبيّ صريح بين شكلين. */
export function arePlanetOpposed(f1, f2) {
  const a = (typeof f1 === "string" ? BY_ID.get(f1) : f1).planet;
  const b = (typeof f2 === "string" ? BY_ID.get(f2) : f2).planet;
  return PLANET_OPPOSITION.some((p) => p.includes(a) && p.includes(b));
}

export function houseElement(n, system = "standard") {
  return (HOUSE_ELEMENTS[system] || HOUSE_ELEMENTS.standard)[n];
}

/**
 * دلالةُ شكلٍ في بيتٍ. تُرجع نصًّا: تخصيصٌ صريحٌ إن وُجد، وإلّا تُركَّب آليًّا
 * من طبعِ الشكلِ وموافقةِ العنصرِ وحركتِه وثباتِه وموضوعِ البيت.
 */
export function figureInHouse(fig, houseNo, opt = {}) {
  const f = typeof fig === "string" ? BY_ID.get(fig) : fig;
  const key = `${f.id}@${houseNo}`;
  if (FIGURE_IN_HOUSE_OVERRIDES[key]) return FIGURE_IN_HOUSE_OVERRIDES[key];
  const house = HOUSES[houseNo - 1];
  const sys = opt.houseSystem === "omani" ? "omani" : "standard";
  const he = houseElement(houseNo, sys);
  const harmony =
    f.element === he ? "موافقٌ لعنصرِ البيت (يجري الأمرُ سلِسًا)" :
    areFriends(f, { element: he }) ? "مُصادقٌ لعنصرِ البيت (بلا نزاعٍ يُذكَر)" :
    "مخالفٌ لعنصرِ البيت (فيه ممانعةٌ وعُسر)";
  const temper =
    f.nature === "سعد" ? "بخيرٍ وقبول" :
    f.nature === "نحس" ? "بشرٍّ أو تعطيل" : "بحسبِ ما يُجاوِرُه";
  const p = figureProps(f);
  const speed = p.motion === "متحرّك" ? "سريعُ الوقوع" : "بطيءُ الوقوع";
  const dur = p.stability === "ثابت" ? "ثابتُ الأثر" : p.stability === "منقلب" ? "سريعُ الزوال" : "متوسّطُ البقاء";
  return `${f.ar} في «${house.name}»: يقعُ الأمرُ ${temper}، وهو ${harmony}؛ ${speed}، ${dur}. ` +
    `أصلُ الشكل: ${f.meaning}`;
}

/** دلالةُ الشكلِ في البيت عند «نفحات الأسرار» (مصدرٌ ثانٍ مستقلّ، بنصِّه)؛ null إن لم يُنقل ذلك البيت. */
export function figureInHouseNafhat(fig, houseNo) {
  const f = typeof fig === "string" ? BY_ID.get(fig) : fig;
  const t = NAFHAT_HOUSES[f?.id]?.[String(houseNo)];
  return t ? { text: t, name: NAFHAT_NAMES[f.id], src: NAFHAT_SRC } : null;
}

/** تقديرُ زمنِ الوقوع من عنصرِ الشكلِ وعددِ نقاطه، ومن «مدّة» المثلث إن وُجدت. */
export function timingFor(fig) {
  const f = typeof fig === "string" ? BY_ID.get(fig) : fig;
  const p = figureProps(f);
  const lore = MUTHALLATH_LORE[f.id];
  return {
    unit: p.timeUnit, magnitude: p.points,
    text: `نحوَ ${toAr(p.points)} ${p.timeUnit}`,
    muthallath: lore?.duration ? `مدّةُ «${f.ar}» في المثلث: ${lore.duration}` : null,
  };
}

/** نظرُ الطالع (البيت ١) إلى بيتِ المسألة. */
export function aspectToHouse(houseNo) {
  return HOUSE_ASPECTS[houseNo] || "لا نظرَ";
}
function aspectScore(houseNo) {
  const a = HOUSE_ASPECTS[houseNo] || "";
  if (a.includes("تثليث")) return 0.5;
  if (a.includes("تسديس")) return 0.25;
  if (a.includes("تربيع")) return -0.25;
  if (a.includes("مقابلة")) return -0.5;
  return 0;
}

// ── مولّد عشوائيّ حتميّ ────────────────────────────────────────────────
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * أربع أمّهات من بذرة. البذرة تُبنى من جُمّل الاسم + الأم + السؤال + مكوّنات الوقت.
 * @returns {{mothers:object[], lines:number[], seedNum:number}}
 */
/**
 * أربع أمّهات من بذرةٍ حتميّة. ميزانُ الرمل (مجموعُ النقاط) يجب أن يكون زوجًا؛
 * إن جاء فردًا فالطالعُ فاسدٌ عند أهل الصناعة ويُعادُ الضربُ فورًا — لا يُعتَمَد.
 * فنُعيد الضربَ آليًّا (ببذرةٍ متسلسلةٍ حتميّة) حتى يصحّ الميزان، ونُثبت عددَ الإعادات.
 */
export function mothersFromSeed({ name = "", mother = "", question = "", when } = {}) {
  const d = when ? new Date(when) : new Date();
  const base = [
    abjad.jummal(name), abjad.jummal(mother), abjad.jummal(question),
    d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()
  ].join("|");
  const MAX_REDO = 8;
  for (let attempt = 0; attempt <= MAX_REDO; attempt++) {
    const seedStr = attempt === 0 ? base : `${base}|إعادة${attempt}`;
    const seedNum = hashStr(seedStr);
    const rnd = mulberry32(seedNum);
    const lines = Array.from({ length: 16 }, () => (Math.floor(rnd() * 16) + 1) % 2 === 0 ? 2 : 1);
    const pointsTotal = lines.reduce((a, v) => a + v, 0);
    if (pointsTotal % 2 === 0 || attempt === MAX_REDO) {
      const mothers = [0, 1, 2, 3].map((k) => figureByRows(lines.slice(k * 4, k * 4 + 4)));
      return { mothers, lines, seedNum, seedStr, redoCount: attempt, forcedInvalid: pointsTotal % 2 !== 0 };
    }
  }
}

/** أربع أمّهات من ١٦ ضربة يدويّة (كل ضربة عددٌ؛ تُؤخذ زوجيّتها). */
export function mothersFromTaps(taps) {
  if (!Array.isArray(taps) || taps.length !== 16) throw new Error("مطلوب ١٦ ضربة.");
  const lines = taps.map((n) => (Math.abs(Math.trunc(n)) % 2 === 0 ? 2 : 1));
  return { mothers: [0, 1, 2, 3].map((k) => figureByRows(lines.slice(k * 4, k * 4 + 4))), lines };
}

/**
 * الطالع الكامل.
 * @param {object} opt  { name, mother, question, when }  أو  { taps: number[16] }
 * @param {object} [cfg] { taskin: "banat-hafada"|"muthallath" }
 */
export function chart(opt = {}, cfg = {}) {
  const src = opt.taps ? mothersFromTaps(opt.taps) : mothersFromSeed(opt);
  const [M1, M2, M3, M4] = src.mothers;

  const col = (i) => figureByRows([M1.rows[i], M2.rows[i], M3.rows[i], M4.rows[i]]);
  const D1 = col(0), D2 = col(1), D3 = col(2), D4 = col(3);

  const N1 = add(M1, M2), N2 = add(M3, M4), N3 = add(D1, D2), N4 = add(D3, D4);

  const rightWitness = add(N1, N2);
  const leftWitness = add(N3, N4);
  const judge = add(rightWitness, leftWitness);
  const reconciler = add(judge, M1);

  // التسكين (طريقتان تُذكران، والافتراضُ «الأمّهات ثمّ البنات ثمّ المنقولات»)
  const bag = { M1, M2, M3, M4, D1, D2, D3, D4, N1, N2, N3, N4 };
  const method = TASKIN_METHODS[cfg.taskin] ? cfg.taskin : "banat-hafada";
  const order = TASKIN_METHODS[method].order.map((k) => bag[k]);
  const houses = HOUSES.map((h, i) => ({ ...h, figure: order[i] }));

  // الصيغة السداسيّة عشرة (نموذج «نهاية العمل»): ١–١٢ بروجيّة، ١٣–١٦ للشاهدين
  // والقاضي وسهم القسمة، بأسماء بيوت الطوخي الستّةَ عشر.
  const extraFigs = [rightWitness, leftWitness, judge, reconciler];
  const taskin16 = HOUSES16.map((h, i) => ({
    pos: h.n, name: h.name, nature: h.nature, topic: h.topic,
    figure: i < 12 ? houses[i].figure : extraFigs[i - 12],
  }));

  // ميزانُ الرمل: مجموعُ نقاطِ الأمّهاتِ الأربع يجب أن يكون زوجًا.
  const pointsTotal = [M1, M2, M3, M4].reduce((s, f) => s + f.rows.reduce((a, v) => a + v, 0), 0);
  const balanceOk = pointsTotal % 2 === 0;

  return {
    mothers: [M1, M2, M3, M4],
    daughters: [D1, D2, D3, D4],
    nieces: [N1, N2, N3, N4],
    witnesses: { right: rightWitness, left: leftWitness },
    judge,
    reconciler,
    houses,
    taskin16,
    taskinMethod: method,
    pointsTotal,
    balanceOk,
    redoCount: src.redoCount || 0,
    forcedInvalid: !!src.forcedInvalid,
    lines: src.lines,
    seed: src.seedStr || null,
  };
}

function figLabel(f) { return `${f.ar} [${f.rows.join("")}] (${f.nature})`; }
const natVal = (f) => (f.nature === "سعد" ? 1 : f.nature === "نحس" ? -1 : 0);
function toAr(n) {
  const d = "٠١٢٣٤٥٦٧٨٩";
  return String(n).replace(/[0-9]/g, (c) => d[+c]);
}

/** نموذجُ الستّةَ عشرَ بيتًا (نهاية العمل) + بيتُ الشعر الجامع. */
export function houses16() {
  return { houses: HOUSES16, mnemonic: HOUSE_MNEMONIC, note: HOUSES16_NOTE };
}

/** خصائصُ شكلٍ من مخطوط «المثلث» (اسمٌ بربريّ، عددٌ، مدّةٌ للتوقيت، مخوفٌ، كوكب). */
export function figureLore(figId) {
  const id = typeof figId === "string" ? figId : figId?.id;
  return MUTHALLATH_LORE[id] || null;
}

/** نعتُ الشكلِ ودليلُه في مخطوط الإسكندريّ (المدرسة المغربيّة) */
export function figureIskandari(figId) {
  const id = typeof figId === "string" ? figId : figId?.id;
  return ISK_NATURE[id] ? { ...ISK_NATURE[id], src: ISKANDARI_SRC } : null;
}

/**
 * القراءةُ الثلاثيّةُ (المثلث): تقسيمُ الطالع ماضيًا وحاضرًا ومستقبلًا.
 *   الماضي   = الأمّهات + الشاهد الأيمن.
 *   الحاضر   = البنات + الشاهد الأيسر.
 *   المستقبل = القاضي (باب الخمسة عشر) + سهم القسمة.
 * لكلِّ قسمٍ ميلٌ من طبائع أشكاله.
 */
export function threePartReading(c) {
  const seg = (figs) => {
    const s = figs.reduce((a, f) => a + natVal(f), 0);
    return {
      figures: figs.map((f) => f.ar),
      mood: s > 0 ? "إيجابيّ" : s < 0 ? "سلبيّ" : "متوسّط",
      score: s,
    };
  };
  return {
    past: { ...THREE_PARTS.past, ...seg([...c.mothers, c.witnesses.right]) },
    present: { ...THREE_PARTS.present, ...seg([...c.daughters, c.witnesses.left]) },
    future: { ...THREE_PARTS.future, ...seg([c.judge, c.reconciler]) },
    note: MUTHALLATH_NOTE,
  };
}

export function verdictFromScore(score) {
  return score >= 2 ? "الأمرُ يتمّ على خيرٍ وسرعة"
    : score >= 0.5 ? "الأمرُ يتمّ بعد سعيٍ وتأخير"
    : score > -0.5 ? "الأمرُ متوقّفٌ، ونتيجتُه بحسبِ ما يُجاوره"
    : score > -2 ? "الأمرُ متعسّرٌ، والأولى تركُه أو تأجيلُه"
    : "الأمرُ لا يتمّ، وفيه ضررٌ إن أُلِحّ عليه";
}

/** حساب الوزن تحت نظامِ عناصرِ بيوتٍ بعينه. */
function scoreUnder(system, hf, houseNo, judge, wR, wL) {
  const he = houseElement(houseNo, system);
  const harmony = hf.element === he ? 0.5 : areFriends(hf, { element: he }) ? 0 : -0.5;
  const base = natVal(hf) + natVal(judge) + 0.5 * natVal(wR) + 0.5 * natVal(wL);
  return Math.round((base + harmony + aspectScore(houseNo)) * 100) / 100;
}

/**
 * حكمُ مسألةٍ: يختار البيت المناسب من كلماتِ السؤال، ويقرأ شكلَه مع القاضي
 * والشاهدين، ويمزج نتيجتين (نظامٌ فلكيّ + نظامٌ عُمانيّ)، ويُقدّر التوقيت،
 * ويُخرج حُكمًا لفظيًّا + أثرًا كاملًا + تفصيلًا حسب المصدر.
 */
export function reading(opt = {}, cfg = {}) {
  const c = chart(opt, cfg);
  const q = abjad.normalize(opt.question || "");
  let houseNo = 1;
  for (const [kw, hn] of Object.entries(TOPIC_HOUSE)) {
    if (q.includes(abjad.normalize(kw))) { houseNo = hn; break; }
  }
  const house = c.houses[houseNo - 1];
  const hf = house.figure, judge = c.judge;
  const wR = c.witnesses.right, wL = c.witnesses.left;

  // سؤالُ سحرٍ يخصّ «مدفونًا» أو «الدار» تحديدًا: بابُ السحر (١٢، الأعداء الخفيّون)
  // لا يكفي وحده — الكتب تخصّ البيت الرابع (بيت الوالد: الأرض والدار والمدفون) بهذا
  // بالذات؛ فنقرأ البيتين معًا بدل الاكتفاء بأحدهما، ونصرّح أنّ هذه قراءةٌ رمزيّةٌ
  // من الكتاب لا كشفٌ فعليٌّ لمكانٍ حقيقيّ.
  let buriedHouse = null;
  if (houseNo === 12 && /مدفون|دفين|بيت[هي]?\b|الدار|الارض|العقار/.test(q)) {
    const h4 = c.houses[3];
    buriedHouse = {
      n: 4, name: h4.name, topic: h4.topic, figure: h4.figure,
      meaning: figureInHouse(h4.figure, 4),
      note: "البيتُ الرابع (بيت الوالد) هو بابُ «المدفون والأرض والدار» عند أهل الرمل، فقُرئ إلى جانب بيت السحر (١٢). هذه قراءةٌ رمزيّةٌ من شكلٍ وعنصره كما ينصّ الكتاب — لا تُحدِّد مكانًا فعليًّا ولا تُثبِت وجود شيءٍ من عدمه؛ اليقينُ لا يُبنى عليها وحدها.",
    };
  }

  const threePart = threePartReading(c);

  // مزجٌ موزونٌ لمصدرين يختلفان في عناصرِ البيوت.
  const sStd = scoreUnder("standard", hf, houseNo, judge, wR, wL);
  const sOmani = scoreUnder("omani", hf, houseNo, judge, wR, wL);
  const wStd = SOURCES_META.mizan.weight, wOm = SOURCES_META["falak-mashhun"].weight;
  const blended = Math.round(weightedMean([{ value: sStd, weight: wStd }, { value: sOmani, weight: wOm }]) * 100) / 100;

  const bySource = [
    { source: SOURCES_META.mizan.title, weight: wStd, houseSystem: "standard",
      score: sStd, verdict: verdictFromScore(sStd) },
    { source: SOURCES_META["falak-mashhun"].title, weight: wOm, houseSystem: "omani",
      score: sOmani, verdict: verdictFromScore(sOmani) },
    { source: SOURCES_META.zanati.title, weight: SOURCES_META.zanati.weight, houseSystem: "—",
      note: `اسمُ الشكل مشرقيًّا: ${hf.mashriqi || hf.ar}؛ تسكينٌ مستعمَل: ${TASKIN_METHODS[c.taskinMethod].title}` },
    { source: MUTHALLATH_SRC.title, weight: MUTHALLATH_SRC.weight, houseSystem: "—",
      note: `قراءةٌ ثلاثيّة — ماضٍ: ${threePart.past.mood}، حاضر: ${threePart.present.mood}، مستقبل: ${threePart.future.mood}` },
  ];

  // وزنُ الرمل المتعلَّم من إجابات الناس (cfg.weight؛ بلا وزنٍ ⇒ الحكمُ نفسُه)
  const wScore = cfg.weight && cfg.weight !== 1 ? Math.round(blended * cfg.weight * 100) / 100 : blended;
  // القاضي فيصلٌ: شكلٌ نحسٌ في باب الخمسةَ عشرَ يقطعُ الحكمَ مهما رجّح الشاهدان.
  let verdict = verdictFromScore(wScore);
  let judgeOverride = null;
  if (natVal(judge) < 0 && wScore > -0.5) {
    judgeOverride = `القاضي «${judge.ar}» نحسٌ ⇒ الأمرُ محبوسٌ لا يتمُّ في وقتِه مهما رجّح الشاهدان؛ الأولى تركُه أو تأخيرُه.`;
    verdict = `الأمرُ محبوسٌ لا يتمُّ في وقتِه — القاضي «${judge.ar}» نحسٌ يقطعُ الحكم؛ فالأولى تركُه أو تأجيلُه.`;
  } else if (natVal(judge) > 0 && wScore < 0.5 && wScore > -2) {
    judgeOverride = `القاضي «${judge.ar}» سعدٌ ⇒ الأمرُ يتمُّ ولو بعد تعثّرٍ وتأخير.`;
    verdict = "الأمرُ يتمُّ بعد سعيٍ وتأخير — القاضي سعدٌ يرجّحُ التمام.";
  }
  const houseFigureMeaning = figureInHouse(hf, houseNo);
  const houseFigureNafhat = figureInHouseNafhat(hf, houseNo);
  const aspect = aspectToHouse(houseNo);
  const _t = timingFor(hf);
  const timing = {
    unit: _t.unit, magnitude: _t.magnitude,
    text: natVal(judge) < 0
      ? `محبوسٌ — لا يُقدَّرُ له وقتٌ قريب (القاضي نحس)؛ وعنصرُ الشكل يُعطي نحوَ ${_t.text.replace("نحوَ ", "")}`
      : _t.text,
    lore: _t.muthallath, // مدّةُ الشكل في المثلث — تفصيلٌ مساعد لا توقيتٌ ثانٍ
  };

  // تعارضُ الشاهدين: يفصلُ الغالبُ عنصريًّا، وإلّا القاضي.
  let witnessNote;
  if (wR.nature !== wL.nature) {
    const v = elementVictor(wR.element, wL.element);
    witnessNote = v
      ? `الشاهدان مختلفان؛ يغلبُ صاحبُ العنصرِ الأقوى (${v}) ⇒ يميلُ الحكمُ إلى ${
          (v === wR.element ? wR : wL).nature === "سعد" ? "الخير" : "الشرّ"}.`
      : "الشاهدان مختلفان ولا غالبَ بينهما؛ فالفصلُ للقاضي وحدَه.";
  } else {
    witnessNote = `الشاهدان متّفقان في الطبع (${wR.nature}) ⇒ يُقوّيان حكمَ القاضي.`;
  }

  // أحكامُ الطوخي في الرمل (تجاربي وبرهاني): قواعدُ خاصّةٌ بكلّ موضوع على البيوت الستّةَ عشر
  // قاعدةُ الأوروبيّين (Skinner، Geomancy ١٩٨٠، ص ٢١٢): الحمرةُ أو ذنبُ التنين (ومعهما العتبةُ عند بعضهم) في البيت الأوّل
  // ⇒ «الطالعُ غيرُ صالحٍ للحكم، ولا يُعادُ السؤالُ قبل ساعات». تُعلَّمُ ولا تُلغي حكمَ المصادر العربيّة.
  const h1 = c.houses[0].figure;
  const voidChart = ["humra", "dhanab", "habs"].includes(h1.id)
    ? { figure: h1.ar, note: `«${h1.ar}» في البيت الأوّل: عند Skinner (عن التقليد الأوروبيّ) الطالعُ غيرُ صالحٍ للحكم، فالأولى إعادةُ السؤال بعد ساعات.`, src: "Stephen Skinner, Terrestrial Astrology: Divination by Geomancy (1980)" }
    : null;
  let tukhi = null;
  try { tukhi = tukhiRaml.judge(c, opt.question || "", figureByRows); } catch {}
  return {
    question: q,
    tukhi,
    voidChart,
    house: { n: house.n, name: house.name, topic: house.topic, figure: hf },
    buriedHouse,
    judge,
    witnesses: c.witnesses,
    reconciler: c.reconciler,
    score: wScore,
    weightApplied: cfg.weight && cfg.weight !== 1 ? cfg.weight : null,
    scoreStandard: sStd,
    scoreOmani: sOmani,
    verdict,
    judgeOverride,
    figureMeaning: hf.meaning,
    judgeMeaning: judge.meaning,
    houseFigureMeaning, houseFigureNafhat, houseFigureIskandari: figureIskandari(hf),
    aspect,
    witnessNote,
    timing,
    threePart,
    figureLore: figureLore(hf),
    bySource,
    balanceOk: c.balanceOk,
    redoCount: c.redoCount,
    forcedInvalid: c.forcedInvalid,
    mizanRule: MIZAN_DARB_RULE,
    chart: c,
    trace: [
      `السؤال «${q}» ⇒ البيت ${toAr(house.n)} (${house.name}) — لِورودِ كلمةٍ تخصّه.`,
      ...(c.redoCount ? [`الضربةُ الأولى جاء ميزانُها فردًا ففسدت، فأُعيد الضربُ (${toAr(c.redoCount)} ${c.redoCount === 1 ? "مرّة" : "مرّات"}) حتى صحّ الميزان — كما يفعل الرمّالُ فعليًّا.`] : []),
      `الأمّهات: ${c.mothers.map(figLabel).join(" ، ")}`,
      `البنات (أعمدةُ الأمّهات): ${c.daughters.map(figLabel).join(" ، ")}`,
      `المنقولات (جمعُ كلِّ شكلين): ${c.nieces.map(figLabel).join(" ، ")}`,
      `الشاهد الأيمن: ${figLabel(wR)} | الأيسر: ${figLabel(wL)}`,
      `القاضي: ${figLabel(judge)} | سهم القسمة: ${figLabel(c.reconciler)}`,
      `ميزانُ الرمل: مجموعُ نقاطِ الأمّهات = ${toAr(c.pointsTotal)} (${c.balanceOk ? "زوجٌ ⇒ الطالعُ صحيح" : "فردٌ رغم إعادة الضرب ثمانيَ مرّات — حالةٌ نادرةٌ جدًّا، والحكمُ أدناه احتياطيٌّ فقط"}).`,
      `شكلُ بيت المسألة: ${figLabel(hf)} — ${houseFigureMeaning}`,
      `طبائعُ الشكل: ${figureProps(hf).motion}، ${figureProps(hf).stability}، عنصرُه ${hf.element}.`,
      `نظرُ الطالع (البيت ١) إلى بيتِ المسألة: ${aspect}.`,
      `${witnessNote}`,
      `الوزن الفلكيّ = ${sStd} | الوزن العُمانيّ = ${sOmani} ⇒ المزجُ الموزون = ${blended}.`,
      `القراءةُ الثلاثيّة (المثلث): الماضي ${threePart.past.mood}، الحاضر ${threePart.present.mood}، المستقبل ${threePart.future.mood}.`,
      `تقديرُ الوقت من عنصرِ الشكل (${hf.element}) وعددِ نقاطه (${toAr(figureProps(hf).points)}): ${timing.text}${timing.lore ? ` (وفي المثلث: ${timing.lore})` : ""}.`,
      ...(judgeOverride ? [`فيصلُ القاضي: ${judgeOverride}`] : []),
      `⇒ ${verdict}`,
      "كلُّ ما سبق نتيجةُ جمعِ الأشكالِ صفًّا بصفّ من بذرةٍ ثابتة — لا رملَ ولا غيب.",
    ],
  };
}

export default {
  FIGURES, HOUSES,
  add, figureByRows, figureById, figureProps,
  elementVictor, areFriends, arePlanetOpposed, houseElement,
  figureInHouse, figureInHouseNafhat, figureIskandari, timingFor, aspectToHouse, verdictFromScore, houses16,
  figureLore, threePartReading,
  mothersFromSeed, mothersFromTaps, chart, reading,
};
