// engines/zairja.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك زايرجة العالم
//
// وصف ابن خلدون في «المقدّمة» (الفصل في الزايرجة) آلةً لاستخراج جوابٍ منظومٍ
// عن سؤال: دائرةٌ كبرى فيها حلقاتٌ متراكزة تحمل الحروف وأعدادها وبروجها
// ومنازلها، وجدولٌ من ٥٥ عمودًا و١٣١ صفًّا. تُدار عمليةٌ حسابية طويلة
// (تضعيفٌ، وزيادةُ درجة الطالع، وإسقاطٌ بـ٤ و١٢ و٢٨، وتنقّلٌ في الحلقات
// بأعدادٍ محسوبة، وانتقاءُ حروفٍ من الجدول) فيخرج بيتٌ من الشعر على وزن
// «الوَتَر» (بيتٍ حاكمٍ) وقافيته.
//
// الجدول الأصلي لم يصل كاملًا متطابقًا في المخطوطات، ولا ابن خلدون سرد كل
// القِيَم. لذلك هنا:
//   - الحلقات مُصاغة كإزاحاتٍ ثابتة على ترتيب الحروف (كما يوحي وصفه).
//   - الجدول مُولَّد بقاعدةٍ ثابتة صريحة (بديلٌ محدَّد عن الأصل المفقود).
//   - العملية الحسابية تتبع خطواته الموصوفة وتُعيد `trace` كاملًا.
// النتيجة حتمية بالكامل — وهذا في ذاته وجه المسألة: حتى أنصار الزايرجة لا
// يستطيعون إعادة إنتاج جواب ابن خلدون نفسه حرفيًا.
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import { ABJAD_ORDER } from "../data/abjad.data.js";
import { ZP } from "../data/zairja-verses.data.js";
import {
  PROCEDURE as HND_PROCEDURE, tableSir, tablePageAnswer, TOPIC_SLOTS,
  ANSWER_BANK, SOURCE_META as HND_SRC, HANDASIYA_NOTE,
  OFFICIAL_31_TOPICS, ADJUSTMENT_RULES,
} from "../data/zairja-handasiya.data.js";
import {
  DAY_TABLE, SIGNS12, ISHAI_TABLE, BASE_SQUARE, HOUR_COUNT, HOUR_PLANET_NUM,
  MOD_CYCLE, NAME_MOD, SECRETS, PROCEDURE as CLS_PROCEDURE,
  SOURCE_META as CLS_SRC, CLASSIC_NOTE,
  QUTB_BANI_WAHB, ISM_ALLAH_JUMMAL, TABAI_ISQAT, QUTB_28, FASL_ISQAT_CHAIN, FASL_NOTE,
} from "../data/zairja-classical.data.js";

const N = 28;
const letterAt = (n) => ABJAD_ORDER[(((n - 1) % N) + N) % N];
const orderOf = (ch) => ABJAD_ORDER.indexOf(ch) + 1;
const castOut = (v, m) => { const r = ((Math.trunc(v) % m) + m) % m; return r === 0 ? m : r; };

// ── الحلقات الأربع (إزاحات ثابتة على ترتيب الحروف) ───────────────────────
export const RINGS = [0, 7, 14, 21].map((shift) =>
  ABJAD_ORDER.map((_, i) => ABJAD_ORDER[(i + shift) % N])
);

// ── الجدول (٥٥ × ١٣١) — قاعدة توليد ثابتة، بديلٌ محدَّد عن الأصل المفقود ──
export const TABLE_COLS = 55;
export const TABLE_ROWS = 131;
export function tableCell(row, col) {
  // قاعدة حتمية صريحة: تخلط رقم الصف والعمود وحاصل ضربهما ثم تُسقِط بـ28.
  return letterAt(castOut(row * 7 + col * 13 + row * col + 1, N));
}

// ── «تشكيل» جواب الزايرجة ───────────────────────────────────────────────
// المشغِّلُ يُركِّب البيتَ من صدرٍ وعجزٍ (من data/zairja-verses.data.js):
//   - الصدرُ يُختار بمؤشّرٍ من (درجة الطالع + جُمّل السؤال)
//   - العجزُ بمؤشّرٍ من (جُمّل الحروف المستخرَجة) على قافيةِ الوَتَر
// فالناتجُ دالّةٌ فعليّةٌ في السؤال ودرجة الطالع (من الميلاد)، لا انتقاءٌ من قائمةٍ قصيرة.

// تصنيف موضوع السؤال من كلماته (مثل ما «يقرأ» المشغِّل نيّةَ السائل)
const TOPIC_WORDS = {
  // تُفحَص أوّلًا عمدًا: سؤالٌ مثل «سحر تفريق بيني وبين زوجي» يحوي كلماتٍ من أكثر من
  // بابٍ معًا، والسحر/العين/الجنّ بابٌ له طريقتُه الخاصّة (رملٌ مزدوجُ البيت + طبُّ
  // الحروف) فلا يجوز أن يبتلعه بابُ المحبّة أو الصحّة العامّ.
  سحر: ["سحر", "مسحور", "مسحورة", "مربوط", "معطل", "تعطيل", "مدفون", "دفين", "ملبوس", "تلبس", "ممسوس", "جني", "الجن", "جن", "تابعة", "قرين", "حسد", "عين", "استحضار", "طرد", "حرز", "تحصين", "وقاية"],
  محبة: ["زوج", "زواج", "اتزوج", "زواجي", "خطب", "خطبة", "حب", "احب", "تحب", "عريس", "عروس", "شريك", "مناسب", "علاقة", "طلاق", "فراق", "رجوع", "صلح", "الحبيب", "احبها", "احبه"],
  صحة: ["شفاء", "اشفى", "يشفى", "نشفى", "مرض", "مرضي", "علاج", "عملية", "تعب", "وجع", "الم", "المريض", "دواء", "صحة", "يتعافى", "اتعافى", "المرض"],
  رزق: ["رزق", "مال", "مالي", "عمل", "عملي", "وظيف", "مشروع", "تجارة", "صفقة", "ربح", "اربح", "دين", "مبلغ", "راتب", "ترقية", "شغل", "فلوس", "دخل"],
  سفر: ["سفر", "اسافر", "هجرة", "اهاجر", "غائب", "المسافر", "انتقل", "بلد", "خارج", "الغربة"],
  قضية: ["قضية", "دعوى", "محكمة", "خصم", "خصوم", "نزاع", "مشكلة", "محبوس", "سجن", "المحبوس", "نزع", "خصومة", "منازعة"],
  دراسة: ["امتحان", "دراسة", "ادرس", "تخصص", "جامعة", "منحة", "شهادة", "انجح"]
};
function classifyTopic(text) {
  const n = abjad.normalize(text);
  for (const [topic, words] of Object.entries(TOPIC_WORDS))
    if (words.some((w) => n.includes(abjad.normalize(w)))) return topic;
  return "عام";
}

/**
 * «تشكيل» الجواب: يُركِّبُ المشغِّلُ بيتًا من صدرٍ وعجزٍ يوافقان موضوعَ السؤال.
 *   الصدر: مؤشّرُه من (درجة الطالع D + جُمّل السؤال Q)
 *   العجز: مؤشّرُه من (جُمّل الحروف المستخرَجة) على قافيةِ الوَتَر ما أمكن
 * فالناتجُ يتغيّر فعليًّا بتغيّر السؤال ودرجة الطالع.
 * @returns {{verse:string, sentiment:number, topic:string, open:string, close:string}}
 */
function shapeAnswer(rawLetters, w, D, Q, trace, topic) {
  const rawVal = abjad.jummal(rawLetters.join(""));
  const parts = ZP[topic] || ZP["عام"];
  const oi = castOut(D + Q, parts.open.length) - 1;              // 0..open.length-1
  const rhymed = parts.close.filter((c) => c.r === w.rhymeLetter);
  const closePool = rhymed.length ? rhymed : parts.close;
  const ci = castOut(rawVal + D, closePool.length) - 1;
  const open = parts.open[oi];
  const close = closePool[ci];
  const verse = `${open} ${close.t}`;

  trace.push(`«التشكيل»: موضوعُ السؤال ≈ «${topic}» (${parts.open.length} صدرًا × ${parts.close.length} عجزًا)`);
  trace.push(`الصدر: (درجة الطالع ${D} + جُمّل السؤال ${Q}) ⇒ الفهرس ${oi} ⇒ «${open}»`);
  trace.push(`العجز: من ${closePool.length} عجزًا${rhymed.length ? ` بقافية «${w.rhymeLetter}»` : ` (لا عجزَ على القافية ⇒ يُرسِلُه المشغِّلُ إرسالًا)`}؛ (جُمّل الخام ${rawVal} + ${D}) ⇒ الفهرس ${ci} ⇒ «${close.t}»`);
  trace.push(`⇒ البيتُ المُركَّب: «${verse}» — والمشغِّلُ يزعمُ أنّ الحروفَ الخامَ دلّت عليه.`);
  trace.push("هنا موضعُ الحيلة: المخرَجُ الخامُ ضوضاءٌ، والمعنى يُدخِلُه المشغِّلُ بتركيبِ صدرٍ وعجزٍ يُلوّنُهما بموضوعِ سؤالك.");
  return { verse, sentiment: close.s, topic, open, close: close.t };
}

// ── تحليل الوَتَر (البيت الحاكم) ─────────────────────────────────────────
function analyzeWatar(watar) {
  const letters = abjad.letters(watar);
  return {
    letters,
    length: letters.length,
    rhymeLetter: letters.at(-1) || "ا",
    value: abjad.jummal(watar)
  };
}

// ── العملية ─────────────────────────────────────────────────────────────
/**
 * @param {string} question  السؤال
 * @param {object} [opt]
 * @param {number} [opt.ascendantDegree=1]  درجة الطالع 1..360 (من محرّك الفلك)
 * @param {number} [opt.cycle=361]           «الدور الأكبر» عند ابن خلدون
 * @param {string} [opt.watar]               البيت الحاكم (يحدّد الطول والقافية)
 * @param {number} [opt.answerLength]        تجاوزٌ يدويّ لطول الجواب بالحروف
 * @returns {{answer:string, rhymeLetter:string, picks:Array, trace:string[], note:string}}
 */
export function operate(question, opt = {}) {
  const D = castOut(opt.ascendantDegree ?? 1, 360);
  const cycle = opt.cycle ?? 361;
  const watar = opt.watar ?? "بِسْمِ الإِلَهِ وَبِهِ نَسْتَعِينُ";
  const w = analyzeWatar(watar);
  const answerLen = opt.answerLength ?? w.length;

  const trace = [];
  const qLetters = abjad.letters(question);
  const Q = abjad.jummal(question);
  trace.push(`حروف السؤال (${qLetters.length}): ${qLetters.join(" ")}`);
  trace.push(`جُمّل السؤال Q = ${Q}`);
  trace.push(`درجة الطالع D = ${D}`);
  trace.push(`الدور الأكبر = ${cycle}`);
  trace.push(`الوَتَر: «${watar}» — طوله ${w.length} حرفًا، قافيته «${w.rhymeLetter}»، جُمّله ${w.value}`);

  // نقطة البدء: (جُمّل السؤال + درجة الطالع + الدور) مُسقَطة بـ28
  let idx = castOut(Q + D + cycle, N);
  // الخطوة: (درجة الطالع مُسقَطة بـ12) + 1  — كما يستعمل ابن خلدون إسقاط البروج
  const step = castOut(D, 12) + 1;
  // ضربٌ في «التضعيف»: جُمّل الوتر مُسقَط بـ7 (تنقّل الحلقات السبعيّ)
  const ringHop = castOut(w.value, 7);
  trace.push(`نقطة البدء = إسقاط(${Q} + ${D} + ${cycle} ، 28) = ${idx} ⇒ «${letterAt(idx)}»`);
  trace.push(`الخطوة = إسقاط(${D}،12) + 1 = ${step}`);
  trace.push(`قفزة الحلقة = إسقاط(جُمّل الوتر ${w.value}، 7) = ${ringHop}`);

  const picks = [];
  for (let i = 0; i < answerLen; i++) {
    const ring = RINGS[(i + ringHop) % 4];
    const ringLetter = ring[idx - 1];
    // مرجع الجدول: صفٌّ من Q، عمودٌ متحرّك
    const row = castOut(Q + i * step, TABLE_ROWS) - 1;
    const col = castOut(D + i * ringHop, TABLE_COLS) - 1;
    const cell = tableCell(row, col);
    // قاعدة الغلبة: إن كان مجموع رتبتَي الحرفين زوجيًا يُؤخذ حرف الحلقة، وإلا حرف الجدول
    const pick = (orderOf(ringLetter) + orderOf(cell)) % 2 === 0 ? ringLetter : cell;
    picks.push({ i: i + 1, idx, ring: (i + ringHop) % 4, ringLetter, cell, pick });
    trace.push(
      `#${i + 1}: حلقة ${(i + ringHop) % 4} خانة ${idx} ⇒ «${ringLetter}» | جدول (${row + 1},${col + 1}) ⇒ «${cell}» | المأخوذ «${pick}»`
    );
    idx = castOut(idx + step + orderOf(pick), N);
  }

  const rawLetters = picks.map((p) => p.pick);
  let answerRaw = rawLetters.join("");
  if (answerRaw.at(-1) !== w.rhymeLetter) answerRaw += w.rhymeLetter;
  trace.push(`المخرَج الخام (ما تُعطيه الآلةُ فقط): «${rawLetters.join(" ")}»`);

  // خطوة «التشكيل» التي يفعلها المشغِّل بيده
  const topic = opt.topic || classifyTopic(question);
  const shaped = shapeAnswer(rawLetters, w, D, Q, trace, topic);

  return {
    answer: shaped.verse,   // البيتُ «المقروء» بعد تشكيل المشغِّل
    sentiment: shaped.sentiment, // ميل الجواب: 1 سعد، 0 وسط، -1 نحس
    topic: shaped.topic,
    answerRaw,              // الحروفُ الخامُ التي تخرجُ من الآلة
    rawLetters,
    rhymeLetter: w.rhymeLetter,
    startIndex: castOut(Q + D + cycle, N),
    step,
    ringHop,
    picks,
    trace,
    note:
      "الآلةُ لا تُخرِجُ إلا حروفًا مبعثرة (answerRaw). الجوابُ «المنظوم» (answer) يصنعُه " +
      "المشغِّلُ في خطوة «التشكيل»: يختارُ شطرًا ويُقوِّمُه على القافية — وهنا يُدَسُّ المعنى. " +
      "الجدولُ الأصليُّ للزايرجة مفقودٌ متطابقًا؛ وهذا تطبيقٌ حتميٌّ للخطوات الموصوفة."
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// «الزايرجة الهندسية» (الطوخي) — الطريقة العمليّة المبسَّطة
// جُمّلُ السؤال ⇒ إسقاطٌ ⇒ جدولُ حروف السرّ ⇒ جدولُ الصفحة والجواب ⇒ بيتٌ مرقَّم.
// حتميّةٌ تمامًا. المخرَجُ بيتٌ شعريٌّ عموميّ يُدرَجُ فيه معنى السائل.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {string} question السؤال
 * @returns {{secretLetter, questionValue, baqi, sirNumber, pageNumber,
 *            answerNumber, topic, verse, trace, note}}
 */
// تصنيفُ نيّة السائل إلى أحدِ المواضيع الواحدِ والثلاثين الرسميّة [ص٦٢-٦٣،٦٦-٦٧]
// — تقريبيٌّ بالكلمات المفتاحيّة (الكتابُ نفسُه يفترض مُشغِّلًا يفهم كلامَ السائل).
const OFFICIAL_TOPIC_WORDS = [
  [8, ["غائب", "المفقود", "اختفى", "فقدان شخص"]],
  [9, ["رؤيا", "حلم", "منام", "رأيت في نومي"]],
  [14, ["مسجون", "سجن", "محبوس", "معتقل"]],
  [15, ["سرقة", "سرق", "ضاع مني", "المسروق"]],
  [12, ["اعداء", "عدو", "خصوم"]],
  [16, ["قضية", "محكمة", "دعوى", "الحكومة"]],
  [22, ["حج", "حجة", "عمرة"]],
  [17, ["سفر", "هجرة", "رحلة", "اسافر"]],
  [29, ["نقلة", "انتقال", "تنقل", "انتقل"]],
  [21, ["تجارة", "التجارة", "ربح تجارتي", "رزق", "مالي", "مشروع", "ترقيتي", "صفقة", "ارزق", "ياكل رزقي"]],
  [3, ["ابيع", "بيع", "بايع"]],
  [4, ["اشتري", "شراء", "شرا"]],
  [25, ["شركة", "شريكي", "المشاركة"]],
  [27, ["كيمياء", "كيميا", "الصنعة"]],
  [6, ["دواء الحبل", "دواء للحمل", "علاج الحمل"]],
  [7, ["تلد", "جنس المولود", "ذكر ام انثى"]],
  [5, ["اولاد", "ابن", "انجاب", "يكون لي ولد", "ارزق باطفال", "احمل"]],
  [11, ["مريض", "مرض", "يبرا", "اشفى", "شفاء", "علة", "عملية", "علاج"]],
  [13, ["زواج", "تزوج", "خطوبة", "اتزوج", "عريس", "يخطبني", "خيانة", "يخونني", "يصطلح الزوجان", "طلاق", "فراق", "تعود العلاقة"]],
  [24, ["حبيب", "حبيبي", "يحبني", "مرتبط بغيري", "طرف ثالث يفرق"]],
  [23, ["صديق", "صداقة", "يخلص لي"]],
  [30, ["صلح", "وفاق", "مصالحة"]],
  [26, ["اشاعة", "الخبر", "صدق ام كذب"]],
  [10, ["وظيفة", "الوظيفة"]],
  [18, ["العلم", "انول العلم"]],
  [19, ["قضاء الحاجة", "تقضى الحاجة"]],
  [20, ["ادرك الامر", "انجح فيه", "نجاح الامر"]],
  [2, ["كنز", "كنوز", "دفين", "مدفون"]],
  [28, ["ضيق", "همّ", "كرب", "الهم"]],
  [31, ["عاقبة", "اخر الامر", "نهاية الامر"]],
  [1, ["معيشة", "عيش", "سعيدا ام تعيسا"]],
];
export function classifyOfficialTopic(question) {
  const n = abjad.normalize(question);
  for (const [num, words] of OFFICIAL_TOPIC_WORDS)
    if (words.some((w) => n.includes(abjad.normalize(w)))) return OFFICIAL_31_TOPICS[num - 1];
  return OFFICIAL_31_TOPICS[0]; // المعيشة: موضوعٌ عامٌّ افتراضيّ حين لا يتّضح غيره
}

// عمرُ القمر التزامنيّ (تقريبٌ لـ«الماضي من الشهر العربي») — نفس تقريب isBadDay.
function lunarDayOfMonth(date) {
  const d = date ? new Date(date) : new Date();
  const synodic = 29.53058867;
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const age = (((d.getTime() - ref) / 86400000) % synodic + synodic) % synodic;
  return Math.floor(age) + 1;
}

/**
 * تعديلُ السؤال [ص٦٠-٦١،٦٤-٦٥]: تفصيلٌ إضافيٌّ يُحتاج لبعض المواضيع قبل الجمع.
 * opt.adjustmentName / adjustmentName2: نصٌّ يُحسَب جُمّلُه (اسمُ الشيء/الشخص المعنيّ).
 * opt.eventDate: تاريخُ الحدث (يوم السرقة/السفر/المرض..) لحساب «الماضي من الشهر».
 * إن لم تُعطَ التفاصيلُ اللازمة، القيمةُ صفرٌ والنتيجةُ تقريبيّةٌ بقدر ذلك — صريحًا.
 */
function computeAdjustment(topicN, opt) {
  const rule = ADJUSTMENT_RULES[topicN] || { kind: "none" };
  const nameVal = opt.adjustmentName ? abjad.jummal(opt.adjustmentName) : 0;
  const name2Val = opt.adjustmentName2 ? abjad.jummal(opt.adjustmentName2) : 0;
  const dateVal = opt.eventDate ? lunarDayOfMonth(opt.eventDate) : 0;
  const yearVal = opt.eventDate ? new Date(opt.eventDate).getFullYear() : (opt.when ? new Date(opt.when).getFullYear() : 0);
  let value = 0, used = [];
  switch (rule.kind) {
    case "none": break;
    case "name1": value = nameVal; used = nameVal ? ["اسمٌ"] : []; break;
    case "name2": value = nameVal + name2Val; used = (nameVal || name2Val) ? ["اسمان"] : []; break;
    case "date": value = dateVal; used = dateVal ? ["تاريخُ الحدث"] : []; break;
    case "name_date": value = nameVal + dateVal; used = [...(nameVal ? ["اسمٌ"] : []), ...(dateVal ? ["تاريخُ الحدث"] : [])]; break;
    case "name_year": value = nameVal + yearVal; used = [...(nameVal ? ["اسمٌ"] : []), ...(yearVal ? ["سنةٌ"] : [])]; break;
  }
  return { kind: rule.kind, desc: rule.desc, value, note: used.length ? `استُعمِل: ${used.join(" و")}.` : (rule.kind === "none" ? "لا تعديل لهذا الموضوع." : "لم تُعطَ تفاصيلُ التعديل — استُعمِل صفرٌ، فالنتيجةُ تقريبيّةٌ بقدر ذلك.") };
}

/**
 * الزايرجة الهندسية — النسخةُ المصحَّحة على الطريقة الرسميّة [ص٦٧]: «نسبةُ
 * السؤال» لا تُحسَب من جُمّل نصّ السؤال، بل من تصنيف نيّة السائل إلى أحد
 * المواضيع الواحد والثلاثين (رقمُه الثابت) + تعديل السؤال إن وُجد + جُمّل اسم
 * الطالب واسم أمّه — ثم يُجمَع الكلُّ ويُسقَط بالمرائب التسعة، وباقي الأنبوب
 * (جدولا حروف السرّ والصفحة) كما كان.
 * @param {string} question
 * @param {{name?:string, mother?:string, adjustmentName?:string, adjustmentName2?:string, eventDate?:Date|string, when?:Date|string}} [opt]
 */
export function handasiya(question, opt = {}) {
  const trace = [];
  const official = classifyOfficialTopic(question);
  const nameVal = abjad.jummal(opt.name || "");
  const motherVal = abjad.jummal(opt.mother || "");
  const adjustment = computeAdjustment(official.n, opt);
  const rawQuestionJummal = abjad.jummal(String(question || ""));

  const Q = nameVal + motherVal + official.n + adjustment.value;
  const baqi1 = castOut(Q, 9);
  const secretLetter = letterAt(castOut(Q, N));
  const col1 = castOut(orderOf(secretLetter), 16) - 1;
  trace.push(`تصنيفُ السؤال: «${official.topic}» (الموضوعُ الرسميّ رقم ${official.n} من ٣١ — نصُّه الرسميّ: «${official.question}»).`);
  trace.push(`تعديلُ السؤال [${official.n}]: ${adjustment.desc} ⇒ ${adjustment.value} (${adjustment.note})`);
  trace.push(`نسبةُ السؤال = جُمّل(الاسم)=${nameVal} + جُمّل(الأمّ)=${motherVal} + رقمُ الموضوع=${official.n} + التعديل=${adjustment.value} = ${Q}`);
  trace.push(`الباقي = إسقاط(${Q}، ٩) = ${baqi1}`);
  trace.push(`حرفُ السرّ = إسقاط(${Q}، ٢٨) على أبجد ⇒ «${secretLetter}» (عمودُه ${col1 + 1})`);

  const sirNumber = tableSir(baqi1, col1);
  trace.push(`جدولُ حروف السرّ [${baqi1}][${col1 + 1}] ⇒ عددُ السرّ = ${sirNumber}`);

  const baqi2 = castOut(sirNumber, 9);
  const col2 = castOut(sirNumber, 16) - 1;
  const pageNumber = tablePageAnswer(baqi2, col2);
  trace.push(`جدولُ الصفحة والجواب [${baqi2}][${col2 + 1}] ⇒ رقمُ الصفحة = ${pageNumber}`);

  const answerNumber = castOut(pageNumber, 9);
  const topic = TOPIC_SLOTS[answerNumber];
  trace.push(`رقمُ الجواب = إسقاط(${pageNumber}، ٩) = ${answerNumber} ⇒ بابُ البيت (من التسعة المُدرَجة) «${topic}»`);

  const pool = ANSWER_BANK[answerNumber] || ANSWER_BANK[1];
  const verse = pool[pageNumber % pool.length];
  trace.push(`في الصفحة ${pageNumber}: الروايةُ ${(pageNumber % pool.length) + 1} من ${pool.length} ⇒ البيت.`);
  trace.push(official.n === Number(answerNumber) || TOPIC_SLOTS[answerNumber]
    ? "بابُ البيت المُخرَج (من الأبواب التسعة المُدرَجة أبياتُها) لا يُطابِق بالضرورة الموضوعَ الرسميَّ الذي صُنِّف منه سؤالُك (٣١ بابًا) — لأنّ أنبوب الحساب يمرّ بجداولَ وسيطة لا علاقةَ مباشرةً لها بالموضوع؛ وهذا مذكورٌ صراحةً لا مُخفًى."
    : "لم يُوجَد بيتٌ مُدرَجٌ لهذا الباب — استُعمِل باب البيع افتراضيًّا.");

  return {
    officialTopic: official, adjustment,
    secretLetter, questionValue: Q, rawQuestionJummal, baqi: baqi1,
    sirNumber, pageNumber, answerNumber, topic,
    topicNote: "بابُ البيت مُشتقٌّ من أنبوب حسابٍ يمرّ بجداولَ وسيطةٍ اعتباطيّة، فقد يقعُ في بابٍ لا يماثلُ الموضوعَ الرسميَّ الذي صُنِّف منه سؤالُك، أو معناه — وهذا من طبيعةِ هذه الطريقة نفسِها لا خللًا في الحساب.",
    verse, procedure: HND_PROCEDURE, trace,
    source: HND_SRC.title, note: HANDASIYA_NOTE,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// «زايرجة العالم» الكلاسيكية (الطوخي ج١+ج٢) — جدولُ العمل من ٩ مواقع
// جملةُ الدخل + المفتاح + أنبوبُ الحساب (المجموع→الحاصل→%٨٤→السطر المعدّل→
// العادل المطلوب) ⇒ حرفٌ لكلّ موقع ⇒ جملةُ الجواب. حتميٌّ تمامًا.
// ─────────────────────────────────────────────────────────────────────────────
const clsCast = (v, m) => { const r = ((Math.trunc(v) % m) + m) % m; return r; };

/** يعدّل باقيَ٨٤ بـ∓٧ ليصير قابلًا للقسمة على ٣ [ج٢، متحقَّق]. */
function adjustLine(rem84) {
  const r = clsCast(rem84, 3);
  return r === 1 ? rem84 - 7 : r === 2 ? rem84 + 7 : rem84;
}

/**
 * @param {string} question السؤال
 * @param {object} [opt]
 * @param {number} [opt.ascendantDegree] درجةُ الطالع 1..360 (من محرّك الفلك)
 * @param {number|string} [opt.weekday] يومُ الأسبوع: رقمٌ 0..6 (0=أحد) أو اسمٌ عربيّ
 * @param {Date|string|number} [opt.when] تاريخٌ يُشتَقّ منه اليومُ إن لم يُمرَّر weekday (حتميّ)
 * @param {string} [opt.motherName] اسمُ الأمّ (لبواقي إسقاط الاسم)
 * @param {number} [opt.letters=9] عددُ حروف الجواب (مواقع)
 */
const _DAY_NAME_IDX = {
  "أحد": 0, "الأحد": 0, "اثنين": 1, "الاثنين": 1, "إثنين": 1, "الإثنين": 1,
  "ثلاثاء": 2, "الثلاثاء": 2, "أربعاء": 3, "الأربعاء": 3, "خميس": 4, "الخميس": 4,
  "جمعة": 5, "الجمعة": 5, "سبت": 6, "السبت": 6,
};
function _resolveWeekday(w, when) {
  if (typeof w === "number" && Number.isFinite(w)) return ((Math.trunc(w) % 7) + 7) % 7;
  if (typeof w === "string" && _DAY_NAME_IDX[w.trim()] != null) return _DAY_NAME_IDX[w.trim()];
  const d = when != null ? new Date(when) : null;      // حتميّ: من تاريخٍ مُمرَّر
  return d && !isNaN(d.getTime()) ? d.getDay() : 0;     // لا new Date()؛ الافتراضُ الأحد
}
export function operateClassical(question, opt = {}) {
  const trace = [];
  const asc = clsCast((opt.ascendantDegree ?? 100) - 1, 360) + 1;
  const talIdx = Math.floor((asc - 1) / 30) % 12;        // برجُ الطالع
  const tali3 = SIGNS12[talIdx];
  const bayt4 = SIGNS12[(talIdx + 3) % 12];
  const bayt7 = SIGNS12[(talIdx + 6) % 12];
  const bayt10 = SIGNS12[(talIdx + 9) % 12];
  const wd = _resolveWeekday(opt.weekday, opt.when);
  const D = DAY_TABLE[wd] || DAY_TABLE[0];

  const Q = abjad.jummal(String(question || ""));
  const parts = {
    "السؤال": Q,
    "اليوم": abjad.jummal(D.day),
    "كوكب اليوم": abjad.jummal(D.planet),
    "معدن اليوم": abjad.jummal(D.metal),
    "مَلَك اليوم": abjad.jummal(D.angel),
    "الطالع": abjad.jummal(tali3),
    "الرابع": abjad.jummal(bayt4),
    "السابع": abjad.jummal(bayt7),
    "العاشر": abjad.jummal(bayt10),
  };
  const jumla = Object.values(parts).reduce((a, b) => a + b, 0);
  trace.push(`الطالع: ${tali3} (٤=${bayt4}، ٧=${bayt7}، ١٠=${bayt10}) · اليوم: ${D.day} (${D.planet}/${D.metal}/${D.angel})`);
  trace.push(`جملةُ الدخل = ${Object.entries(parts).map(([k, v]) => `${k} ${v}`).join(" + ")} = ${jumla}`);

  const miftah = clsCast(jumla, 12) + clsCast(jumla, 9) + clsCast(jumla, 7);
  trace.push(`المفتاح = ${clsCast(jumla, 12)} + ${clsCast(jumla, 9)} + ${clsCast(jumla, 7)} = ${miftah}`);

  // الصفوفُ الفرعيّة (اشتقاقٌ مُعاد بناؤه — انظر الملاحظة)
  const ishai = ISHAI_TABLE[tali3] || ISHAI_TABLE["حمل"];
  const nameJ = abjad.jummal(String(opt.motherName || "أمة"));
  const wafq = BASE_SQUARE.map((c) => c + miftah);          // خانةُ الوفق
  const talDeg = ((asc - 1) % 30) + 1;

  const N = Math.max(4, Math.min(28, opt.letters ?? 9));
  const rows = [];
  let prevAdil = 0;
  for (let k = 0; k < N; k++) {
    const baqi28 = clsCast(wafq[k % 9], NAME_MOD) || NAME_MOD;   // = خانة الوفق % 28
    const baqiName = clsCast(nameJ + k, NAME_MOD) || NAME_MOD;
    const asrar10 = (2 * miftah + 11) + 5 * k;                   // الأسرار العشرة
    const ishaiN = 5 + (k % 4);                                  // الإشاعي
    const shawarid = 25 + (k % 4);                               // الشوارد
    const burjDeg = [talDeg, ((talDeg + 15) % 30) + 1, ((talDeg + 20) % 30) + 1][k % 3]; // البرج ودرجته
    const majmoo = baqi28 + baqiName + asrar10 + ishaiN + shawarid + burjDeg + HOUR_COUNT + HOUR_PLANET_NUM;
    const hasil = majmoo + prevAdil;
    const rem84 = clsCast(hasil, MOD_CYCLE);
    const line = adjustLine(rem84);
    const sirThulathi = 3 * (clsCast(miftah + k, NAME_MOD));     // السرّ الثلاثيّ (مُعاد بناؤه)
    const plus = line + sirThulathi < MOD_CYCLE;
    const adil = clsCast(plus ? line + sirThulathi : line - sirThulathi, MOD_CYCLE);
    const letterNum = clsCast(adil, NAME_MOD) || NAME_MOD;
    const letter = letterAt(letterNum);
    rows.push({ k: k + 1, baqi28, baqiName, asrar10, ishaiN, shawarid, burjDeg, majmoo, hasil, rem84, line, sirThulathi, sign: plus ? "+" : "−", adil, letterNum, letter });
    trace.push(`الموقع ${k + 1}: مجموع ${majmoo} → حاصل ${hasil} → %٨٤ ${rem84} → سطر معدّل ${line} → عادل ${adil} → «${letter}» (${letterNum})`);
    prevAdil = adil;
  }

  const answerRaw = rows.map((r) => r.letter).join("");

  // فكُّ سرٍّ من «الأسرار» (قوالبُ الجواب) بحسب المفتاح
  const secretKeys = Object.keys(SECRETS).map(Number);
  const secKey = secretKeys[clsCast(miftah, secretKeys.length)];
  const secretNums = SECRETS[secKey];
  const secretDecoded = secretNums.map((n) => letterAt(clsCast(n, NAME_MOD) || NAME_MOD)).join("");
  trace.push(`سرُّ الجواب: المفتاح ${miftah} ⇒ السرّ رقم ${secKey} ⇒ «${secretDecoded}»`);
  trace.push("جملةُ الدخل والمفتاحُ وأنبوبُ الحساب متحقَّقةٌ من مثال ج٢ المحلول؛ اشتقاقُ الصفوف الفرعية والسرّ الثلاثيّ مُعادُ بناءٍ — انظر الملاحظة.");

  return {
    tali3, bayt4, bayt7, bayt10, day: D,
    inputParts: parts, jumla, miftah,
    wafq, ishai,
    rows, answerRaw,
    secret: { key: secKey, numbers: secretNums, decoded: secretDecoded },
    procedure: CLS_PROCEDURE, trace,
    source: CLS_SRC.title, note: CLASSIC_NOTE,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// «فصلٌ آخر في الزايرجة» — طريقةُ الخاتمِ والأربعةَ عشرَ طالعًا [زايرجة ج١]
// جملةُ الدخل = جُمّل(حروف السؤال) + الطوالع الأربعة + قطب بني وهب (٦٣٢٣)
//              + اسم الله (٣٧٣) + طالع الساعة؛ تُسقَط بـ٣ ويُؤخَذ ربعُ الفاضل.
// ومفتاحُ السؤال: إسقاطُ جملةِ الحروف بـ٣٠ ثمّ ١٦ ثمّ ١٢ ثمّ ٩، وجمعُ الفوائضِ
// وإسقاطُها بـ٩، وطرحُ الباقي على أوّلِ الطوالع الأربعة.
// ─────────────────────────────────────────────────────────────────────────────

/** الطوالعُ الأربعةُ من التاريخ القبطيّ: (أيّامٌ مضت + الأسّ ١٦٨) × ١١ ٪ ١٢، ثمّ الحمل + الباقي، ثمّ ٤/٧/١٠. */
export function fourAscendants(when) {
  const d = new Date(when || Date.now());
  // تقريبُ اليومِ القبطيِّ الماضي من السنة (يبدأ ~١١ سبتمبر):
  const y = d.getUTCFullYear();
  let start = Date.UTC(y, 8, 11);
  if (d.getTime() < start) start = Date.UTC(y - 1, 8, 11);
  const daysPassed = Math.floor((d.getTime() - start) / 86400000);
  const asS = 168; // الأسّ
  const total = (daysPassed + asS) * 11;
  const rem = clsCast(total, 12);          // ١..١٢
  const talIdx = (rem - 1) % 12;
  const idx4 = [talIdx, (talIdx + 3) % 12, (talIdx + 6) % 12, (talIdx + 9) % 12];
  return {
    daysPassed, asS, product: total, rem,
    tali3: SIGNS12[idx4[0]],   // الطالع
    gharib: SIGNS12[idx4[1]],  // الغارب (الرابع)
    mutawassit: SIGNS12[idx4[2]], // المتوسّط (السابع)
    watad: SIGNS12[idx4[3]],   // الوتد (العاشر)
    signs: idx4.map((i) => SIGNS12[i]),
  };
}

/**
 * الطريقةُ الثانية: جملةُ الدخل، ربعُ الفاضل، ومفتاحُ السؤال.
 * @param {string} question
 * @param {object} [opt] { when, hourAscDegree }
 */
export function operateFasl(question, opt = {}) {
  const trace = [];
  const qLetters = abjad.letters(String(question || ""));
  const Q = abjad.jummal(qLetters.join(""));
  const fa = fourAscendants(opt.when);
  const fourJ = fa.signs.reduce((a, s) => a + abjad.jummal(s), 0);
  const hourAsc = opt.hourAscDegree != null ? (Math.floor(clsCast(opt.hourAscDegree - 1, 360) / 30) + 1) : 1;

  const jumla = Q + fourJ + QUTB_BANI_WAHB + ISM_ALLAH_JUMMAL + hourAsc;
  const rem3 = clsCast(jumla, 3);
  const quarter = Math.floor(rem3 / 4); // «ربع الفاضل» (غالبًا صفر لأنّ الباقي ١..٣) — يُبقى كما نصّ
  trace.push(`جُمّل حروف السؤال = ${Q}؛ الطوالع الأربعة (${fa.signs.join("، ")}) = ${fourJ}.`);
  trace.push(`جملةُ الدخل = ${Q} + ${fourJ} + قطب بني وهب ${QUTB_BANI_WAHB} + اسم الله ${ISM_ALLAH_JUMMAL} + طالع الساعة ${hourAsc} = ${jumla}.`);
  trace.push(`إسقاطٌ بـ٣ ⇒ الفاضل ${rem3}؛ ربعُه ${quarter} (يُنزَل في مفتاح الخاتم).`);

  // مفتاحُ السؤال: إسقاطُ الجملة بـ٣٠ ثمّ ١٦ ثمّ ١٢ ثمّ ٩، جمعُ الفوائض، إسقاطها بـ٩.
  const faw = FASL_ISQAT_CHAIN.map((m) => clsCast(jumla, m));
  const sumFaw = faw.reduce((a, b) => a + b, 0);
  const step = clsCast(sumFaw, 9);
  // طرحُ الباقي على أوّلِ الطوالع الأربعة (عدًّا على البروج من الطالع):
  const keySignIdx = (SIGNS12.indexOf(fa.tali3) + step - 1 + 12) % 12;
  const keySign = SIGNS12[keySignIdx];
  const keyLetter = QUTB_28[clsCast(sumFaw, 28) - 1] || QUTB_28[0];
  trace.push(`الفوائض [÷٣٠،١٦،١٢،٩] = ${faw.join("، ")}؛ مجموعُها ${sumFaw}؛ ÷٩ ⇒ ${step}.`);
  trace.push(`الطرحُ على أوّلِ الطوالع (${fa.tali3}) ⇒ مفتاحُ السؤال: برجُ «${keySign}»، حرفُ القطب «${keyLetter}».`);

  // ── الخاتم ─────────────────────────────────────────────────────────
  // «مفتاحُ خاتمٍ مربّعٍ أو مخمّسٍ … معشَّر»؛ يُصوَّر على الأربعة طبائع ويُملأ
  // بالترتيب. رتبتُه تُختار من ربع الفاضلِ (٤/٥/٦/٧/٨/١٠)؛ الحشوُ دورةٌ على
  // ترتيب أبجد مُزاحةٌ بربع الفاضل (كما تُري صورةُ الخاتم التساعيّ).
  const ORDERS = [4, 5, 6, 7, 8, 10];
  const kOrder = opt.khatamOrder && ORDERS.includes(opt.khatamOrder)
    ? opt.khatamOrder : ORDERS[clsCast(rem3 + quarter, ORDERS.length)];
  const seed = quarter;
  const khatam = Array.from({ length: kOrder }, (_, i) =>
    Array.from({ length: kOrder }, (_, j) => ABJAD_ORDER[((i + j + seed) % 28 + 28) % 28]));
  trace.push(`الخاتم: رتبةٌ ${kOrder} (من ربع الفاضل)، مُصوَّرٌ على الطبائع الأربع، حشوُه دورةُ أبجد مُزاحةٌ بـ${seed}.`);

  // ── اللفظ: استخراجُ ثلاثةِ حروفٍ لكلِّ حرفٍ من السؤال ────────────────
  // «تعدّ من الخاتم بالعرضِ وتنزل بالطولِ بجُمّل الحرف، فالثلاثةُ حروفٍ التي
  //  ينتهي عليها العددُ فاكتبها.»
  const lafz = [];
  for (const ch of qLetters) {
    const v = abjad.jummal(ch) || 1;
    const r = (v % kOrder + kOrder) % kOrder;
    const cc = ((v * 2) % kOrder + kOrder) % kOrder;
    lafz.push([0, 1, 2].map((d) => khatam[r][(cc + d) % kOrder]));
  }
  const rawLetters = lafz.flat(); // خانةُ الخاتم حرفٌ أصلًا
  trace.push(`اللفظ: لكلّ حرفٍ من السؤال (${qLetters.length}) ثلاثةُ حروفٍ من الخاتم بالعرض والطول ⇒ ${rawLetters.length} حرفًا خامًا.`);

  // ── ٢٨ طالعًا (٢٤ حرفًا لكلٍّ) بتشطيبِ الخاتم ثمّ الامتزاجُ ⇒ ١٤ طالعًا ──
  const qNums = qLetters.map((c) => abjad.jummal(c) || 1);
  const talis28 = [];
  for (let k = 0; k < 28; k++) {
    const row = [];
    let idx = (k + seed) % 28;
    for (let t = 0; t < 24; t++) {
      row.push(letterAt(idx));
      idx = ((idx + (qNums[t % qNums.length] || 1) + k + 1) % 28 + 28) % 28;
    }
    talis28.push(row.join(""));
  }
  // امتزاجٌ: الطالعُ الأوّلُ بالأخير، والثاني بالسابع والعشرين … ⇒ ١٤ سطرًا
  const mixed14 = [];
  for (let i = 0; i < 14; i++) {
    const A1 = talis28[i], B1 = talis28[27 - i];
    let s = "";
    for (let t = 0; t < 24; t++) s += A1[t] + B1[23 - t];
    mixed14.push(s);
  }
  // ملقطُ الجواب: من كلِّ سطرٍ حرفٌ عند إسقاطِ حروف القطبِ بإسقاطِ طبع مفتاح السؤال.
  const keyElem = (abjad.natureOf ? abjad.natureOf(keyLetter) : null) || "نار";
  const elemIsqat = TABAI_ISQAT[keyElem] || 9;
  const answerNums = mixed14.map((s, i) => {
    const q = QUTB_28[(i * 3 + step) % 28];
    const off = (abjad.jummal(q) % elemIsqat + elemIsqat) % elemIsqat;
    return s[(off * 7 + i) % s.length];
  });
  const answerRaw = answerNums.join("");
  trace.push(`٢٨ طالعًا (٢٤ حرفًا) ⇒ امتزاجٌ ⇒ ١٤ سطرًا (٤٨ حرفًا)؛ ملقطُ الجوابِ بإسقاطِ حروف القطب بطبع «${keyElem}» (${elemIsqat}) ⇒ «${answerRaw}».`);

  // تشكيلُ بيتٍ مقروءٍ (كباقي الأنماط)
  const w0 = analyzeWatar(opt.watar || "بِسْمِ الإِلَهِ وَبِهِ نَسْتَعِينُ");
  const topic = opt.topic || classifyTopic(question);
  const shaped = shapeAnswer(answerNums.map((c) => c), w0, keySignIdx + 1, Q, trace, topic);
  trace.push("الخاتمُ والثمانيةُ والعشرون طالعًا يُطرَحون بعد الامتزاج؛ والأربعةُ الطوالعُ الخارجةُ هي مفتاحُ السؤال. — إعادةُ بناءٍ لطريقةٍ مقتضبةٍ في زايرجة ج١.");

  return {
    question: String(question || ""),
    questionValue: Q,
    fourAscendants: fa,
    entryTotal: jumla, castBy3: rem3, quarter,
    fawaid: faw, fawaidSum: sumFaw, keyStep: step,
    keySign, keyLetter, keyElement: keyElem,
    khatamOrder: kOrder, khatam,
    lafzRaw: rawLetters.join(""),
    talis28, mixed14,
    answerRaw,
    answer: shaped.verse, sentiment: shaped.sentiment, topic: shaped.topic,
    tabaiIsqat: TABAI_ISQAT, qutb: QUTB_28.join(""),
    procedure: [
      "خذ حروفَ السؤالِ مفرَّقةً واحسِبْها بالجُمّل، وأضِفِ الطوالعَ الأربعةَ وقطبَ بني وهب (٦٣٢٣) واسمَ الله (٣٧٣) وطالعَ الساعة.",
      "أسقِطْ بـ٣ وخذ ربعَ الفاضلِ ⇒ يُنزَل في مفتاح الخاتم، وتُختار رتبةُ الخاتم (٤..١٠).",
      "املأِ الخاتمَ على الطبائع الأربع بدورةِ أبجد، ثمّ الفظِ السؤالَ: لكلّ حرفٍ ثلاثةُ حروفٍ بالعرض والطول.",
      "استخرِجْ ٢٨ طالعًا (٢٤ حرفًا لكلٍّ) بتشطيبِ الخاتم، ثمّ امزُجْها ⇒ ١٤ طالعًا.",
      "لمفتاحِ السؤال: أسقِطِ الجملةَ بـ٣٠ ثمّ ١٦ ثمّ ١٢ ثمّ ٩، واجمعِ الفوائضَ وأسقِطْها بـ٩، واطرَحِ الباقيَ على أوّلِ الطوالع الأربعة؛ ثمّ الفظِ الجوابَ من الأربعةَ عشرَ طالعًا بإسقاطِ حروف القطب بطبعِ المفتاح.",
    ],
    note: FASL_NOTE + " التنفيذُ إعادةُ بناءٍ حتميّةٌ لطريقةٍ مقتضبةٍ في الأصل.",
    source: CLS_SRC.title, trace,
  };
}

export { classifyTopic };
export const HANDASIYA_SOURCE = HND_SRC;
export const CLASSIC_SOURCE = CLS_SRC;
export default {
  operate, handasiya, operateClassical, operateFasl, fourAscendants,
  classifyTopic, classifyOfficialTopic, RINGS, tableCell,
  TABLE_COLS, TABLE_ROWS, HANDASIYA_SOURCE, CLASSIC_SOURCE,
};
