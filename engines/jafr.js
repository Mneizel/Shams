// engines/jafr.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك الجفر — مزجٌ موزونٌ من كتب الجفر (الجفر الجامع، رسائل التكسير الملحقة
// بشمس المعارف، وصف ابن خلدون).
//
// «علم الجفر» ليس له خوارزمية واحدة معتمدة؛ هذه هي العمليات الميكانيكية
// الموثّقة: أنواعُ البسط، طرقُ التكسير، الزبر والبيّنات، دوائرُ إبدال الحروف،
// مثلّثُ الأعداد، والإسقاطُ (طرحٌ مكرّرٌ بقاسم: ٢٨/١٢/٩/٧/٤/٣). ثمّ «استخراجُ
// الجواب» الذي يركّب هذه العمليات ليخرج حرفًا ← بابًا من جدول.
//
// الهدف صريح (وهو قولُ ابن خلدون): كلُّ «استخراج» ينتهي إلى قسمةٍ على عددٍ
// ثابت واختيارٍ من جدول؛ والمعنى يُقحَم في «قياس الكلام وسياقه». `extractAnswer`
// تُعيد `trace` كاملًا + تفصيلًا حسب المنهج (byMethod) + جوابًا توافقيًّا.
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import { ABJAD_ORDER, NURANI, LETTER_PLANET, LETTER_NATURE, LETTER_NAMES, LETTER_PLANET_ORDER } from "../data/abjad.data.js";
import {
  ABWAB, ABWAB_SENTIMENT, ABWAB_PLANET, ABWAB_ELEMENT, YESNO_MUSTUR,
  BAST_MODES, TAKSIR_METHODS, ISQAT_DIVISORS, SOURCES_META,
  TIME_LADDER, AR_MONTHS_HIJRI, NOTE as JAMI_NOTE,
} from "../data/jafr-jami.data.js";

/**
 * شكلُ السؤال: أسئلةُ «لماذا/كيف/متى/ما الذي» ليست نعم/لا — فرضُ حكمٍ ثنائيٍّ
 * عليها تدليسٌ (جوابٌ لا يطابق شكل السؤال). نُصنِّف الشكلَ لنعرضَ حكمًا بصيغةٍ
 * مناسبة (سببٌ/توجيهٌ/توقيتٌ/وصفٌ) بدل «نعم/لا» حين لا تكون كذلك.
 */
export function classifyQuestionForm(question) {
  // \b لا يعمل بين حرفين عربيَّين (ليسا \w في جافاسكربت) — نستعمل حدًّا صريحًا بدلها.
  const q = String(question || "").trim();
  const END = "(?=\\s|$|؟|\\?|،|,)";
  if (new RegExp(`^(لماذا|ليش|لِمَ)${END}`).test(q)) return "why";
  if (new RegExp(`^كيف${END}`).test(q)) return "how";
  if (new RegExp(`^متى${END}`).test(q)) return "when";
  if (new RegExp(`^(ما\\s+الذي|ماذا)${END}`).test(q)) return "what";
  return "yesno";
}

const letterAt = (n) => ABJAD_ORDER[((n - 1) % 28 + 28) % 28]; // 1..28 → حرف
const orderOf = (ch) => ABJAD_ORDER.indexOf(ch) + 1;
const NUR_SET = new Set(NURANI);
const MUSTUR_SET = new Set(YESNO_MUSTUR);
const ELEMENT_ORDER = ["نار", "هواء", "ماء", "تراب"];

/**
 * الجدول الأعظم للجفر الجامع (٢٨×٢٨) — بديلٌ مُهيكَلٌ بقاعدةٍ معلنة.
 */
export function grandTable() {
  const rows = [];
  for (let r = 0; r < 28; r++) {
    const row = [];
    for (let c = 0; c < 28; c++) row.push(letterAt((r * 3 + c * 5 + r * c + 1) % 28 || 28));
    rows.push(row);
  }
  return { rows, note: JAMI_NOTE };
}

/**
 * جدولُ الطبائع والكواكب (٤×٧ = ٢٨): صفٌّ لكلِّ عنصر، عمودٌ لكلِّ كوكب،
 * والخانةُ الحرفُ الذي يجمع تينك الصفة والكوكب. توزيعٌ حقيقيٌّ متعامد.
 */
export function jafrGrid() {
  const rows = ELEMENT_ORDER.map((nat) => {
    const row = LETTER_PLANET_ORDER.map((pl) =>
      ABJAD_ORDER.find((ch) => LETTER_NATURE[ch] === nat && LETTER_PLANET[ch] === pl) || null);
    return { element: nat, letters: row };
  });
  return { planets: LETTER_PLANET_ORDER, rows };
}

// ── البسط ────────────────────────────────────────────────────────────────
/** البسط الذاتيّ: حروف النصّ بترتيبها كما تُكتب. (توافقٌ خلفيّ) */
export function bast(text) {
  return abjad.letters(text);
}

export function bastModes() {
  return Object.entries(BAST_MODES).map(([id, m]) => ({ id, ...m }));
}

/**
 * البسط بنمطٍ مُختار. يُرجِع سلسلةَ حروفٍ (أو أعداد) قابلةً للتكسير والجُمّل.
 * @param {string} text
 * @param {"huruf"|"adadi"|"lafzi"|"jumali"|"tadad"|"tadeef"|"amtizaj"} [mode="huruf"]
 */
export function bastBy(text, mode = "huruf") {
  const src = abjad.letters(text);
  let tokens, out, value;
  switch (mode) {
    case "adadi":
      tokens = src.map((ch) => abjad.jummal(ch));
      out = tokens.join(" ");
      value = tokens.reduce((a, n) => a + n, 0);
      break;
    case "lafzi":
      tokens = src.flatMap((ch) => [...(LETTER_NAMES[ch] || ch)]);
      out = tokens.join("");
      value = abjad.jummal(out);
      break;
    case "jumali":
      value = abjad.jummal(text);
      tokens = [value];
      out = String(value);
      break;
    case "tadad":
      tokens = src.map((ch) => { const o = orderOf(ch); return o > 0 ? letterAt(29 - o) : ch; });
      out = tokens.join("");
      value = abjad.jummal(out);
      break;
    case "tadeef":
      tokens = src.flatMap((ch) => [ch, ch]);
      out = tokens.join("");
      value = abjad.jummal(out);
      break;
    case "amtizaj": {
      const rev = src.slice().reverse();
      tokens = [];
      for (let i = 0; i < src.length; i++) { tokens.push(src[i]); tokens.push(rev[i]); }
      out = tokens.join("");
      value = abjad.jummal(out);
      break;
    }
    case "huruf":
    default:
      tokens = src;
      out = src.join("");
      value = abjad.jummal(out);
  }
  return { mode, title: BAST_MODES[mode]?.title || mode, tokens, text: out, value };
}

// ── التكسير ─────────────────────────────────────────────────────────────
function taksirTarfeen(arr) {
  const out = [];
  let i = 0, j = arr.length - 1;
  while (i <= j) { out.push(arr[i]); if (i !== j) out.push(arr[j]); i++; j--; }
  return out;
}
function taksirGroups(arr, size, orderIdx) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) {
    const g = arr.slice(i, i + size);
    if (g.length === size) orderIdx.forEach((k) => out.push(g[k]));
    else out.push(...g);
  }
  return out;
}
export function taksirMethods() {
  return Object.entries(TAKSIR_METHODS).map(([id, m]) => ({ id, ...m }));
}

/**
 * التكسير. توافقٌ خلفيّ: إذا كان الوسيطُ الثاني عددًا فهو عددُ مرّاتِ
 * «التكسير من الطرفين». وإلّا فكائنٌ { method, passes }.
 * @returns {{method:string, result:string, letters:string[], steps:string[]}}
 */
export function taksir(text, arg = 1) {
  const method = typeof arg === "object" && arg ? (arg.method || "tarfeen") : "tarfeen";
  const passes = typeof arg === "object" && arg ? (arg.passes || 1) : (arg || 1);
  let arr = abjad.letters(text);
  const steps = [arr.join("")];
  for (let p = 0; p < passes; p++) {
    arr =
      method === "thulathi" ? taksirGroups(arr, 3, [1, 0, 2]) :
      method === "rubaee"   ? taksirGroups(arr, 4, [1, 2, 0, 3]) :
      method === "maqlub"   ? arr.slice().reverse() :
      taksirTarfeen(arr);
    steps.push(arr.join(""));
  }
  return { method, result: arr.join(""), letters: arr, steps };
}

// ── الزبر والبيّنات ─────────────────────────────────────────────────────
/**
 * الزبر: أوّلُ اسمِ الحرف (الحرف نفسه). البيّنة: باقي اسمِه منطوقًا.
 * مثال: «ب» زبرها ب، وبيّنتها «اء».
 */
export function zuburBayyinat(text) {
  const rows = abjad.letters(text).map((ch) => {
    const name = LETTER_NAMES[ch] || abjad.bast(ch).parts[0]?.name || ch;
    const bayyina = [...name].slice(1).join("");
    return {
      letter: ch, zabr: ch, name, bayyina,
      zabrValue: abjad.jummal(ch),
      bayyinaValue: abjad.jummal(bayyina),
    };
  });
  return {
    rows,
    zuburText: rows.map((r) => r.zabr).join(""),
    bayyinatText: rows.map((r) => r.bayyina).join(""),
    zuburSum: rows.reduce((a, r) => a + r.zabrValue, 0),
    bayyinatSum: rows.reduce((a, r) => a + r.bayyinaValue, 0),
  };
}

// ── دوائر إبدال الحروف ─────────────────────────────────────────────────
export function circleShift(text, shift = 1) {
  const mapped = abjad.letters(text).map((ch) => {
    const o = orderOf(ch);
    return o > 0 ? letterAt(o + shift) : ch;
  });
  return { result: mapped.join(""), letters: mapped, shift };
}

export function circleMap(text, map) {
  const mapped = abjad.letters(text).map((ch) => map[ch] || ch);
  return { result: mapped.join(""), letters: mapped };
}

/** الدوائرُ المسمّاة المشتقّة من تقسيمات الحروف. */
export function circles() {
  const tadad = {};
  ABJAD_ORDER.forEach((ch, i) => { tadad[ch] = ABJAD_ORDER[27 - i]; });
  const group = (fn, keys) => {
    const g = Object.fromEntries(keys.map((k) => [k, []]));
    ABJAD_ORDER.forEach((ch) => { const k = fn(ch); if (g[k]) g[k].push(ch); });
    return g;
  };
  return {
    abjad: ABJAD_ORDER.slice(),
    tadad,                                   // ا↔غ … دائرةُ العكس
    kawakib: group((c) => LETTER_PLANET[c], LETTER_PLANET_ORDER),
    anasir: group((c) => LETTER_NATURE[c], ELEMENT_ORDER),
    nuraniyya: {
      nur: ABJAD_ORDER.filter((c) => NUR_SET.has(c)),
      zulma: ABJAD_ORDER.filter((c) => !NUR_SET.has(c)),
    },
  };
}

/** إبدالُ النصِّ عبر دائرةٍ مسمّاة: "abjad" (بلا تغيير) أو "tadad" (العكس). */
export function circleSubstitute(text, name = "tadad") {
  if (name === "tadad") {
    const map = circles().tadad;
    return circleMap(text, map);
  }
  return circleMap(text, {}); // abjad = هويّة
}

// ── مثلّث الأعداد ───────────────────────────────────────────────────────
export function numberTriangle(text, mod = 0) {
  const reduce = (x) => (mod ? ((x % mod) + mod) % mod || mod : x);
  let row = abjad.letters(text).map((ch) => reduce(abjad.jummal(ch)));
  const rows = [row.slice()];
  while (row.length > 1) {
    const next = [];
    for (let i = 0; i < row.length - 1; i++) next.push(reduce(row[i] + row[i + 1]));
    row = next;
    rows.push(row.slice());
  }
  const apex = row[0] ?? 0;
  return { rows, apex, apexLetter: letterAt(mod ? apex : abjad.saghir(apex) || 1) };
}

// ── الإسقاط ─────────────────────────────────────────────────────────────
export function isqat(value, divisor) {
  let v = Math.abs(Math.trunc(value));
  let count = 0;
  while (v >= divisor) { v -= divisor; count++; }
  return { remainder: v === 0 ? divisor : v, subtractions: count, divisor, exactZero: v === 0 };
}

/** الإسقاطُ بكلِّ القواسمِ المعتمدة دفعةً واحدة. */
export function isqatAll(value) {
  const out = {};
  for (const d of [28, 12, 9, 7, 4, 3]) out[d] = { ...isqat(value, d), meaning: ISQAT_DIVISORS[d] };
  return out;
}

// ── معلوماتُ الحرف ─────────────────────────────────────────────────────
export function letterInfo(ch) {
  return {
    letter: ch,
    order: orderOf(ch),
    class: NUR_SET.has(ch) ? "نورانيّة" : "ظلمانيّة",
    planet: LETTER_PLANET[ch] || null,
    nature: LETTER_NATURE[ch] || null,
    value: abjad.jummal(ch),
  };
}

/** نعم/لا/مستور من صنفِ حرفِ الجواب. */
export function yesNo(letter) {
  if (MUSTUR_SET.has(letter)) return "مستور — لا يُجزَم فيه";
  return NUR_SET.has(letter) ? "أقربُ إلى: نعم" : "أقربُ إلى: لا";
}

// ── التنبؤ: العدد ← زمن ────────────────────────────────────────────────
/**
 * @param {number} n
 * @param {"sullam"|"shahr-yawm"|"sneen"} [mode="sullam"]
 */
// صيغُ العدّ العربيّ الصحيحةُ لوحداتِ الزمن (١ / ٢ / ٣–١٠ / ١١+).
const TIME_UNIT_FORMS = [
  { one: "يومٌ واحد",    two: "يومان",     few: "أيّامٍ",   many: "يومًا" },
  { one: "أسبوعٌ واحد",  two: "أسبوعان",   few: "أسابيعَ",  many: "أسبوعًا" },
  { one: "شهرٌ واحد",    two: "شهران",     few: "أشهرٍ",    many: "شهرًا" },
  { one: "سنةٌ واحدة",   two: "سنتان",     few: "سنينَ",    many: "سنةً" },
];
function arCount(n, f) {
  if (n === 1) return f.one;
  if (n === 2) return f.two;
  if (n >= 3 && n <= 10) return `${toAr(n)} ${f.few}`;
  return `${toAr(n)} ${f.many}`;
}

export function timeFromNumber(n, mode = "sullam") {
  const v = Math.abs(Math.trunc(n));
  if (mode === "sneen") {
    const years = (v % 100) || 100;
    return { mode, count: years, unit: "سنون", text: `نحوَ ${arCount(years, TIME_UNIT_FORMS[3])} هجريّةً من وقتِ العمل` };
  }
  if (mode === "shahr-yawm") {
    const month = (v % 12) || 12;
    const day = (v % 30) || 30;
    return { mode, month, day, text: `في اليومِ ${toAr(day)} من شهرِ ${AR_MONTHS_HIJRI[month - 1]}` };
  }
  const unitIdx = (v % 4); // 0..3
  const qty = (v % 12) || 12;
  return { mode, unit: TIME_LADDER[unitIdx], count: qty, text: `نحوَ ${arCount(qty, TIME_UNIT_FORMS[unitIdx])}` };
}

// ── حرفُ المطلوب ──────────────────────────────────────────────────────
/** أعلى حروفِ السؤالِ قيمةً هو «حرفُ المطلوب»؛ ومقابلُه في دائرةِ التضادّ. */
export function matlub(question) {
  const ls = abjad.letters(abjad.normalize(question));
  if (!ls.length) return null;
  let best = ls[0];
  for (const ch of ls) if (abjad.jummal(ch) > abjad.jummal(best)) best = ch;
  const opp = circles().tadad[best] || best;
  return {
    letter: best, value: abjad.jummal(best),
    opposite: opp, oppositeBab: ABWAB[opp] || null,
    bab: ABWAB[best] || null,
  };
}

// ── استخراج الجواب ────────────────────────────────────────────────────
function toAr(n) {
  const d = "٠١٢٣٤٥٦٧٨٩";
  return String(n).replace(/[0-9]/g, (c) => d[+c]);
}
function verdictFromSentiment(s) {
  return s > 0.3 ? "الميلُ العامّ: إيجابيّ — «نعم» مع سعيٍ وصبر."
    : s < -0.3 ? "الميلُ العامّ: سلبيّ — الأولى التريّثُ أو تركُ الأمر."
    : "الميلُ العامّ: مستورٌ لم يتبيّنْ بعد — فاسألْ بنيّةٍ أصفى.";
}

/**
 * يركّب العمليات ليخرج «حرف الجواب» وبابَه، مع أثرٍ كامل، ثمّ يُعيد الاستخراجَ
 * تحت مناهجَ بديلة (بسط/تكسير/بذرة) ويستخرج جوابًا توافقيًّا (الأكثرُ تكرارًا).
 *
 * @param {string} question
 * @param {object} [opt]  { name, mother, seed, taksirPasses, method }
 */
export function extractAnswer(question, opt = {}) {
  const method = opt.method || "kabir";
  const seed = opt.seed ?? "بسم الله الرحمن الرحيم";
  const trace = [];

  let qText = abjad.normalize(question);
  if (opt.taksirPasses) {
    const tk = taksir(qText, opt.taksirPasses);
    qText = tk.result;
    trace.push(`تكسير السؤال (${opt.taksirPasses}×): ⇒ «${qText}»`);
  }

  const qVal = abjad.jummal(qText, method);
  const seedVal = abjad.jummal(seed, method);
  trace.push(`جُمّل السؤال = ${qVal}`, `جُمّل البذرة «${seed}» = ${seedVal}`);

  let nameVal = 0, motherVal = 0;
  if (opt.name) { nameVal = abjad.jummal(opt.name, method); trace.push(`جُمّل «${abjad.normalize(opt.name)}» = ${nameVal}`); }
  if (opt.mother) { motherVal = abjad.jummal(opt.mother, method); trace.push(`جُمّل «${abjad.normalize(opt.mother)}» = ${motherVal}`); }

  const grand = qVal + seedVal + nameVal + motherVal;
  trace.push(`المجموع الكلّي = ${qVal} + ${seedVal} + ${nameVal} + ${motherVal} = ${grand}`);

  const all = isqatAll(grand);
  const h28 = all[28], h12 = all[12], h9 = all[9], h7 = all[7], h4 = all[4], h3 = all[3];
  const answerLetter = letterAt(h28.remainder);
  trace.push(
    `إسقاط بـ٢٨: باقٍ ${h28.remainder} ⇒ حرفُ الجواب «${answerLetter}»`,
    `إسقاط بـ١٢: باقٍ ${h12.remainder} ⇒ البرج ${h12.remainder}`,
    `إسقاط بـ٩: باقٍ ${h9.remainder} ⇒ أصلُ العدد`,
    `إسقاط بـ٧: باقٍ ${h7.remainder} ⇒ الكوكب/اليوم ${h7.remainder}`,
    `إسقاط بـ٤: باقٍ ${h4.remainder} ⇒ العنصر ${h4.remainder}`,
    `إسقاط بـ٣: باقٍ ${h3.remainder} ⇒ رتبةُ الأمر (مُلك/ملكوت/جبروت)`
  );

  // سلسلةُ الجواب (كلمةٌ من ٣ حروف) — كما يفعل بعضُ أهلِ الجفر.
  const step = (qVal % 28) || 1;
  const answerLetters = [];
  let cur = h28.remainder;
  for (let k = 0; k < 3; k++) { answerLetters.push(letterAt(cur)); cur = ((cur + step - 1) % 28) + 1; }
  trace.push(`سلسلةُ الجواب: من «${answerLetter}» بخطوة ${step} ⇒ «${answerLetters.join("")}»`);

  const bab = ABWAB[answerLetter] || null;
  const answerSentiment = ABWAB_SENTIMENT[answerLetter] ?? 0;
  if (bab) trace.push(`بابُ «${answerLetter}»: ${bab}`);

  // ── إعادةُ الاستخراج تحت مناهجَ بديلة (المزجُ الموزون) ────────────────
  const recipes = [
    { id: "أصليّ (ذاتيّ، بلا تكسير)", bast: "huruf", taksir: null, w: SOURCES_META.jami.weight },
    { id: "تضادّ (عكسُ الحروف)", bast: "tadad", taksir: null, w: SOURCES_META.jami.weight * 0.8 },
    { id: "تكسيرٌ ثلاثيّ", bast: "huruf", taksir: "thulathi", w: SOURCES_META.shams.weight },
    { id: "تكسيرٌ من الطرفين", bast: "huruf", taksir: "tarfeen", w: SOURCES_META.shams.weight * 0.9 },
    { id: "بلا بذرةِ البسملة", bast: "huruf", taksir: null, seed: "", w: SOURCES_META.ibnkh.weight },
  ];
  const byMethod = recipes.map((r) => {
    let t = bastBy(abjad.normalize(question), r.bast).text;
    if (r.taksir) t = taksir(t, { method: r.taksir }).result;
    const sv = r.seed === "" ? 0 : seedVal;
    const total = abjad.jummal(t, method) + sv + nameVal + motherVal;
    const lt = letterAt(isqat(total, 28).remainder);
    return { recipe: r.id, weight: r.w, total, letter: lt, bab: ABWAB[lt] || null, sentiment: ABWAB_SENTIMENT[lt] ?? 0 };
  });
  // الجوابُ التوافقيّ = الحرفُ الأكثرُ وزنًا مجموعًا
  const tally = {};
  for (const m of byMethod) tally[m.letter] = (tally[m.letter] || 0) + m.weight;
  const consensusLetter = Object.entries(tally).sort((a, b) => b[1] - a[1] ||
    orderOf(a[0]) - orderOf(b[0]))[0][0];
  const consensusBab = ABWAB[consensusLetter] || null;
  const blendSent = byMethod.reduce((a, m) => a + m.sentiment * m.weight, 0) /
    byMethod.reduce((a, m) => a + m.weight, 0);
  trace.push(
    `مناهجُ بديلة ⇒ ${byMethod.map((m) => `${m.letter}(${m.recipe})`).join("، ")}`,
    `الجوابُ التوافقيّ (الأثقلُ وزنًا) = «${consensusLetter}»${consensusLetter !== answerLetter ? " — يخالفُ المنهجَ الأصليّ" : " — يوافقُ المنهجَ الأصليّ"}`,
    `مزجُ الميل = ${Math.round(blendSent * 100) / 100} ⇒ ${verdictFromSentiment(blendSent)}`
  );

  const mt = matlub(question);
  const tm = timeFromNumber(grand, "sullam");
  const tmYear = timeFromNumber(grand, "sneen");

  // ── حكمٌ واحدٌ موفَّق (لا ثلاثةُ أحكامٍ متضاربة) ──────────────────────
  // ثلاثةُ محاورَ: (١) طبعُ بابِ الحرفِ المباشر، (٢) نورانيّة/ظُلمانيّة الحرف،
  // (٣) مِزجُ الميلِ من المناهجِ الخمسة. تُجمَع موزونةً ⇒ اتّجاهٌ واحدٌ وثقةٌ واحدة.
  const lumScore = MUSTUR_SET.has(answerLetter) ? 0 : NUR_SET.has(answerLetter) ? 1 : -1;
  const axisSign = [Math.sign(answerSentiment), lumScore, Math.sign(blendSent)];
  const rawScore = 0.45 * axisSign[0] + 0.25 * axisSign[1] + 0.30 * axisSign[2];
  const direction = rawScore > 0.12 ? "نعم" : rawScore < -0.12 ? "لا" : "مستور";
  const nonZero = axisSign.filter((s) => s !== 0);
  const aligned = nonZero.length
    ? nonZero.filter((s) => s === Math.sign(rawScore || 1)).length / nonZero.length : 0;
  const confidence = direction === "مستور"
    ? Math.round(20 + 25 * (1 - aligned))
    : Math.round(45 + 50 * aligned * Math.min(1, Math.abs(rawScore) + 0.25));
  const verdictText = {
    "نعم": "الميلُ إلى «نعم» — يتمُّ الأمرُ بعد سعيٍ وصبر.",
    "لا": "الميلُ إلى «لا» — الأولى التريّثُ أو تركُ الأمر.",
    "مستور": "الأمرُ مستورٌ لم يتبيّنْ بعد — أعِدِ السؤالَ بنيّةٍ أصفى.",
  }[direction];
  const verdict = { direction, confidence, text: verdictText };
  // «نعم/لا» موحَّدٌ مع الحكم (لا مبنيًّا على النورانيّة وحدها).
  const yesNoResolved = direction === "مستور" ? "مستور — لا يُجزَم فيه" : `أقربُ إلى: ${direction}`;

  // ── شكلُ السؤال: عرضٌ مناسبٌ لأسئلة لماذا/كيف/متى/ماذا (لا نعم/لا مفروضة) ──
  const questionForm = classifyQuestionForm(question);
  const babText = bab || "لم يتّضح بابٌ محدَّد لهذا الحرف.";
  const formed = {
    why: { label: "السببُ الأرجح", text: `السببُ الأرجح (من بابِ حرفِ الجواب «${answerLetter}»): ${babText}` },
    how: { label: "التوجيه", text: `التوجيهُ (من بابِ حرفِ الجواب «${answerLetter}»): ${babText}` },
    when: { label: "التوقيتُ المرجَّح", text: `التقديرُ الزمنيّ: ${tm.text}. وسياقُ بابِ الحرف «${answerLetter}»: ${babText}` },
    what: { label: "الوصف", text: `الوصفُ (من بابِ حرفِ الجواب «${answerLetter}»): ${babText}` },
    yesno: { label: direction, text: verdictText },
  }[questionForm];

  trace.push(
    `حرفُ المطلوب (أعلى حروفِ السؤال قيمةً): «${mt?.letter}» ومقابلُه «${mt?.opposite}»`,
    `المحاورُ الثلاثة: طبعُ الباب ${axisSign[0]} · نورانيّة الحرف ${axisSign[1]} · مزجُ المناهج ${axisSign[2]} ⇒ الدرجة ${Math.round(rawScore * 100) / 100} ⇒ الحكم «${direction}» بثقة ${confidence}٪ (توافقُ المحاور ${Math.round(aligned * 100)}٪).`,
    `تقديرُ الزمن: ${tm.text}${tmYear.count && Math.abs(tmYear.count) > 24 ? "" : ` (وبعدِّ السنين: ${tmYear.text})`}`,
    "وكما قال ابن خلدون: لا شيء هنا سوى قسمةٍ وانتقاءٍ من جدول؛ والمعنى يُقحَم في «قياسِ الكلامِ وسياقِه»."
  );

  return {
    question: abjad.normalize(question),
    grandTotal: grand,
    answerLetter,
    answerWord: answerLetters.join(""),
    bab,
    answerSentiment,
    letterClass: NUR_SET.has(answerLetter) ? "نورانيّة" : "ظلمانيّة",
    verdict,                       // ← الحكمُ الموحَّد: { direction, confidence, text }
    questionForm,                  // yesno | why | how | when | what
    formed,                        // { label, text } — عرضٌ مناسبٌ لشكل السؤال (لا نعم/لا مفروضة)
    yesNo: yesNoResolved,          // موافقٌ لـ verdict.direction
    yesNoByLuminosity: yesNo(answerLetter), // المحورُ الخام (للكشف فقط)
    burjIndex: h12.remainder,
    planetIndex: h7.remainder,
    elementIndex: h4.remainder,
    nineRoot: h9.remainder,
    worldRank: h3.remainder,
    planetAnswer: ABWAB_PLANET[h7.remainder] || null,
    elementAnswer: ABWAB_ELEMENT[h4.remainder] || null,
    isqat: { by28: h28, by12: h12, by9: h9, by7: h7, by4: h4, by3: h3 },
    byMethod,
    consensusLetter,
    consensusBab,
    consensusAgree: consensusLetter === answerLetter,
    blendSentiment: Math.round(blendSent * 100) / 100,
    blendVerdict: verdictFromSentiment(blendSent), // محورٌ مساعد (لا يُصدَّر كعنوان)
    matlub: mt,
    time: { text: tm.text, unit: tm.unit, count: tm.count, alt: tmYear.text },
    trace,
  };
}

export default {
  bast, bastModes, bastBy,
  taksir, taksirMethods,
  zuburBayyinat,
  circleShift, circleMap, circles, circleSubstitute,
  numberTriangle,
  isqat, isqatAll,
  letterInfo, yesNo, timeFromNumber, matlub,
  extractAnswer, grandTable, jafrGrid, classifyQuestionForm,
};
