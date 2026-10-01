// engines/abjad.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك حساب الجُمّل (Abjad numerology)
//
// يوفّر: تطبيع النص العربي، قيمة الحرف/الكلمة/الجملة بكل الطرق،
// الحساب الصغير، البَسط (نطق الحروف)، التكسير، وتحليل طبائع/كواكب الحروف.
//
// كل الدوال خالصة (pure) وحتمية — نفس المدخل ⇒ نفس المخرج. هذا هو بيت القصيد:
// "الروحانية" هنا دالّة رياضية مكشوفة.
// ─────────────────────────────────────────────────────────────────────────────

import {
  KABIR_MASHRIQI,
  KABIR_MAGHRIBI,
  LETTER_NAMES,
  LETTER_NATURE,
  LETTER_PLANET,
  NURANI,
  ABJAD_ORDER
} from "../data/abjad.data.js";
import {
  JUMMAL_METHODS, NATURE_SYSTEMS, SUN_LETTERS, MOON_LETTERS, DOTTED, UNDOTTED,
  ELEMENT_WORLD, MIZAJ, BATTLE_ELEMENT_OF_REM4, BATTLE_ELEMENT_VICTORY, SOURCES_META,
} from "../data/huruf.data.js";
import {
  TIBB_METHOD, LETTER_AILMENTS, TIBB_NOTE, SOURCE_META as TIBB_SRC,
  AYQANIYYA, ELEMENT_FRIENDSHIP,
} from "../data/huruf-tibb.data.js";
import * as ASM_AZAM from "../data/asm-azam.data.js";

// ── تطبيع ───────────────────────────────────────────────────────────────────

const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g; // تشكيل + تطويل

/**
 * تطبيع النص العربي قبل الحساب:
 * - حذف التشكيل والتطويل
 * - توحيد الهمزات: أ إ آ ء ← ا ، ؤ ← و ، ئ ← ي ، ى ← ي ، ة ← ه
 * - إزالة كل ما ليس حرفًا عربيًا أساسيًا
 * @param {string} s
 * @param {{keepHamzaSeats?: boolean}} [opt] إن رغبت بإبقاء ؤ/ئ كما هي
 * @returns {string}
 */
export function normalize(s, opt = {}) {
  if (typeof s !== "string") return "";
  let t = s.normalize("NFC").replace(DIACRITICS, "");
  const map = opt.keepHamzaSeats
    ? { "أ": "ا", "إ": "ا", "آ": "ا", "ء": "ا", "ى": "ي", "ة": "ه" }
    : { "أ": "ا", "إ": "ا", "آ": "ا", "ء": "ا", "ؤ": "و", "ئ": "ي", "ى": "ي", "ة": "ه" };
  t = t.replace(/[أإآءؤئىة]/g, (c) => map[c] ?? c);
  // أبقِ الحروف العربية الأساسية فقط
  return t.replace(/[^ء-ي]/g, (c) => (/\s/.test(c) ? " " : ""));
}

/** يفكّ الشدّة ضمنيًا: النص المُطبّع لا يحوي شدّة، فإن أردت مضاعفة حرف مشدّد مرّرها صراحة. */
export function letters(s, opt) {
  return [...normalize(s, opt)].filter((c) => c !== " ");
}

// ── جداول ───────────────────────────────────────────────────────────────────

const ORDINAL = Object.fromEntries(ABJAD_ORDER.map((c, i) => [c, i + 1]));
const NUR_SET = new Set(NURANI);
const SIGN_NAMES = ["الحمل", "الثور", "الجوزاء", "السرطان", "الأسد", "السنبلة",
  "الميزان", "العقرب", "القوس", "الجدي", "الدلو", "الحوت"];
const TAWALI_ELEMENTS = ["نار", "هواء", "ماء", "تراب"];
const leadDigit = (v) => (v ? +String(v)[0] : 0);

/**
 * قيمة حرف واحد بأحد المناهج:
 * kabir/mashriqi (١..١٠٠٠)، maghribi، saghir (طرح التسعة)، wasat (الرقم القائد)،
 * tartib (رتبة الحرف ١..٢٨)، nurani (النورانيّة فقط)، zulmani (غيرها فقط)،
 * lafzi (قيمة اسم الحرف منطوقًا).
 * @returns {number} 0 إن لم يكن حرفًا معروفًا
 */
export function letterValue(ch, method = "kabir") {
  const k = KABIR_MASHRIQI[ch] || 0;
  switch (method) {
    case "maghribi": return KABIR_MAGHRIBI[ch] || 0;
    case "saghir":   return saghir(k);
    case "wasat":    return leadDigit(k);
    case "tartib":   return ORDINAL[ch] || 0;
    case "nurani":   return NUR_SET.has(ch) ? k : 0;
    case "zulmani":  return NUR_SET.has(ch) ? 0 : k;
    case "lafzi":    return jummal(LETTER_NAMES[ch] || ch, "kabir");
    case "kabir": case "mashriqi": default: return k;
  }
}

/**
 * الحساب الصغير: طرح التِّسعة من القيمة الكبيرة (جذر رقمي 1..9).
 * صيغة شائعة في كتب الحروف. 0 يبقى 0.
 */
export function saghir(value) {
  if (!value) return 0;
  const m = value % 9;
  return m === 0 ? 9 : m;
}

/** جذر رقمي كامل حتى خانة واحدة (يُستعمل في بعض طرق الجفر). */
export function digitalRoot(value) {
  let n = Math.abs(Math.trunc(value));
  while (n >= 10) n = String(n).split("").reduce((a, d) => a + +d, 0);
  return n;
}

// ── قيمة الكلمة / الجملة ────────────────────────────────────────────────────

/**
 * قيمة نصّ كامل.
 * @param {string} text
 * @param {object} [opt]
 * @param {"kabir"|"mashriqi"|"maghribi"} [opt.method="kabir"]
 * @param {boolean} [opt.saghir=false]  طبّق الحساب الصغير على كل حرف قبل الجمع
 * @param {boolean} [opt.perLetter=false] أرجِع تفصيل كل حرف
 * @param {boolean} [opt.keepHamzaSeats=false]
 * @returns {{total:number, count:number, breakdown?:Array<{ch:string,value:number}>}}
 */
export function value(text, opt = {}) {
  const method = opt.method || "kabir";
  const chars = letters(text, { keepHamzaSeats: opt.keepHamzaSeats });
  const breakdown = chars.map((ch) => {
    let v = letterValue(ch, method);
    if (opt.saghir) v = saghir(v);
    return { ch, value: v };
  });
  const total = breakdown.reduce((a, b) => a + b.value, 0);
  const out = { total, count: chars.length };
  if (opt.perLetter) out.breakdown = breakdown;
  return out;
}

/** اختصار: القيمة الكبيرة العددية فقط. */
export function jummal(text, method = "kabir") {
  return value(text, { method }).total;
}

// ── البَسط (نطق الحروف) ────────────────────────────────────────────────────

/**
 * بَسط الحروف: استبدال كل حرف باسمه المنطوق ثم جمع قيمة الاسم.
 * مثال: "محمد" ← ميم + حاء + ميم + دال.
 * @param {string} text
 * @param {"kabir"|"mashriqi"|"maghribi"} [method="kabir"]
 * @returns {{total:number, parts:Array<{ch:string,name:string,value:number}>}}
 */
export function bast(text, method = "kabir") {
  const parts = letters(text).map((ch) => {
    const name = LETTER_NAMES[ch] || ch;
    return { ch, name, value: jummal(name, method) };
  });
  return { total: parts.reduce((a, p) => a + p.value, 0), parts };
}

// ── التكسير ────────────────────────────────────────────────────────────────

/**
 * تكسير بسيط: توليد المتتاليات التصاعدية من حروف الكلمة.
 * "قمر" ← ["ق", "قم", "قمر"]  ثم قيمة كلٍّ منها.
 * @param {string} text
 * @param {"kabir"|"mashriqi"|"maghribi"} [method="kabir"]
 */
export function taksirBasit(text, method = "kabir") {
  const ls = letters(text);
  const rows = ls.map((_, i) => {
    const seg = ls.slice(0, i + 1).join("");
    return { seg, value: jummal(seg, method) };
  });
  return { rows, total: rows.reduce((a, r) => a + r.value, 0) };
}

/**
 * تكسير مركّب (المُدرَج المزدوج): لكل موضع، مجموع القيم التراكمية.
 * يُستعمل في بعض أعمال الجفر لاشتقاق عدد "باطن" الاسم.
 */
export function taksirMurakkab(text, method = "kabir") {
  const ls = letters(text).map((ch) => jummal(ch, method));
  let running = 0;
  const rows = ls.map((v, i) => {
    running += v * (ls.length - i); // ترجيح تنازلي — صيغة مُدرَجة شائعة
    return { index: i + 1, weighted: v * (ls.length - i), running };
  });
  return { rows, total: running };
}

// ── تحليل الحروف: طبائع وكواكب ──────────────────────────────────────────────

/**
 * تصنيف حروف نصّ حسب العناصر الأربعة والكواكب، مع الغالب.
 * هذا ما يبني عليه محرّك الأسماء/الخدّام لاحقًا.
 */
export function analyzeLetters(text) {
  const ls = letters(text);
  const natureCount = { نار: 0, هواء: 0, ماء: 0, تراب: 0 };
  const planetCount = {};
  const detail = ls.map((ch) => {
    const nature = LETTER_NATURE[ch] || null;
    const planet = LETTER_PLANET[ch] || null;
    if (nature) natureCount[nature]++;
    if (planet) planetCount[planet] = (planetCount[planet] || 0) + 1;
    return {
      ch,
      nature,
      planet,
      nurani: NURANI.includes(ch),
      kabir: letterValue(ch, "kabir"),
      order: ABJAD_ORDER.indexOf(ch) + 1
    };
  });
  const dominantNature =
    Object.entries(natureCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  const dominantPlanet =
    Object.entries(planetCount).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  return { detail, natureCount, planetCount, dominantNature, dominantPlanet };
}

// ── طرق شائعة لاشتقاق عدد "الطالع" من اسم + اسم الأم ────────────────────────

/**
 * الطريقة المتداولة: (جُمّل الاسم + جُمّل اسم الأم) ثم عملية باقٍ.
 * @param {string} name
 * @param {string} motherName
 * @param {object} [opt]
 * @param {number} [opt.mod=12]   القاسم (12 للأبراج، 7 للكواكب/الأيام، 28 للمنازل، 4 للعناصر)
 * @param {"add"|"sub"} [opt.combine="add"]
 * @param {"kabir"|"mashriqi"|"maghribi"} [opt.method="kabir"]
 */
export function fromNameAndMother(name, motherName, opt = {}) {
  const method = opt.method || "kabir";
  const mod = opt.mod || 12;
  const a = jummal(name, method);
  const b = jummal(motherName, method);
  const sum = opt.combine === "sub" ? Math.abs(a - b) : a + b;
  let rem = sum % mod;
  if (rem === 0) rem = mod;
  return { nameValue: a, motherValue: b, sum, mod, remainder: rem };
}

// ── طبقة علم الحروف الموسَّعة (كتب الحروف) ─────────────────────────────
const top = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

/** قائمةُ مناهجِ الحساب. */
export function methods() {
  return Object.entries(JUMMAL_METHODS).map(([id, m]) => ({ id, ...m }));
}

/** جُمّلُ النصّ بكلِّ المناهج دفعةً — لمقارنة الاصطلاحات. */
export function allMethods(text) {
  const out = {};
  for (const id of Object.keys(JUMMAL_METHODS)) out[id] = jummal(text, id);
  return out;
}

/** طبعُ الحرف بنظامٍ مُختار: buni (تقسيم شمس المعارف) أو tawali (على التوالي الأبجديّ). */
export function natureOf(ch, system = "buni") {
  if (system === "tawali") {
    const i = ABJAD_ORDER.indexOf(ch);
    return i < 0 ? null : TAWALI_ELEMENTS[i % 4];
  }
  return LETTER_NATURE[ch] || null;
}

/** برجُ الحرف (٢٨ حرفًا موزَّعةً على ١٢ برجًا بالتساوي). */
export function letterZodiac(ch) {
  const i = ABJAD_ORDER.indexOf(ch);
  return i < 0 ? null : SIGN_NAMES[Math.floor((i * 12) / 28)];
}

/** بطاقةُ الحرف الكاملة: قيمٌ ومطابقاتٌ من كلِّ الجداول. */
export function letterCorrespondences(ch) {
  const nb = natureOf(ch, "buni");
  return {
    letter: ch, order: ORDINAL[ch] || 0,
    kabir: letterValue(ch, "kabir"), maghribi: letterValue(ch, "maghribi"),
    saghir: letterValue(ch, "saghir"), wasat: letterValue(ch, "wasat"),
    tartib: letterValue(ch, "tartib"),
    name: LETTER_NAMES[ch] || ch, lafzi: letterValue(ch, "lafzi"),
    natureBuni: nb, natureTawali: natureOf(ch, "tawali"),
    planet: LETTER_PLANET[ch] || null,
    zodiac: letterZodiac(ch),
    nurani: NUR_SET.has(ch),
    sun: SUN_LETTERS.includes(ch), moon: MOON_LETTERS.includes(ch),
    dotted: DOTTED.includes(ch),
    world: nb ? ELEMENT_WORLD[nb] : null,
  };
}

/**
 * تحليلٌ موسَّعٌ لحروف نصّ: عدُّ الطبائع بنظامين والمزجُ بينهما، الكواكب،
 * النورانيّة/الظلمانيّة، الشمسيّة/القمريّة، المنقوطة/المهملة، أقوى حرفٍ قيمةً،
 * والمزاجُ الغالبُ ووصفُه.
 */
export function analyze(text) {
  const ls = letters(text);
  const nc = { نار: 0, هواء: 0, ماء: 0, تراب: 0 };
  const ncT = { نار: 0, هواء: 0, ماء: 0, تراب: 0 };
  const pc = {};
  let nur = 0, dot = 0, sun = 0, moon = 0, strongest = ls[0] || null, strongestV = -1;
  for (const ch of ls) {
    const nb = natureOf(ch, "buni"), nt = natureOf(ch, "tawali");
    if (nb) nc[nb]++;
    if (nt) ncT[nt]++;
    const p = LETTER_PLANET[ch];
    if (p) pc[p] = (pc[p] || 0) + 1;
    if (NUR_SET.has(ch)) nur++;
    if (DOTTED.includes(ch)) dot++;
    if (SUN_LETTERS.includes(ch)) sun++;
    if (MOON_LETTERS.includes(ch)) moon++;
    const v = letterValue(ch, "kabir");
    if (v > strongestV) { strongestV = v; strongest = ch; }
  }
  const n = ls.length || 1;
  const merged = {};
  for (const k of Object.keys(nc)) merged[k] = nc[k] + ncT[k];
  const domBlend = top(merged);
  return {
    count: ls.length,
    natureCountBuni: nc, natureCountTawali: ncT, natureCountBlend: merged,
    planetCount: pc,
    dominantNature: top(nc),
    dominantNatureTawali: top(ncT),
    dominantNatureBlend: domBlend,
    dominantPlanet: top(pc),
    mizaj: MIZAJ[domBlend] || null,
    world: ELEMENT_WORLD[domBlend] || null,
    nuraniCount: nur, nuraniRatio: +(nur / n).toFixed(2),
    dottedCount: dot, undottedCount: ls.length - dot,
    sunCount: sun, moonCount: moon,
    strongestLetter: strongest, strongestValue: strongestV === -1 ? 0 : strongestV,
    detail: ls.map(letterCorrespondences),
  };
}

/**
 * الغالبُ والمغلوبُ بين اسمين — قاعدتان تُمزَجان:
 *   (١) الأعداد: طرحُ التسعة ومقارنةُ الفرديّة ثمّ الباقي.
 *   (٢) العناصر: باقي ٪ ٤ ⇒ عنصرٌ، ثمّ سلسلةُ الغلبة.
 * @param {string} nameA  الطالب (السائل عادةً)
 * @param {string} nameB  المطلوب (الخصم/المحبوب)
 * @param {{method?:string}} [opt]
 */
export function nameBattle(nameA, nameB, opt = {}) {
  const method = opt.method || "kabir";
  const a = jummal(nameA, method), b = jummal(nameB, method);
  const ar = a % 9 || 9, br = b % 9 || 9;
  const aOdd = ar % 2 === 1, bOdd = br % 2 === 1;
  let r1;
  if (aOdd && !bOdd) r1 = "A";
  else if (bOdd && !aOdd) r1 = "B";
  else r1 = ar > br ? "A" : br > ar ? "B" : "تكافؤ";
  const ae = BATTLE_ELEMENT_OF_REM4[a % 4], be = BATTLE_ELEMENT_OF_REM4[b % 4];
  let r2 = "تكافؤ";
  if (ae === be) r2 = a > b ? "A" : b > a ? "B" : "تكافؤ";
  else for (const [w, l] of BATTLE_ELEMENT_VICTORY) {
    if (ae === w && be === l) { r2 = "A"; break; }
    if (be === w && ae === l) { r2 = "B"; break; }
  }
  // قاعدةٌ ثالثة [سرّ الأسرار ص ١١]: نار+هواء أصدقاء، ماء+تراب أصدقاء،
  // و{نار،هواء} ضدّ {ماء،تراب}. عند التضادّ يغلب الأكبرُ جُمّلًا؛ عند الصداقة تكافؤٌ ودّيّ.
  const fr = ELEMENT_FRIENDSHIP[ae];
  let r3;
  if (fr && fr.foes.includes(be)) r3 = a > b ? "A" : b > a ? "B" : "تكافؤ";
  else r3 = "تكافؤ (صداقةٌ عنصريّة)";
  const votes = [r1, r2, r3].filter((v) => v === "A" || v === "B");
  const aWins = votes.filter((v) => v === "A").length;
  const bWins = votes.filter((v) => v === "B").length;
  const winner = aWins > bWins ? "A" : bWins > aWins ? "B"
    : votes.length === 0 ? "تكافؤ" : "متكافئان (تعادلت القواعد)";
  const confidence = (aWins === 3 || bWins === 3) ? "قويّ جدًّا"
    : (aWins === 2 || bWins === 2) ? "قويّ"
    : (winner.startsWith("متكافئ") || winner === "تكافؤ") ? "متكافئ" : "متوسّط";
  const nm = (w) => (w === "A" ? normalize(nameA) : w === "B" ? normalize(nameB) : w);
  return {
    method,
    a: { name: normalize(nameA), value: a, rem9: ar, rem4: a % 4, element: ae, parity: aOdd ? "فرد" : "زوج" },
    b: { name: normalize(nameB), value: b, rem9: br, rem4: b % 4, element: be, parity: bOdd ? "فرد" : "زوج" },
    rule1: { winner: r1, winnerName: nm(r1) },
    rule2: { winner: r2, winnerName: nm(r2) },
    rule3: { winner: r3, winnerName: nm(r3.startsWith("تكافؤ") ? r3 : r3) },
    winner, winnerName: winner === "A" ? normalize(nameA) : winner === "B" ? normalize(nameB) : winner,
    confidence,
    trace: [
      `جُمّل «${normalize(nameA)}» (${method}) = ${a} ⇒ ÷٩ باقٍ ${ar} (${aOdd ? "فرد" : "زوج"})، ÷٤ ⇒ عنصرُه ${ae}`,
      `جُمّل «${normalize(nameB)}» (${method}) = ${b} ⇒ ÷٩ باقٍ ${br} (${bOdd ? "فرد" : "زوج"})، ÷٤ ⇒ عنصرُه ${be}`,
      `قاعدةُ الأعداد (فرديّة وباقٍ) ⇒ الغالب: ${nm(r1)}`,
      `قاعدةُ العناصر (${ae} × ${be}) ⇒ الغالب: ${nm(r2)}`,
      `قاعدةُ الصداقة العنصريّة (نار+هواء / ماء+تراب) ⇒ ${r3.startsWith("تكافؤ") ? r3 : "الغالب: " + nm(r3)}`,
      `الحكم بأغلبيّة القواعد الثلاث: ${winner === "A" ? "يغلب " + normalize(nameA) : winner === "B" ? "يغلب " + normalize(nameB) : winner} — ثقة: ${confidence}`,
      "طرحٌ وقسمةٌ ومقارنةُ جداول — لا شيء يُقرأ عن أحد.",
    ],
  };
}

/**
 * طبُّ الحروف [السرّ المكشوف في طبّ الحروف — الطوخي]: يُختار حرفٌ من اسم المريض
 * (أوّلُ حرفٍ) أو بحسابٍ يُسقَط بـ٢٨، فيُخرَج له سببُ المرض وعلامتُه وعلاجُه من الجدول.
 * @param {string} patientName اسمُ المريض
 * @param {object} [opt]
 * @param {string} [opt.fatherName]  اسمُ الأب (للطريقة الحسابيّة)
 * @param {string} [opt.motherName]  اسمُ الأمّ
 * @param {string} [opt.weekday]     اسمُ يوم الأسبوع (أحد..سبت)
 * @param {number} [opt.arabicDate]  اليومُ من الشهر العربيّ
 * @param {"first"|"computed"} [opt.method="computed"]
 */
export function letterMedicine(patientName, opt = {}) {
  const name = normalize(patientName || "");
  const trace = [];
  let letter, rem, total;
  if (opt.method === "first" || (!opt.fatherName && !opt.motherName && !opt.weekday && opt.arabicDate == null)) {
    letter = letters(name)[0] || "ا";
    trace.push(`الطريقة الأولى: أوّلُ حرفٍ من «${name}» ⇒ «${letter}».`);
  } else {
    total = jummal(name)
      + (opt.fatherName ? jummal(opt.fatherName) : 0)
      + (opt.motherName ? jummal(opt.motherName) : 0)
      + (opt.weekday ? jummal(opt.weekday) : 0)
      + (Number(opt.arabicDate) || 0);
    rem = total % 28 || 28;
    letter = ABJAD_ORDER[rem - 1];
    trace.push(`الطريقة الحسابيّة: جُمّل(المريض ${jummal(name)}${opt.fatherName ? ` + الأب ${jummal(opt.fatherName)}` : ""}${opt.motherName ? ` + الأمّ ${jummal(opt.motherName)}` : ""}${opt.weekday ? ` + اليوم ${jummal(opt.weekday)}` : ""}${opt.arabicDate ? ` + التاريخ ${opt.arabicDate}` : ""}) = ${total}`);
    trace.push(`إسقاطٌ بـ٢٨ ⇒ الباقي ${rem} ⇒ الحرفُ رقم ${rem} في أبجد ⇒ «${letter}».`);
  }
  let entry = LETTER_AILMENTS[letter];
  let substituted = null;
  if (!entry) {
    // «خ»/«ذ» غير مُفردَين في طبعة الرجال ⇒ أقربُ حرفٍ سابقٍ في الجدول
    const order = Object.keys(LETTER_AILMENTS);
    const idx = ABJAD_ORDER.indexOf(letter);
    for (let k = idx - 1; k >= 0; k--) {
      if (LETTER_AILMENTS[ABJAD_ORDER[k]]) { substituted = ABJAD_ORDER[k]; entry = LETTER_AILMENTS[substituted]; break; }
    }
    entry = entry || LETTER_AILMENTS["ا"];
    trace.push(`«${letter}» لا بابَ له في طبعة الرجال ⇒ يُرجَع لأقرب حرفٍ «${substituted}».`);
  }
  trace.push("تشخيصٌ ثابتٌ لكلّ من وقع اسمُه على هذا الحرف — لا فحصَ ولا صلةَ بالبدن.");
  return {
    patient: name, letter, substitutedFrom: substituted,
    rem: rem ?? null, total: total ?? null,
    cause: entry.cause, sign: entry.sign, cure: entry.cure,
    method: TIBB_METHOD, note: TIBB_NOTE, source: TIBB_SRC.title, trace,
  };
}

/**
 * «كتابُ اسمِ اللهِ الأعظمِ» — الإطارُ المرجعيّ (البسطان، الأحدَ عشرَ اسمًا، طريقةُ
 * الكعبِ ومثالُها، جدولُ خدّامِ الأيّام) [السحر العظيم، القسم الثاني، ص ٩٨–١١٣].
 * وإن مُرِّرَ اسمٌ: بسطُه وعددُ حروفِه و«كعبُه» (n²) — الخطوةُ الآليّةُ الممكنة.
 */
export function bookOfNames(name) {
  const out = {
    heading: ASM_AZAM.HEADING,
    premise: ASM_AZAM.PREMISE,
    methods: ASM_AZAM.TWO_METHODS,
    elevenNames: ASM_AZAM.ELEVEN_NAMES,
    twelfthNameNote: ASM_AZAM.TWELFTH_NAME_NOTE,
    kaabMethod: ASM_AZAM.KAAB_METHOD,
    dayServants: ASM_AZAM.DAY_SERVANTS,
    source: ASM_AZAM.SOURCE_META.title,
    note: ASM_AZAM.NOTE,
  };
  if (name) {
    const parts = bast(name).parts;          // بسطُ الاسم (نطقُ الحروف)
    const spelled = parts.map((p) => p.name).join("");
    const n = letters(spelled).length;
    out.forName = {
      name: normalize(name),
      bast: spelled,
      spelledParts: parts.map((p) => p.name),
      letterCount: n,
      kaab: n * n,
      note: "«الكعبُ» = عددُ حروفِ البسطِ مضروبًا في نفسِه؛ ما بعدَه (إسقاطُ الكعبِ ⇒ لفظةُ المَلِك) مقتضبٌ في الأصل.",
    };
  }
  return out;
}

export const SOURCES = { ...SOURCES_META, sirr_makshuf: TIBB_SRC, asm_azam: ASM_AZAM.SOURCE_META };
export const AYQANIYYA_GROUPS = AYQANIYYA;

export default {
  normalize,
  letters,
  letterMedicine,
  letterValue,
  saghir,
  digitalRoot,
  value,
  jummal,
  bast,
  taksirBasit,
  taksirMurakkab,
  analyzeLetters,
  fromNameAndMother,
  methods,
  allMethods,
  natureOf,
  letterZodiac,
  letterCorrespondences,
  bookOfNames,
  analyze,
  nameBattle,
  AYQANIYYA_GROUPS,
  SOURCES,
};
