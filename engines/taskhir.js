// engines/taskhir.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك التسخير والتصريف
//
// يُركِّب "العمل" كاملًا لأيّ غاية: الروح/المَلِك الموكَّل، اليوم والساعة والجهة
// واللون، البخور (موسومٌ إن كان سامًّا)، هيكل العزيمة والقَسَم بأسمائه، الخاتم
// المرسوم، عدد التكرار (من الجُمّل)، علامات الإجابة المزعومة، شروط العمل (مع
// تنبيه أمان)، وعزيمة الصرف ونقض العمل.
//
// كل عنصرٍ مرفقٌ في `reveal` بمصدره الجدوليّ الثابت. لا شيء هنا حقيقيّ؛ الغرض
// أن تعرف الجهاز كلّه فلا يُخفى عنك شيء في النقاش.
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import awfaq from "./awfaq.js";
import talisman from "./talisman.js";
import falak from "./falak.js";
import ak from "./asma-khuddam.js";
import { PLANETS, DAY_NAMES } from "../data/falak.data.js";
import { PLANET_ANGELS, SEVEN_KINGS } from "../data/spirits.data.js";
import {
  GOALS, PLANET_DIRECTION, PLANET_GARB, PLANET_NAMES99, PLANET_SIGNS,
  AZIMA_TEMPLATE, SARF_TEMPLATE, NAQD, CONDITIONS
} from "../data/taskhir.data.js";
import {
  BARHATIYYA, BARHATIYYA_DAY, BARHATIYYA_NOTE, SECRET_PENS, NAYRANJ, MANDAL,
  BAD_LUNAR_DAYS, BAD_DAYS_NOTE, CORNER_SIGNING, SOURCES_META,
} from "../data/taskhir-books.data.js";
import {
  FIRST_HEAVEN_HEADING, FIRST_HEAVEN_MUQADDAMUN, SECOND_HEAVEN_NOTE,
  SECOND_HEAVEN_DEGREES, HEAVENS, SAHR_AZIM_NOTE, SOURCE_META as SAHR_SRC,
  ADAM_NAMES_CHAIN, ADAM_NAMES_NOTE, MUQADDAM_ARMIES, SAFAR_ADAM_INTRO,
} from "../data/taskhir-sahr-azim.data.js";
import { MANDAL_NAFSI, MANDAL_NAFSI_RAW } from "../data/turuq-tukhi.data.js";

export function listGoals() {
  return Object.entries(GOALS).map(([id, g]) => ({ id, label: g.label, intent: g.intent, requestOptions: g.requestOptions || [g.intent] }));
}

// ── القسَم البرهتيّ ─────────────────────────────────────────────────────
/** نصُّ القسَم البرهتيّ الكامل + كلمةُ اليوم + عددُ تكرارٍ من جُمّل الحاجة. */
export function barhatiyya(opt = {}) {
  const day = opt.day || null;
  const reqVal = opt.request ? abjad.jummal(opt.request) : 0;
  const count = reqVal ? (reqVal % 70) + 7 : 41;
  return {
    words: BARHATIYYA.slice(),
    fullText: "أقسمتُ عليكم بـ" + BARHATIYYA.join("، ") + "، إلّا ما أجبتم وحضرتم وقضيتم الحاجة.",
    dayWord: day ? (BARHATIYYA_DAY[day] || null) : null,
    repeat: count,
    note: BARHATIYYA_NOTE,
  };
}

// ── الأقلام السرّيّة ────────────────────────────────────────────────────
export function secretPens() {
  return Object.entries(SECRET_PENS).map(([id, p]) => ({ id, note: p.note }));
}

/** يكتب نصًّا بقلمٍ سرّيّ (استبدالُ حروف). عكسُه بالجدول العكسيّ. */
export function secretScript(text, pen = "قلم النجوم") {
  const p = SECRET_PENS[pen] || SECRET_PENS["قلم النجوم"];
  const chars = abjad.letters(text);
  const glyphs = chars.map((ch) => p.map[ch] || ch);
  return {
    pen, source: abjad.normalize(text),
    glyphs, text: glyphs.join(" "),
    note: p.note + " — خطٌّ سرّيٌّ = شيفرةُ استبدالٍ لا لغة؛ يُقرأ بعكس الجدول.",
  };
}

// ── النيرنجات ─────────────────────────────────────────────────────────
export function listNayranj() {
  return Object.entries(NAYRANJ).map(([id, n]) => ({ id, title: n.title }));
}
export function nayranj(id) {
  const n = NAYRANJ[id];
  if (!n) throw new Error("نيرنج غير معروف: " + id);
  return {
    id, ...n,
    trace: [
      `النيرنج «${n.title}»: محاكاةٌ رمزيّة — ما يُشبِه المرادَ يجلبه (قانون التشابه).`,
      `يُصنَع: ${n.figure}`,
      `يُكتَب: ${n.inscribe}`,
      `يُفعَل: ${n.act}`,
      `المكان: ${n.place} · التوقيت: ${n.timing} · المدّة: ${n.duration}`,
      `النقض: ${n.reverse}`,
      "لا صلةَ سببيّةٌ بين شمعةٍ وإنسان؛ الأثرُ كلُّه في علمِ الطرفِ الآخرِ أو توقُّعِه.",
    ],
  };
}

// ── المندل ───────────────────────────────────────────────────────────
export function mandal(when) {
  const d = when ? new Date(when) : new Date();
  const dayName = DAY_NAMES[d.getDay()];
  return {
    day: dayName,
    king: MANDAL.callByDay[dayName] || null,
    medium: MANDAL.medium, seer: MANDAL.seer, setup: MANDAL.setup,
    openFormula: MANDAL.openFormula,
    scenes: MANDAL.scriptedScenes,
    dismissal: MANDAL.dismissal,
    debunk: MANDAL.debunk,
  };
}

// ── المندل النفسي / استنزال نفسي (مُلحق قرعة جعفر الصادق) ─────────────
const _ARDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function _fmtDate(d) {
  const p = (x) => String(x).padStart(2, "0");
  return `${_ARDAYS[d.getDay()]} ${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * جدولُ تنفيذِ «المندل النفسي»: رياضةٌ ٩ أيّام + خلوةٌ ٢٨ + رياضةٌ ٩ = ٤٦ يومًا،
 * تبدأ أوّلَ يومِ أحدٍ في تاريخِ البدءِ المطلوبِ أو بعده. الجدولُ محسوبٌ بالتواريخ؛
 * ونصُّ الكتابِ الحرفيُّ في `reveal`.
 * @param {{when?: Date|string|number}} [opt] تاريخُ البدءِ المطلوب (افتراضيًّا اليوم)
 */
export function mandalNafsi(opt = {}) {
  const req = opt.when ? new Date(opt.when) : new Date();
  req.setHours(0, 0, 0, 0);
  const start = new Date(req);
  while (start.getDay() !== 0) start.setDate(start.getDate() + 1); // أوّل أحد

  const phases = [];
  const cursor = new Date(start);
  for (const ph of MANDAL_NAFSI.phases) {
    const from = new Date(cursor);
    const to = new Date(cursor);
    to.setDate(to.getDate() + ph.days - 1);
    phases.push({
      id: ph.id, name: ph.name, days: ph.days,
      from: _fmtDate(from), to: _fmtDate(to),
      open: ph.open || [], daily: ph.daily || [],
      incense: ph.incense || null, incenseNote: ph.incenseNote || null,
      sarfAmmar: ph.sarfAmmar || null, mirror: ph.mirror || null,
      fast: ph.fast || null, posture: ph.posture || null,
      successSigns: ph.successSigns || null, close: ph.close || null,
    });
    cursor.setDate(cursor.getDate() + ph.days);
  }
  const shukrDay = new Date(cursor); // اليومُ التالي لآخرِ يومِ رياضة: ركعتا الشكر

  const wafq = awfaq.makeSquare(MANDAL_NAFSI.wafqOrder, 1, 1);
  const wafqConstant = awfaq.verify(wafq).magic;

  return {
    heading: MANDAL_NAFSI.heading,
    premise: MANDAL_NAFSI.premise,
    startRequested: _fmtDate(req),
    startSunday: _fmtDate(start),
    totalDays: MANDAL_NAFSI.totalDays,
    shukrDay: _fmtDate(shukrDay),
    phases,
    mirror: MANDAL_NAFSI.phases[0].mirror,
    wafq, wafqConstant, wafqNote: MANDAL_NAFSI.wafqNote,
    azima: MANDAL_NAFSI.azima,
    spareTime: MANDAL_NAFSI.spareTime,
    failNote: MANDAL_NAFSI.failNote,
    source: "قرعة جعفر الصادق (مُلحق) — الطوخي، ص ٤٠–٤٧",
    reveal: MANDAL_NAFSI_RAW,
  };
}

// ── الأيّام المنحوسة ─────────────────────────────────────────────────
/** هل يومُ التاريخِ من الأيّام المنحوسةِ القمريّة (تقريبيًّا من عمر الهلال)؟ */
export function isBadDay(date) {
  const d = date ? new Date(date) : new Date();
  // تقريبُ عمرِ القمر: أيّامٌ منذ اجتماعٍ مرجعيّ (2000-01-06) مقسومةً على الشهر الاقترانيّ.
  const synodic = 29.53058867;
  const ref = Date.UTC(2000, 0, 6, 18, 14);
  const age = (((d.getTime() - ref) / 86400000) % synodic + synodic) % synodic;
  const lunarDay = Math.floor(age) + 1; // 1..30
  return { lunarDay, bad: BAD_LUNAR_DAYS.includes(lunarDay), list: BAD_LUNAR_DAYS, note: BAD_DAYS_NOTE };
}

// ── توقيع الخاتم بالزوايا ────────────────────────────────────────────
const AWTAD_WORDS = ["آجٍ", "هجٍ", "وجٍ", "زهجٍ"]; // من نصّ CORNER_SIGNING.awtad، كلٌّ على ضلع
export function cornerSigning(planet, servantName) {
  const angel = PLANET_ANGELS[planet];
  const nature = PLANETS[planet]?.element;
  return {
    corners: [
      "بُدُوح موزَّعةً على الزوايا الأربع",
      `اسمُ مَلَك الكوكب: ${angel}`,
      `اسمُ الخادم المُصرَّف: ${servantName}`,
      `طبعُ الكوكب: ${nature}`,
    ],
    // نفسُ محتوى corners لكن بكلمةٍ واحدةٍ قصيرة لكلّ زاوية — لرسمها فعليًّا على الخاتم لا وصفها فقط.
    cornersShort: ["بُدُوح", angel, servantName, nature],
    awtad: CORNER_SIGNING.awtad,
    awtadWords: AWTAD_WORDS,
    note: CORNER_SIGNING.note,
  };
}

// ── تصريفُ خدّام السماء الأولى (سبعة مقدَّمين) [السحر العظيم] ─────────
export function listMuqaddamun() {
  return Object.entries(FIRST_HEAVEN_MUQADDAMUN).map(([n, m]) => ({ n: +n, name: m.name, purpose: m.purpose }));
}

/** عساكرُ المقدَّمين السبعة — رتلُ أسماءِ كلِّ مقدَّمٍ وولايتُه [السحر العظيم ص ١٤–١٧]. */
export function muqaddamArmies() {
  return Object.entries(MUQADDAM_ARMIES).map(([n, a]) => ({
    n: +n, chief: a.chief, role: a.role,
    names: a.names.split(/\s+/).filter(Boolean),
    count: a.names.split(/\s+/).filter(Boolean).length,
  }));
}
export function muqaddamArmy(n) {
  const a = MUQADDAM_ARMIES[n];
  if (!a) throw new Error("عسكرٌ غير معروف: " + n + " — استعمل ١..٧");
  const names = a.names.split(/\s+/).filter(Boolean);
  return { n: +n, chief: a.chief, role: a.role, names, count: names.length, source: SAHR_SRC.title };
}
export function safarAdamIntro() {
  return { text: SAFAR_ADAM_INTRO, source: SAHR_SRC.title, note: SAHR_AZIM_NOTE };
}

/**
 * طقسُ «المقدَّم» رقم n (١..٧) من خدّام السماء الأولى: غرضُه وخطواتُه [السحر العظيم].
 * @param {number} n ١..٧
 * @param {object} [opt] { request } نصُّ الحاجة (لعدد التكرار من الجُمّل)
 */
export function firstHeaven(n, opt = {}) {
  const m = FIRST_HEAVEN_MUQADDAMUN[n];
  if (!m) throw new Error("مقدَّم غير معروف: " + n + " — استعمل ١..٧");
  const reqVal = opt.request ? abjad.jummal(opt.request) : 0;
  const repeat = reqVal ? (reqVal % 70) + 7 : 7;
  const army = MUQADDAM_ARMIES[n]
    ? { names: MUQADDAM_ARMIES[n].names.split(/\s+/).filter(Boolean), role: MUQADDAM_ARMIES[n].role }
    : null;
  return {
    heading: FIRST_HEAVEN_HEADING,
    n: +n, name: m.name, chief: m.chief, purpose: m.purpose, ritual: m.ritual,
    army,
    repeat,
    secondHeavenNote: SECOND_HEAVEN_NOTE,
    note: SAHR_AZIM_NOTE, source: SAHR_SRC.title,
    trace: [
      `المقدَّم ${n} من خدّام السماء الأولى (خدّام الشمس) ⇒ غرضُه: ${m.purpose}.`,
      `رئيسُه: ${m.chief} · التكرار: ${repeat}${reqVal ? ` (من جُمّل الحاجة ${reqVal} ٪ ٧٠ + ٧)` : " (افتراضًا)"}.`,
      `الطقس: ${m.ritual}`,
      "خطواتٌ رمزيّةٌ ثابتة (ساعة/بخور/قِبلة/أسماء سريانيّة/تكرار) — لا سببيّةَ فيها؛ أثرُها في نفس العامل.",
    ],
  };
}

// ── تصريفُ السماواتِ من الثانية إلى السابعة [السحر العظيم ص ٦٢–٧١] ──
/** فهرسُ السماواتِ السبع وأغراضِ تصريفِها. */
export function listHeavens() {
  return [
    { n: 1, heading: FIRST_HEAVEN_HEADING, kind: "٧ مقدَّمين" },
    { n: 2, heading: "تصريفُ السماء الثانية — خدّام القمر", kind: "١٢ درجة" },
    ...Object.entries(HEAVENS).map(([n, h]) => ({ n: +n, heading: h.heading, kind: h.structure })),
  ];
}

/** تصريفُ السماء رقم n (٣..٧): بنيتُها وأغراضُها وعزائمُها. */
export function heaven(n) {
  const h = HEAVENS[n];
  if (!h) throw new Error("سماءٌ غير معروفة: " + n + " — استعمل ٣..٧ (وللأولى firstHeaven، وللثانية secondHeavenDegree)");
  return {
    n: +n, ...h, source: SAHR_SRC.title, note: SAHR_AZIM_NOTE,
    trace: [
      `${h.heading} — ${h.structure}`,
      ...(h.chiefs ? [`المقدَّمون: ${h.chiefs.join("، ")}${h.seasonChiefs ? ` (وعلى الفصول: ${h.seasonChiefs.join("، ")})` : ""}.`] : []),
      ...(h.ops || []).map((o) => `الغرض: ${o.purpose} — العمل: ${o.ritual}`),
      ...(h.sword ? [`نصُّ سيف الله: ${h.sword}`] : []),
      ...(h.virtue ? [`فضلُها: ${h.virtue}`] : []),
      "خطواتٌ رمزيّةٌ ثابتة (طهارةٌ وصومٌ، بخورٌ وساعة، صفيحةٌ أو خاتمٌ فيه أسماء، عزيمةٌ تُكرَّر، ثمّ صرف).",
    ],
  };
}

/** درجةٌ من درجاتِ السماء الثانية (خدّام القمر)، إن كانت مستخرَجة. */
export function secondHeavenDegree(deg) {
  const d = SECOND_HEAVEN_DEGREES[deg];
  return d
    ? { degree: +deg, ...d, source: SAHR_SRC.title, note: SECOND_HEAVEN_NOTE }
    : { degree: +deg, purpose: null, ritual: null, note: SECOND_HEAVEN_NOTE + " — هذه الدرجةُ لم تُستخرَج بعد." };
}
export function secondHeavenDegrees() {
  return Object.keys(SECOND_HEAVEN_DEGREES).map((d) => ({ degree: +d, purpose: SECOND_HEAVEN_DEGREES[d].purpose }));
}

/** «سيفُ الله القاطع» — أسماءُ السماء السابعةِ وأعمالُها [السحر العظيم ص ٧٠–٨٧]. */
export function sayfAllah() {
  const h = HEAVENS[7];
  return {
    heading: h.heading, structure: h.structure,
    virtue: h.virtue, conditions: h.conditions,
    names: h.sword,
    operations: h.operations || [],
    applications: h.applications || [],
    powers: h.powers, recipientCriteria: h.recipientCriteria,
    hierarchy: h.hierarchy, handOfGod: h.handOfGod,
    wrathChiefs: h.wrathChiefs, closingSalam: h.closingSalam,
    tafsirNames: h.tafsirNames, revelation: h.revelation,
    source: SAHR_SRC.title, note: SAHR_AZIM_NOTE,
  };
}

/** سلسلةُ توارُثِ «كتاب الأسماء» (آدم ← نوح) [السحر العظيم ج١، القسم الثاني]. */
export function adamNamesChain() {
  return { chain: [...ADAM_NAMES_CHAIN], note: ADAM_NAMES_NOTE, source: SAHR_SRC.title };
}

export const SOURCES = { ...SOURCES_META, sahr_azim: SAHR_SRC };

const kingOfPlanet = (planet) => SEVEN_KINGS.find((k) => k.planet === planet) || null;

function fill(tpl, map) {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => (map[k] != null ? map[k] : `{{${k}}}`));
}

/**
 * @param {string} goalId  مفتاح من listGoals()
 * @param {object} opt
 * @param {string} opt.name        اسم العامل
 * @param {string} opt.mother      اسم أمّه
 * @param {string} [opt.request]   نصّ الحاجة كما تُقال في العزيمة
 * @param {string} [opt.targetName]   اسم الطرف الآخر (لمحبة/تفريق/أذى…)
 * @param {string} [opt.targetMother]
 * @param {Date|string} [opt.when=now]   لاختيار أقرب يوم/ساعة مناسبَين
 * @param {number} [opt.lat=21.4225] @param {number} [opt.lon=39.8262]
 */
export function operation(goalId, opt = {}) {
  const g = GOALS[goalId];
  if (!g) throw new Error("غاية غير معروفة: " + goalId + " — استعمل listGoals()");
  const reveal = [];
  const when = opt.when ? new Date(opt.when) : new Date();
  const lat = opt.lat ?? 21.4225, lon = opt.lon ?? 39.8262;

  // ── الكوكب والروح ─────────────────────────────────────────────────
  let planet, planetSource;
  if (g.fromPersonPlanet) {
    const rd = ak.reading(opt.name, opt.mother);
    planet = rd.planet.name;
    planetSource = `من طالع اسم العامل: جُمّل(${abjad.normalize(opt.name)}+${abjad.normalize(opt.mother)}) = ${rd.values.total} ⇒ mod 7 ⇒ ${planet}`;
  } else {
    planet = g.planet;
    planetSource = `جدول GOALS["${goalId}"].planet = ${planet}`;
  }
  reveal.push(`الكوكب: ${planetSource}`);

  const king = kingOfPlanet(planet);
  const angel = PLANET_ANGELS[planet];
  const pInfo = PLANETS[planet];
  const day = pInfo.day;
  const direction = PLANET_DIRECTION[planet];
  const garb = PLANET_GARB[planet];
  const divineNames = PLANET_NAMES99[planet].join("، ");
  reveal.push(`المَلِك: ${king?.name} (صاحب ${day}) — جدول SEVEN_KINGS`);
  reveal.push(`المَلَك: ${angel} — جدول PLANET_ANGELS`);
  reveal.push(`اليوم: ${day} = يوم ${planet} (جدول PLANETS)`);
  reveal.push(`الجهة: ${direction} (جدول PLANET_DIRECTION) — تختلف نسخ`);
  reveal.push(`اللون: ${garb} (جدول PLANET_GARB)`);

  // ── الخادم المُصرَّف باسم العامل ───────────────────────────────────
  const rd2 = ak.reading(opt.name, opt.mother);
  const servant = rd2.servant.derivedServantName;
  reveal.push(`اسم الخادم المُصرَّف: "${rd2.input.name}".slice(0,3) + لاحقة عنصر ${rd2.element} ⇒ ${servant}`);

  // ── اليوم والساعة القادمان المناسبان ──────────────────────────────
  const target = day; // اسم اليوم المطلوب
  let probe = new Date(when);
  let chosen = null;
  for (let i = 0; i < 8 && !chosen; i++) {
    const d = new Date(probe.getTime() + i * 86400000);
    if (DAY_NAMES[d.getDay()] === target) {
      const ph = falak.planetaryHoursForMoment(d, lat, lon);
      const hr = ph.hours.find((h) => h.ruler === planet && h.end > when);
      if (!hr) continue; // فاتت ساعاتُ الكوكب في هذا اليوم ⇒ الأسبوعُ القادم
      chosen = { date: d, hourStart: hr?.start, hourEnd: hr?.end, hourIndex: hr?.i, phase: hr?.phase };
    }
  }
  reveal.push(
    chosen
      ? `أقرب يوم ${target} من ${when.toISOString().slice(0, 10)} ثم أوّل ساعةِ ${planet} فيه (بحساب الساعات الكوكبية للموقع)`
      : `تعذّر إيجاد ساعةٍ (موقع قطبيّ؟) — استعمل يوم ${target} وساعة ${planet} تقديرًا`
  );

  // ── البخور (مع وسم السُّمّ) ───────────────────────────────────────
  const incenseRaw = pInfo.incenseNote || "";
  const toxic = /زئبق|زرنيخ|كبريت|زاج|داتورا|جوز ماثل|سيكران|شوكران|سامّ|سام\b|ضارّ|ضار\b|خطِرة|خطر عند الحرق/.test(incenseRaw);
  reveal.push(`البخور: نصّ PLANETS["${planet}"].incenseNote${toxic ? " — يحوي مكوّنًا سامًّا، موسوم" : ""}`);

  // ── الخاتم ───────────────────────────────────────────────────────
  const total = rd2.values.total;
  const kamea = awfaq.planetSquare(planet);
  const nameWafqOrder = [3, 4, 5, 6, 7, 8, 9].find((n) => total % n === 0) || 4;
  const nameWafq = awfaq.wafqForTarget(nameWafqOrder, total);
  const sealSvg = talisman.svgWafq(kamea.square);
  const nameSealSvg = talisman.svgWafq(nameWafq.square);
  reveal.push(`الخاتم: كامية ${planet} (رتبة ${kamea.order}، مجموع ${kamea.magic}) + وفق اسم العامل (رتبة ${nameWafqOrder}، مجموع ${nameWafq.realized})`);

  // ── عدد التكرار ─────────────────────────────────────────────────
  // جُمّل الحاجة يُثبَّتُ على أقربِ عددٍ متعارَفٍ في العزائم (لا «١٦٩٠ مرّة»).
  const requestText = opt.request || g.intent;
  const rawCount = abjad.jummal(requestText) || abjad.jummal(servant);
  const CANON = [3, 7, 21, 40, 41, 66, 70, 100, 300, 313, 1000, 4444];
  const count = CANON.reduce((best, n) =>
    Math.abs(n - rawCount) < Math.abs(best - rawCount) ? n : best, CANON[0]);
  reveal.push(`عدد التكرار: جُمّل نصّ الحاجة "${abjad.normalize(requestText)}" = ${rawCount} ⇒ أقربُ عددٍ متعارَفٍ في العزائم = ${count}`);

  // ── الشروط ─────────────────────────────────────────────────────
  const reqVal = abjad.jummal(requestText);
  const fastingDays = (reqVal % 7) + 3;
  reveal.push(`أيام الصيام = (${reqVal} mod 7) + 3 = ${fastingDays} (صيغة CONDITIONS)`);

  // ── العزيمة ────────────────────────────────────────────────────
  // ملاحظة: العزيمةُ هنا كلامٌ يُقال فقط، بلا تفصيلِ عملٍ داخلها (يوم/ساعة/جهة/بخور/تكرار) —
  // تلك تفاصيلُ تنفيذٍ مذكورةٌ في مكانها الخاصّ (timing/place/incense/repetition أدناه) لا داخل نصّ الكلام.
  const azima = fill(AZIMA_TEMPLATE, {
    divineNames, spirit: servant, planet, angel, king: king?.name || "—",
    day, request: requestText,
  });

  // ── هدف العمل (طرف آخر) ───────────────────────────────────────
  let targetBlock = null;
  if (opt.targetName) {
    const tr = ak.reading(opt.targetName, opt.targetMother || "");
    targetBlock = {
      name: tr.input.name,
      total: tr.values.total,
      element: tr.element,
      planet: tr.planet.name,
      betweenValue: Math.abs(total - tr.values.total),
      note: "بعض الأعمال تدمج جُمّل الطرفين (جمعًا أو فرقًا) في عدد الخاتم."
    };
    reveal.push(`الطرف الآخر: جُمّل ${tr.input.name} = ${tr.values.total}؛ الفرق مع العامل = ${targetBlock.betweenValue}`);
  }

  // ── طبقة كتب التسخير: البرهتية، القلم السرّيّ، توقيع الخاتم، اليوم المنحوس، النيرنج ──
  const barhat = barhatiyya({ day, request: requestText });
  const secretServant = secretScript(servant, "قلم النجوم");
  const signing = cornerSigning(planet, servant);
  const badDay = chosen?.date ? isBadDay(chosen.hourStart || chosen.date) : isBadDay(when);
  const nayranjOption = NAYRANJ[goalId] ? nayranj(goalId) : null;
  reveal.push(
    `القسَم: البرهتيّة (${BARHATIYYA.length} كلمة) — كلمةُ يوم ${day}: ${barhat.dayWord || "—"}؛ نصٌّ محفوظٌ بلا معنى`,
    `الخاتم يُكتَب بقلمٍ سرّيّ (استبدالُ حروف): «${abjad.normalize(servant)}» ⇒ ${secretServant.text}`,
    `توقيعُ الزوايا: بُدُوح + ${angel} + ${servant} + طبع ${planet}`,
    `اليوم القمريّ ${badDay.lunarDay} ⇒ ${badDay.bad ? "من الأيّام المنحوسة (يُنصَح بتأجيله)" : "غيرُ منحوس"} (جدولٌ ثابت لا رصد)`,
    nayranjOption ? `يوجد نيرنجٌ بديلٌ لهذه الغاية: ${nayranjOption.title}` : "لا نيرنجَ مخصَّصٌ لهذه الغاية"
  );

  return {
    goal: { id: goalId, label: g.label, intent: g.intent, danger: g.danger || null },
    planet, king: king ? { name: king.name, kunya: king.kunya, day: king.day } : null,
    angel, servantName: servant,
    barhatiyya: barhat,
    secretScript: secretServant,
    cornerSigning: signing,
    badDay,
    nayranj: nayranjOption,
    timing: {
      day,
      hourRuler: planet,
      chosenDate: chosen?.date?.toISOString() || null,
      hourWindow: chosen ? { start: chosen.hourStart?.toISOString(), end: chosen.hourEnd?.toISOString(), index: chosen.hourIndex, phase: chosen.phase } : null
    },
    place: { direction, note: "تختلف جهة الكوكب بين النسخ" },
    garb,
    incense: { text: incenseRaw, toxic, warning: toxic ? "يحوي مادّةً سامّةً عند الحرق/الاستنشاق — لا تُحرَق ولا تُشَمّ." : null },
    seal: { planetKameaSvg: sealSvg, nameWafqSvg: nameSealSvg, nameWafqOrder, nameWafqExact: nameWafq.exact },
    repetition: { count, raw: rawCount, basis: `جُمّل «${abjad.normalize(requestText)}» = ${rawCount} ⇒ أقربُ عددٍ متعارَف = ${count}` },
    divineNames: PLANET_NAMES99[planet],
    azima,
    claimedSigns: PLANET_SIGNS[planet],
    conditions: { fastingDays, items: CONDITIONS.items, safety: CONDITIONS.safety },
    dismissal: SARF_TEMPLATE,
    undo: NAQD,
    target: targetBlock,
    reveal
  };
}

export default {
  listGoals, operation,
  barhatiyya, secretPens, secretScript,
  listNayranj, nayranj, mandal, mandalNafsi, isBadDay, cornerSigning,
  listMuqaddamun, firstHeaven, muqaddamArmies, muqaddamArmy, safarAdamIntro,
  listHeavens, heaven, secondHeavenDegree, secondHeavenDegrees, sayfAllah, adamNamesChain,
  SOURCES,
};
