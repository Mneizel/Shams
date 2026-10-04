// engines/falak.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك الفلك
//
// يعتمد على astronomy-engine (رخصة MIT، حساب فلكي محلي بلا إنترنت) في:
//   - أوقات الشروق/الغروب لأي تاريخ وموقع
//   - مواقع الكواكب السبعة الكلاسيكية في البروج + الرجوع (retrograde)
//   - منزلة القمر (28)
//   - الطالع (البرج الصاعد) لحظة معيّنة
// ويحسب محليًا:
//   - حاكم اليوم (رب اليوم)
//   - الساعات الكوكبية الاثنتا عشرة نهارًا والاثنتا عشرة ليلًا (ساعات غير متساوية)
//   - حاكم الساعة الجارية
//
// كل شيء حتمي: نفس (التاريخ، الموقع) ⇒ نفس المخرجات.
// ─────────────────────────────────────────────────────────────────────────────

import * as A from "../vendor/astronomy-engine.js";
import {
  CHALDEAN,
  DAY_RULERS,
  DAY_NAMES,
  PLANETS,
  SIGNS,
  MANSIONS,
  MANSION_ARC
} from "../data/falak.data.js";
import { faceRuler, termRuler, TRIPLICITIES } from "../data/astro-dignities.data.js";
import { MANSION_ANGELS } from "../data/mansion-angels.data.js";
import { MANSIONS_SRC } from "../data/mansions-source.data.js";
import { LETTER_PLANET } from "../data/abjad.data.js";
import { PLANET_ANGELS } from "../data/spirits.data.js";
import {
  DOMICILE, DETRIMENT, EXALT, FALL, DIGNITY_SCORE, ASPECTS, HOUSE_TOPICS,
  SIGNIFICATORS, LOTS, SOLAR_PROXIMITY, FIRDARIA_DAY, FIRDARIA_NIGHT,
  FIRDARIA_SUB_ORDER, PLANET_GOVERNS, DAY_RULER_WORKS, SOURCES_META,
} from "../data/falak-ahkam.data.js";
import {
  FORTUNATE_DEGREES, PITTED_DEGREES, AZEMENA_DEGREES, SIGN_TEMPERAMENT,
  SIGN_TEMPERAMENT_NOTE, ASPECT_AFFINITY, SOURCE_META as AHKAM_SRC,
  AHKAM_SRC_NOTE, TIMING_TABLE, TIME_LADDER, TIMING_NOTE,
  LONG_ASCENSION, SHORT_ASCENSION, ASCENSION_EFFECT,
  TRIPLICITY_ACTION, SKIN_DISEASE_SIGNS, SKIN_DISEASES,
} from "../data/falak-ahkam-src.data.js";
import {
  PLANET_DISEASE, RAIN_PLANETS, RAIN_SIGNS, PLANET_WEATHER,
  AIRY_PLANETS, AIRY_SIGNS, TRIPLICITY_THERMAL, FATH_AL_BAB_PAIRS,
  FATH_AL_BAB_MEANING, FATH_AL_BAB_SEASON, PRICE_RULES_LORD, PRICE_SUBSTANCE,
  SOURCE_META as MUNDANE_SRC, MUNDANE_NOTE,
} from "../data/falak-mundane.data.js";
import abjad from "./abjad.js";
import bari from "./bari.js";
import { PLANET_YEARS, PLANET_YEARS_SRC, NODE_FIRDAR } from "../data/horary-bari.data.js";

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const norm360 = (x) => ((x % 360) + 360) % 360;

// ── حاكم اليوم ─────────────────────────────────────────────────────────────
/**
 * رب اليوم: الكوكب الحاكم للساعة الأولى بعد شروق ذلك اليوم.
 * ملاحظة: "اليوم" الفلكي يبدأ من الشروق لا من منتصف الليل؛ لذا قبل الشروق
 * ما يزال اليوم السابق. مرِّر lat/lon إن أردت هذا الضبط، وإلا يُؤخذ يوم التقويم.
 */
export function dayRuler(date, lat, lon) {
  let d = new Date(date);
  if (lat != null && lon != null) {
    const sr = sunTimes(d, lat, lon).sunrise;
    if (d < sr) d = new Date(d.getTime() - 86400000);
  }
  const idx = d.getDay(); // 0 = الأحد
  return { weekday: DAY_NAMES[idx], planet: DAY_RULERS[idx], index: idx };
}

// ── أوقات الشمس ───────────────────────────────────────────────────────────
/**
 * شروق وغروب اليوم الذي يقع فيه `date`، وشروق اليوم التالي.
 * @param {Date|string|number} date
 * @param {number} lat  خط العرض (شمالًا +)
 * @param {number} lon  خط الطول (شرقًا +)
 * @param {number} [elev=0] الارتفاع بالأمتار
 */
export function sunTimes(date, lat, lon, elev = 0) {
  const obs = new A.Observer(lat, lon, elev);
  const day = new Date(date);
  // ابدأ البحث من منتصف ليل اليوم المحلي تقريبًا (UTC كتقريب آمن مع limitDays=2)
  const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0));
  const back = new Date(start.getTime() - 86400000);

  const riseAfter = (t) => A.SearchRiseSet(A.Body.Sun, obs, +1, t, 2)?.date ?? null;
  const setAfter = (t) => A.SearchRiseSet(A.Body.Sun, obs, -1, t, 2)?.date ?? null;

  let sunrise = riseAfter(back);
  // اختر الشروق الذي يسبق منتصف نهار `date` أو يقاربه
  let next = riseAfter(sunrise ? new Date(sunrise.getTime() + 3600000) : start);
  // اجعل sunrise هو شروق يوم التاريخ المطلوب: آخر شروق ≤ التاريخ + 18h
  const ref = new Date(day.getTime());
  while (next && next <= new Date(ref.getTime() + 18 * 3600000)) {
    sunrise = next;
    next = riseAfter(new Date(next.getTime() + 3600000));
  }
  const sunset = setAfter(sunrise);
  const nextSunrise = next || riseAfter(new Date((sunset ?? sunrise).getTime() + 3600000));
  return { sunrise, sunset, nextSunrise };
}

// ── الساعات الكوكبية ─────────────────────────────────────────────────────
/**
 * جدول الساعات الكوكبية الـ24 ليوم معيّن وموقع معيّن.
 * ساعات النهار الاثنتا عشرة من الشروق للغروب (غير متساوية)، وساعات الليل
 * الاثنتا عشرة من الغروب لشروق الغد. حاكم الساعة الأولى = رب اليوم، ثم يتوالى
 * الحكم على ترتيب الكلدانيين دورًا مغلقًا.
 * @returns {{dayRuler:string, hours:Array<{i:number, phase:"نهار"|"ليل", ruler:string, start:Date, end:Date}>}}
 */
export function planetaryHours(date, lat, lon, elev = 0) {
  const { sunrise, sunset, nextSunrise } = sunTimes(date, lat, lon, elev);
  if (!sunrise || !sunset || !nextSunrise) {
    throw new Error("تعذّر حساب أوقات الشمس (قد يكون الموقع قطبيًا في هذا التاريخ).");
  }
  const dayLen = (sunset - sunrise) / 12;
  const nightLen = (nextSunrise - sunset) / 12;

  const rulerDay = dayRuler(sunrise).planet;
  const startIdx = CHALDEAN.indexOf(rulerDay);

  const hours = [];
  for (let i = 0; i < 12; i++) {
    hours.push({
      i: i + 1,
      phase: "نهار",
      ruler: CHALDEAN[(startIdx + i) % 7],
      start: new Date(sunrise.getTime() + i * dayLen),
      end: new Date(sunrise.getTime() + (i + 1) * dayLen)
    });
  }
  for (let i = 0; i < 12; i++) {
    hours.push({
      i: i + 13,
      phase: "ليل",
      ruler: CHALDEAN[(startIdx + 12 + i) % 7],
      start: new Date(sunset.getTime() + i * nightLen),
      end: new Date(sunset.getTime() + (i + 1) * nightLen)
    });
  }
  return { dayRuler: rulerDay, sunrise, sunset, nextSunrise, hours };
}

/**
 * جدول الساعات الكوكبية الصحيح للحظة `when` فعليًّا (لا لتاريخها التقويميّ
 * فقط) — يصحّح حالات التقاط `sunTimes` شروقَ الغدِ خطأً حين تكون اللحظة
 * قبل شروق اليوم أو بعد شروق الغد.
 */
export function planetaryHoursForMoment(when, lat, lon, elev = 0) {
  const t = new Date(when);
  let table = planetaryHours(t, lat, lon, elev);
  if (t < table.sunrise) table = planetaryHours(new Date(t.getTime() - 86400000), lat, lon, elev);
  else if (t >= table.nextSunrise) table = planetaryHours(new Date(t.getTime() + 86400000), lat, lon, elev);
  return table;
}

/** الساعة الكوكبية التي تقع فيها اللحظة `when`، وحاكمها. */
export function currentHour(when, lat, lon, elev = 0) {
  const t = new Date(when);
  const table = planetaryHoursForMoment(t, lat, lon, elev);
  const h = table.hours.find((x) => t >= x.start && t < x.end) || table.hours.at(-1);
  return { ...h, dayRuler: table.dayRuler };
}

// ── البروج ومواقع الكواكب ────────────────────────────────────────────────
/** برج ودرجة من طول مسيري (0..360) — مع الوجه والحدّ والمثلثة. */
export function zodiacOf(longitude) {
  const lon = norm360(longitude);
  const idx = Math.floor(lon / 30);
  const deg = lon - idx * 30;
  return {
    sign: SIGNS[idx].name,
    signInfo: SIGNS[idx],
    degreeInSign: deg,
    longitude: lon,
    face: faceRuler(idx, deg),        // { faceNumberInSign, ruler, faceIndex }
    term: termRuler(idx, deg),        // { ruler, from, to }
    triplicity: TRIPLICITIES[SIGNS[idx].element] // { day, night, partner }
  };
}

const BODY = {
  الشمس: A.Body.Sun,
  القمر: A.Body.Moon,
  عطارد: A.Body.Mercury,
  الزهرة: A.Body.Venus,
  المريخ: A.Body.Mars,
  المشتري: A.Body.Jupiter,
  زحل: A.Body.Saturn
};

function eclipticLon(bodyName, time) {
  if (bodyName === "الشمس") return A.SunPosition(time).elon;
  if (bodyName === "القمر") return A.EclipticGeoMoon(time).lon;
  return A.Ecliptic(A.GeoVector(BODY[bodyName], time, true)).elon;
}

/**
 * مواقع الكواكب السبعة الكلاسيكية لحظة معيّنة: الطول المسيري، البرج والدرجة،
 * وهل هو راجع (retrograde) — يُقاس بفرق الطول على ساعة قبل وبعد.
 */
export function planetPositions(when) {
  const t = A.MakeTime(new Date(when));
  const tPrev = t.AddDays(-0.5);
  const tNext = t.AddDays(0.5);
  const out = {};
  for (const name of Object.keys(BODY)) {
    const lon = norm360(eclipticLon(name, t));
    let retro = false;
    if (name !== "الشمس" && name !== "القمر") {
      let d = norm360(eclipticLon(name, tNext)) - norm360(eclipticLon(name, tPrev));
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      retro = d < 0;
    }
    out[name] = { ...zodiacOf(lon), retrograde: retro, planet: name, ...planetInfo(name) };
  }
  return out;
}

function planetInfo(name) {
  const p = PLANETS[name];
  return p ? { nature: p.nature, element: p.element, benefic: p.benefic, angel: p.angel } : {};
}

// ── منزلة القمر ─────────────────────────────────────────────────────────
/**
 * منزلة القمر (1..28) لحظة معيّنة. النموذج الأصليّ من شمس المعارف:
 * منزلة ← حرفٌ من أبجد بالترتيب ← كوكبُ الحرف ← مَلَكُه. مع تصنيف «الروحانية»
 * (سعد/نحس/ممتزجة) ونصّ الكتاب في شأنها.
 */
export function moonMansion(when) {
  const t = A.MakeTime(new Date(when));
  const lon = norm360(A.EclipticGeoMoon(t).lon);
  const idx = Math.floor(lon / MANSION_ARC); // 0..27
  const m = MANSIONS[idx];
  const src = MANSIONS_SRC[idx];
  const letter = src.letter;
  const letterPlanet = LETTER_PLANET[letter] || null;
  return {
    number: m.n,
    name: m.name,
    nature: m.nature,
    work: m.work,
    // النموذج الأصليّ (من نصّ الكبرى):
    letter,
    letterPlanet,
    letterAngel: letterPlanet ? PLANET_ANGELS[letterPlanet] : null,
    roohaniyya: src.roohaniyya,     // سعد | نحس | ممتزجة | معتدلة
    sourceNote: src.note,
    // تقليدٌ بديل (غاية الحكيم/أغريبا):
    picatrixAngel: MANSION_ANGELS[idx]?.angel || null,
    moonLongitude: lon,
    degreeInMansion: lon - idx * MANSION_ARC
  };
}

// ── الطالع (البرج الصاعد) ───────────────────────────────────────────────
/**
 * البرج الصاعد على الأفق الشرقي لحظة `when` عند خط العرض/الطول.
 * صيغة الطالع القياسية من الزمن النجمي الموضعي وميل فلك البروج.
 */
export function ascendant(when, lat, lon) {
  const time = A.MakeTime(new Date(when));
  const gstHours = A.SiderealTime(time);          // ساعات
  const lst = norm360(gstHours * 15 + lon);       // درجات
  const eps = 23.439291 - 0.0000004 * (time.tt);  // ميل تقريبي كافٍ للغرض
  const ramc = lst * RAD;
  const e = eps * RAD;
  const phi = lat * RAD;
  let asc =
    Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(e) + Math.tan(phi) * Math.sin(e))) *
    DEG;
  asc = norm360(asc);
  return { ...zodiacOf(asc), localSiderealTime: lst };
}

// ─────────────────────────────────────────────────────────────────────────────
// طبقة «أحكام النجوم» — الكرامات، النظر، البيوت، حال القمر، دلائل المسائل،
// حكم المسألة (الاختيارات/المسائل)، الانتهاء السنويّ، الفردارات، جودة اليوم.
// المصادر: شمس المعارف (الاختيارات)، أحكام الحكيم، القواعد الفلكية، التقليد الكلاسيكيّ.
// ─────────────────────────────────────────────────────────────────────────────

const SIGN_IDX = (name) => SIGNS.findIndex((s) => s.name === name);
const angSep = (a, b) => { const d = Math.abs(norm360(a) - norm360(b)) % 360; return d > 180 ? 360 - d : d; };
const P_LON = (pos, name) => pos[name]?.longitude ?? 0;

/** الكرامات الخمس والنحوس لكوكبٍ في طولٍ معيّن + مجموعُ الحظوظ. */
export function dignities(planet, longitude, opt = {}) {
  const z = zodiacOf(longitude);
  const sign = z.sign, deg = z.degreeInSign;
  const hits = [];
  let score = 0;
  if ((DOMICILE[planet] || []).includes(sign)) { hits.push("بيت"); score += DIGNITY_SCORE.domicile; }
  if (EXALT[planet] && EXALT[planet][0] === sign) { hits.push("شرف"); score += DIGNITY_SCORE.exalt; }
  const trip = TRIPLICITIES[z.signInfo.element];
  if (trip && [trip.day, trip.night, trip.partner].includes(planet)) { hits.push("مثلَّثة"); score += DIGNITY_SCORE.triplicity; }
  if (z.term && z.term.ruler === planet) { hits.push("حدّ"); score += DIGNITY_SCORE.term; }
  if (z.face && z.face.ruler === planet) { hits.push("وجه"); score += DIGNITY_SCORE.face; }
  if ((DETRIMENT[planet] || []).includes(sign)) { hits.push("وبال"); score += DIGNITY_SCORE.detriment; }
  if (FALL[planet] === sign) { hits.push("هبوط"); score += DIGNITY_SCORE.fall; }
  const peregrine = hits.length === 0;
  if (peregrine) hits.push("غريب (بلا حظّ)");
  const state =
    score >= 5 ? "قويٌّ جدًّا" : score >= 3 ? "قويّ" : score >= 1 ? "متوسّط" :
    score <= -4 ? "ضعيفٌ جدًّا" : score < 0 ? "ضعيف" : "غريب";
  return { planet, sign, degree: deg, dignities: hits, score, state, peregrine };
}

/**
 * درجاتُ البروج الخاصّة [أحكام الحكيم ج١ ص ١٥٨]: هل تقعُ درجةُ هذا الطولِ
 * المسيريّ في جدولِ «الزائد في السعادة» أو «الآبار/العَمى» أو «الزمانات»؟
 * الدرجةُ تُحسب عددًا صحيحًا ١..٣٠ (الدرجةُ الأولى من ٠° إلى ما دون ١°).
 * @param {number} longitude طولٌ مسيريّ 0..360
 * @returns {{sign, degree, fortunate:boolean, pitted:boolean, azemena:boolean,
 *            labels:string[], temperament:string|null, note:string}}
 */
export function specialDegrees(longitude) {
  const z = zodiacOf(longitude);
  const sign = z.sign;
  const degree = Math.min(30, Math.floor(z.degreeInSign) + 1);
  const fortunate = (FORTUNATE_DEGREES[sign] || []).includes(degree);
  const pitted = (PITTED_DEGREES[sign] || []).includes(degree);
  const azemena = (AZEMENA_DEGREES[sign] || []).includes(degree);
  const labels = [];
  if (fortunate) labels.push("درجةٌ زائدةٌ في السعادة (تقوية)");
  if (pitted) labels.push("درجةُ بئرٍ/عَمًى (خذلانٌ واحتباس)");
  if (azemena) labels.push("درجةُ زمانةٍ (عاهةٌ ومرضٌ إن حلّها نحسٌ)");
  let temperament = null;
  if (SIGN_TEMPERAMENT.فطنة.includes(sign)) temperament = "برجُ فِطنةٍ وذكاء";
  else if (SIGN_TEMPERAMENT.نسيان.includes(sign)) temperament = "برجُ نسيانٍ — رديءٌ للابتداءات";
  return {
    sign, degree, fortunate, pitted, azemena, labels, temperament,
    note: labels.length
      ? `${sign} ${degree}°: ${labels.join("؛ ")}.`
      : `${sign} ${degree}°: درجةٌ عاديّةٌ في جداول «أحكام الحكيم».`,
  };
}

// ── مقياسُ الزمن [أحكام الحكيم ج١ ص ١٥٢] ──────────────────────────────
const ANGULARITY = (house) =>
  [1, 4, 7, 10].includes(house) ? "وتد" :
  [2, 5, 8, 11].includes(house) ? "يلي الوتد" : "ساقط";

/**
 * نوعُ وحدةِ الزمن لدليلٍ في برجٍ معيّن وبيتٍ معيّن: من جدول (طبعُ البرج × موضعُ
 * البيت من الأوتاد). عددُ الوحدات يأتي من فضلِ الاتّصال بالدرجات في مكان الاستدعاء.
 * @param {number} longitude طولُ الدليل المسيريّ
 * @param {number} house رقمُ بيتِه ١..١٢
 */
const LADDER_RATIO = { "أيّام": 7, "أسابيع": 4, "شهور": 12, "سنون": 12 }; // الوحدةُ الأكبرُ = هذا العددُ من الوحدة الحالية
export function timingUnit(longitude, house) {
  const z = zodiacOf(longitude);
  const modality = z.signInfo.quality;          // منقلب | ثابت | ذو جسدين
  const ang = ANGULARITY(house);
  const unit = (TIMING_TABLE[modality] || {})[ang] || "أسابيع";
  // تدريجُ الموضع في البرج [ص ١٥٣]: أوّلُ البرج بوحدةٍ واحدة، وآخرُه بالوحدة الأكبر.
  const idx = TIME_LADDER.indexOf(unit);
  const ratio = LADDER_RATIO[unit] || null;
  let scaled = null;
  if (ratio && idx >= 0 && idx < TIME_LADDER.length - 1) {
    const frac = z.degreeInSign / 30;
    const count = 1 + frac * (ratio - 1);
    scaled = {
      count: Math.round(count * 10) / 10, unit,
      text: `${Math.round(count * 10) / 10} ${unit} (بموضع الدليل في ${(z.degreeInSign).toFixed(0)}° من برجه)`,
    };
  }
  return { modality, angularity: ang, unit, scaled, ladder: TIME_LADDER, note: TIMING_NOTE };
}

// ── الرأسُ والذنب (عقدتا القمر) [أحكام الحكيم ج١ ص ١٥٤] ──────────────
/**
 * نقطتان متحرّكتان على أوجِ القمر (لا كوكبان). الرأسُ طبعُه الزيادةُ دائمًا،
 * والذنبُ طبعُه النقص. الكوكبُ السعيدُ مع الرأس يزداد سعدُه، والنحسُ يزداد نحسُه؛
 * ومع الذنب: النحسُ ينقص نحسُه، والسعدُ ينقص سعدُه.
 */
export function lunarNodes(when) {
  const t = A.MakeTime(new Date(when));
  const T = t.tt / 36525.0; // قرونٌ يوليانيّةٌ من J2000
  // العقدةُ المتوسّطةُ الصاعدة (خطّيّة كافية للغرض):
  let om = 125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000;
  om = norm360(om);
  const head = zodiacOf(om);
  const tail = zodiacOf(norm360(om + 180));
  return {
    head: { longitude: om, sign: head.sign, degree: head.degreeInSign, nature: "الزيادة" },
    tail: { longitude: norm360(om + 180), sign: tail.sign, degree: tail.degreeInSign, nature: "النقص" },
    note: "الرأسُ يزيدُ طبعَ ما قارَنَه (سعدًا أو نحسًا)؛ والذنبُ يُنقِصُه.",
  };
}

// ── طبائعُ البروج ووظائفُها [أحكام الحكيم ج١ ص ١٥٤–١٥٥] ──────────────
/** خصالُ البرج: فِطنة/نسيان/إدراك/سماحة + فعلُ مثلَّثته + دلالتُه على الأمراض الجلديّة. */
export function signCharacter(sign) {
  const traits = Object.entries(SIGN_TEMPERAMENT).filter(([, v]) => v.includes(sign)).map(([k]) => k);
  const el = (SIGNS.find((s) => s.name === sign) || {}).element;
  return {
    sign, traits,
    triplicityAction: TRIPLICITY_ACTION[el] || null,
    skinDisease: SKIN_DISEASE_SIGNS.includes(sign),
    skinDiseasesIfAfflicted: SKIN_DISEASE_SIGNS.includes(sign) ? SKIN_DISEASES : null,
    note: SIGN_TEMPERAMENT_NOTE,
  };
}
export function skinDiseaseSigns() { return { signs: [...SKIN_DISEASE_SIGNS], diseases: SKIN_DISEASES }; }

/** البرجُ مستقيمُ الطلوع أم معوجُه، وأثرُ ذلك [أحكام الحكيم ج١ ص ١٥٤ / ج٤ ص ٢٢]. */
export function longShortAscension(sign) {
  const kind = LONG_ASCENSION.includes(sign) ? "مستقيمة"
    : SHORT_ASCENSION.includes(sign) ? "معوجة" : "—";
  return { sign, kind, effect: ASCENSION_EFFECT[kind] || "—" };
}

/** جنسُ المرض من الكوكب الدالّ [أحكام الحكيم ج٤ ص ٤]. */
export function diseaseNature(planet) {
  return PLANET_DISEASE[planet] || null;
}

// ── تشريقُ الكواكب وتغريبُها [أحكام الحكيم ج١ ص ١٥١] ──────────────────
/**
 * لكلِّ كوكبٍ (عدا الشمس): مشرِّقٌ إن كان خلفَ الشمس (يطلع قبلها)، مغرِّبٌ إن كان
 * أمامَها (يغرب بعدها). يُقاس بفرقِ الطول المسيريّ: 0..180 خلفَها ⇒ تشريق.
 */
// سرعةُ السير المتوسّطة (من الأسرع للأبطأ) — تُستعمل في نقل النور وجمعِه.
const SPEED_ORDER = ["القمر", "عطارد", "الزهرة", "الشمس", "المريخ", "المشتري", "زحل"];
const SUPERIOR = new Set(["المريخ", "المشتري", "زحل"]);
const INFERIOR = new Set(["الزهرة", "عطارد"]);

/**
 * تشريقُ الكواكب وتغريبُها [أحكام الحكيم ج١، الدرس ٢٧، ص ١٤٨–١٤٩].
 * العلويّةُ (المريخ/المشتري/زحل): من المقارنة إلى المقابلة = شرقيّةٌ متيامنة (قوّة)،
 * ومن المقابلة إلى المقارنة التالية = غربيّةٌ متياسرة (ضعف).
 * السفليّةُ (الزهرة/عطارد): بالعكس — قوّتُها في التغريب وضعفُها في التشريق.
 * والرجوعُ يُضعِف الحالَين، والاستقامةُ تُقوّيهما. [الكِشناريّ: اطلبِ العلويَّ
 * مشرِّقًا والسفليَّ مغرِّبًا في الروحانيّات.]
 */
export function orientalOccidental(when) {
  const pos = planetPositions(when);
  const sun = P_LON(pos, "الشمس");
  const out = {};
  for (const p of Object.keys(pos)) {
    if (p === "الشمس") { out[p] = { phase: "—", side: "—", strong: null, note: "النيّرُ لا تشريقَ له" }; continue; }
    const d = norm360(P_LON(pos, p) - sun);        // 0..360 شرقًا من الشمس
    const occidental = d > 0 && d < 180;            // أمامَ الشمس ⇒ يغرب بعدها
    const phase = occidental ? "غربيّ (متياسر)" : "شرقيّ (متيامن)";
    const retro = pos[p].retrograde;
    let strong = SUPERIOR.has(p) ? !occidental : INFERIOR.has(p) ? occidental : null;
    if (retro && strong != null) strong = null;    // الرجوعُ يُلغي القوّة
    out[p] = {
      phase,
      side: occidental ? "مغرِّب (أمام الشمس)" : "مشرِّق (خلف الشمس)",
      strong,
      note: retro ? "راجعٌ — يُضعِفُ التشريقَ والتغريبَ معًا"
        : strong === true ? (SUPERIOR.has(p) ? "علويٌّ مشرِّقٌ ⇒ قويّ" : "سفليٌّ مغرِّبٌ ⇒ قويّ")
        : strong === false ? (SUPERIOR.has(p) ? "علويٌّ مغرِّبٌ ⇒ ضعيف" : "سفليٌّ مشرِّقٌ ⇒ ضعيف")
        : "لا حكمَ للتشريق هنا",
    };
  }
  return out;
}

/**
 * نقلُ النور [أحكام الحكيم ج١ ص ١٤٩]: كوكبٌ خفيفٌ (سريع) منصرفٌ عن كوكبٍ،
 * متّصلٌ بكوكبٍ ثانٍ ⇒ ينقلُ نورَ الأوّل إلى الثاني. شهادةٌ على تمام الأمر بوسيط.
 * (تجاوزُ الاتّصالِ بدرجةٍ واحدةٍ يُعَدُّ انفصالًا عن الأوّل.)
 */
export function translationOfLight(when) {
  const t0 = new Date(when);
  const pos = planetPositions(t0);
  const later = planetPositions(new Date(t0.getTime() + 6 * 3600000));
  const names = Object.keys(pos);
  const out = [];
  for (const mover of names) {
    const mi = SPEED_ORDER.indexOf(mover);
    for (const a of names) {
      if (a === mover) continue;
      for (const b of names) {
        if (b === mover || b === a) continue;
        // mover أسرعُ من a و b (لينقلَ بينهما)
        if (!(mi < SPEED_ORDER.indexOf(a) && mi < SPEED_ORDER.indexOf(b))) continue;
        const asA = aspectBetween(P_LON(pos, mover), P_LON(pos, a));
        const asB = aspectBetween(P_LON(pos, mover), P_LON(pos, b));
        if (!asA || !asB) continue;
        const sepA = Math.abs(angSep(P_LON(later, mover), P_LON(later, a)) - asA.angle) >
                     Math.abs(angSep(P_LON(pos, mover), P_LON(pos, a)) - asA.angle);
        const appB = Math.abs(angSep(P_LON(later, mover), P_LON(later, b)) - asB.angle) <
                     Math.abs(angSep(P_LON(pos, mover), P_LON(pos, b)) - asB.angle);
        if (sepA && appB) out.push({
          mover, from: a, to: b, fromAspect: asA.name, toAspect: asB.name,
          text: `${mover} ينقلُ نورَ ${a} إلى ${b} (انصرافٌ عن ${a} بـ${asA.name}، واتّصالٌ بـ${b} بـ${asB.name}).`,
        });
      }
    }
  }
  return { any: out.length > 0, transfers: out };
}

/**
 * جمعُ النور [أحكام الحكيم ج١ ص ١٤٩]: كوكبان أثقلُ حركةً كلاهما متّصلٌ بكوكبٍ
 * ثالثٍ أبطأَ منهما ⇒ الثالثُ يجمعُ نورَهما. شهادةٌ على تمام الأمر بجامعٍ (كوسيطٍ من ذي جاه).
 */
export function collectionOfLight(when) {
  const pos = planetPositions(when);
  const names = Object.keys(pos);
  const out = [];
  for (const collector of names) {
    const ci = SPEED_ORDER.indexOf(collector);
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = names[i], b = names[j];
        if (a === collector || b === collector) continue;
        if (!(SPEED_ORDER.indexOf(a) < ci && SPEED_ORDER.indexOf(b) < ci)) continue; // a,b أسرعُ من الجامع
        const asA = aspectBetween(P_LON(pos, collector), P_LON(pos, a));
        const asB = aspectBetween(P_LON(pos, collector), P_LON(pos, b));
        if (asA && asB) out.push({
          collector, of: [a, b], aspects: [asA.name, asB.name],
          text: `${collector} يجمعُ نورَ ${a} (${asA.name}) و${b} (${asB.name}).`,
        });
      }
    }
  }
  return { any: out.length > 0, collections: out };
}

// ── فتحُ الباب [أحكام الحكيم ج١ ص ١٥١، ج٤ ص ٧–٩] ─────────────────────
/**
 * هل القمرُ ينقلُ النورَ بين زوجٍ متقابلِ البيوت (فتحُ الباب)؟ أي: ينصرفُ عن
 * كوكبٍ من الزوج ويتّصلُ بالآخرِ وهو في بيتِه. يُرجِع الزوجَ ودلالتَه وطبعَ الفصل.
 */
export function fathAlBab(when) {
  const t0 = new Date(when);
  const pos = planetPositions(t0);
  const later = planetPositions(new Date(t0.getTime() + 6 * 3600000));
  const moon = P_LON(pos, "القمر");
  const results = [];
  for (const pair of FATH_AL_BAB_PAIRS) {
    for (const [from, to] of [pair, [pair[1], pair[0]]]) {
      const aFrom = aspectBetween(moon, P_LON(pos, from));
      const aTo = aspectBetween(moon, P_LON(pos, to));
      if (!aFrom || !aTo) continue;
      // منصرفٌ عن `from` (مدبر) ومتّصلٌ بـ`to` (مقبل)
      const sepFrom = Math.abs(angSep(P_LON(later, "القمر"), P_LON(later, from)) - aFrom.angle) >
                      Math.abs(angSep(moon, P_LON(pos, from)) - aFrom.angle);
      const appTo = Math.abs(angSep(P_LON(later, "القمر"), P_LON(later, to)) - aTo.angle) <
                    Math.abs(angSep(moon, P_LON(pos, to)) - aTo.angle);
      const toSign = zodiacOf(P_LON(pos, to)).sign;
      const toInDomicile = (DOMICILE[to] || []).includes(toSign);
      if (sepFrom && appTo && toInDomicile) {
        const key = [pair[0], pair[1]].join("|");
        results.push({
          from, to, pair,
          meaning: FATH_AL_BAB_MEANING[key] || "تغيُّرٌ في الجوّ بحسب طبع الكوكبين.",
          seasonRule: FATH_AL_BAB_SEASON,
        });
      }
    }
  }
  return { open: results.length > 0, transfers: results };
}

// ── أحكامُ العالم: السنة/الفصل/الطقس/الغلاء [أحكام الحكيم ج٤] ─────────
const CARDINAL_INGRESS = { 0: "الربيع", 90: "الصيف", 180: "الخريف", 270: "الشتاء" };

/**
 * تنبّؤٌ عامٌّ للحظةٍ (تُقرَّب لأقرب ابتداءِ فصل): حرُّ السنة/بردُها من زحل والمريخ
 * بالمثلَّثات، وطبعُ الطقس من «فتح الباب» وكوكبِ الرياح، والغلاء/الرخص من برج القمر
 * ومستقيمِ الطلوع/معوجِه، وجنسُ الوباء من نحسِ الوقت. كلُّه من قواعد الطوخي.
 */
export function mundaneForecast(when, lat, lon) {
  const t = new Date(when);
  const pos = planetPositions(t);
  const sunLon = P_LON(pos, "الشمس");
  const seasonDeg = [0, 90, 180, 270].reduce((a, b) =>
    Math.abs(sunLon - b) < Math.abs(sunLon - a) ? b : a, 0);
  const season = CARDINAL_INGRESS[seasonDeg];

  // حرارةُ السنة من زحل والمريخ بالمثلَّثات
  const thermal = [];
  for (const p of ["زحل", "المريخ"]) {
    const el = zodiacOf(P_LON(pos, p)).signInfo.element;
    const eff = (TRIPLICITY_THERMAL[el] || {})[p];
    if (eff) thermal.push(`${p} في مثلَّثة ${el}: ${eff}.`);
  }

  // طبعُ الطقس: فتحُ الباب أوّلًا، ثمّ كوكبُ الرياح الأقوى دلالةً (الأسرع من كواكب المطر)
  const fb = fathAlBab(t);
  let weather;
  if (fb.open) {
    weather = fb.transfers.map((x) => `فتحُ الباب (${x.from}←القمر→${x.to}): ${x.meaning}`).join(" ");
  } else {
    const ms = moonState(t);
    const ruler = RAIN_PLANETS.includes(ms.nextAspectWith) ? ms.nextAspectWith
      : RAIN_PLANETS.find((p) => zodiacOf(P_LON(pos, p)).sign && RAIN_SIGNS.includes(zodiacOf(P_LON(pos, p)).sign))
      || "القمر";
    weather = `لا فتحَ بابٍ الآن؛ الدلالةُ لكوكب الرياح ${ruler}: ${PLANET_WEATHER[ruler]}`;
  }
  const moonSign = zodiacOf(P_LON(pos, "القمر")).sign;
  const airyEmphasis = AIRY_SIGNS.includes(moonSign) || RAIN_PLANETS.some((p) => AIRY_SIGNS.includes(zodiacOf(P_LON(pos, p)).sign));

  // الغلاءُ والرخص: برجُ القمر ومستقيمُ طلوعِه
  const asc = ascendant(t, lat, lon);
  const asx = longShortAscension(moonSign);
  const priceDir = asx.kind === "مستقيمة" ? "يغلو ويرتفع" : asx.kind === "معوجة" ? "يرخص ويستقلّ" : "—";
  const moonHouse = houseOf(P_LON(pos, "القمر"), asc.longitude);
  const substance = PRICE_SUBSTANCE[moonSign] || "جوهر البرج";

  return {
    when: t.toISOString(),
    season, seasonIngressDeg: seasonDeg,
    thermal,
    weather, airyEmphasis,
    fathAlBab: fb,
    prices: {
      moonSign, ascensionKind: asx.kind, direction: priceDir,
      substance,
      note: `القمرُ في ${moonSign} (${asx.kind} الطلوع) ⇒ سعرُ «${substance}» ${priceDir}. `
        + `ويُنظَر في رأس الشهر إلى ربِّ طالع الاجتماع: ${PRICE_RULES_LORD.map((r) => `${r.when} ⇒ ${r.effect}`).join("؛ ")}.`,
    },
    disease: null,
    verdict:
      `فصلُ ${season}: ` +
      (thermal.length ? thermal.join(" ") + " " : "") +
      weather + " " +
      `والأسعارُ: «${substance}» ${priceDir}.`,
    trace: [
      `الشمسُ عند ${sunLon.toFixed(1)}° ⇒ أقربُ ابتداءِ فصلٍ: ${season} (${seasonDeg}°).`,
      ...thermal,
      `فتحُ الباب: ${fb.open ? "مفتوحٌ — " + fb.transfers.map((x) => x.meaning).join("، ") : "غيرُ مفتوح"}.`,
      `القمرُ في ${moonSign} (${asx.kind} الطلوع، البيت ${moonHouse}) ⇒ ${priceDir} سعرُ «${substance}».`,
      "كلُّها قواعدُ ميكانيكيّةٌ من «أحكام الحكيم» ج٤ — لا غيبَ يُقرأ من السماء.",
    ],
    note: MUNDANE_NOTE,
  };
}

/** أقربُ نظرٍ بطلَميّ بين طولين، أو null. */
export function aspectBetween(lonA, lonB) {
  const sep = angSep(lonA, lonB);
  let best = null;
  for (const a of ASPECTS) {
    const orb = Math.abs(sep - a.angle);
    if (orb <= a.orb && (!best || orb < best.orb)) best = { name: a.name, angle: a.angle, orb, exact: orb < 1, nature: a.nature };
  }
  return best;
}

/** كلُّ الأنظار بين الكواكب السبعة لحظةَ `when`، مع الإقبال/الإدبار. */
export function aspectsBetween(when) {
  const now = planetPositions(when);
  const later = planetPositions(new Date(new Date(when).getTime() + 3600000));
  const names = Object.keys(now);
  const out = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const A1 = names[i], B1 = names[j];
      const asp = aspectBetween(P_LON(now, A1), P_LON(now, B1));
      if (!asp) continue;
      const d0 = Math.abs(angSep(P_LON(now, A1), P_LON(now, B1)) - asp.angle);
      const d1 = Math.abs(angSep(P_LON(later, A1), P_LON(later, B1)) - asp.angle);
      out.push({ a: A1, b: B1, ...asp, applying: d1 < d0, separating: d1 >= d0 });
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** رقمُ البيت (١..١٢) لطولٍ معيّن بالنسبة لطالعٍ معيّن (بيوتٌ بأبراجٍ تامّة). */
export function houseOf(longitude, ascLongitude) {
  const a = Math.floor(norm360(ascLongitude) / 30);
  const s = Math.floor(norm360(longitude) / 30);
  return ((s - a + 12) % 12) + 1;
}

/** البيوت الاثنا عشر (أبراجٌ تامّة) مع ساكنيها وحاكمِ كلٍّ ودلالتِه وقوّتِه. */
export function wholeSignHouses(ascLongitude, when) {
  const a = Math.floor(norm360(ascLongitude) / 30);
  const pos = planetPositions(when);
  return HOUSE_TOPICS.map((h, i) => {
    const si = (a + i) % 12;
    return {
      ...h, sign: SIGNS[si].name, ruler: SIGNS[si].ruler,
      planets: Object.keys(pos).filter((p) => Math.floor(P_LON(pos, p) / 30) === si),
    };
  });
}

const PHASE_NAMES = ["الاجتماع (المحاق)", "الهلال المتزايد", "التربيع الأوّل", "الأحدب المتزايد",
  "البدر", "الأحدب المتناقص", "التربيع الأخير", "الهلال المتناقص"];

/** حالُ القمر: الطور، تزايد/تناقص، السرعة، خلوُّ السير، طريقُ الاحتراق. */
export function moonState(when) {
  const t0 = new Date(when);
  const pos = planetPositions(t0);
  const moon = P_LON(pos, "القمر"), sun = P_LON(pos, "الشمس");
  const elong = norm360(moon - sun);
  const oct = Math.round(elong / 45) % 8;
  const m2 = norm360(A.EclipticGeoMoon(A.MakeTime(new Date(t0.getTime() + 86400000))).lon);
  let speed = m2 - moon; if (speed > 180) speed -= 360; if (speed < -180) speed += 360;
  const degLeft = 30 - (moon % 30);
  // خلوّ السير: هل يُتِمّ القمرُ نظرًا بطلميًّا لكوكبٍ قبل خروجِه من برجه؟
  let voc = true, minArc = Infinity, withWhat = null;
  for (const p of Object.keys(pos)) {
    if (p === "القمر") continue;
    for (const ang of [0, 60, 90, 120, 180]) {
      for (const s of [1, -1]) {
        const target = norm360(P_LON(pos, p) + s * ang);
        const arc = norm360(target - moon);
        if (arc <= degLeft + 0.5 && arc < minArc) { minArc = arc; withWhat = p; voc = false; }
      }
    }
  }
  return {
    longitude: moon, elongation: elong,
    phaseName: PHASE_NAMES[oct], waxing: elong < 180,
    speedPerDay: Math.round(speed * 100) / 100, fast: speed > 13.176,
    voidOfCourse: voc, nextAspectWith: voc ? null : withWhat,
    degreesToNextAspect: voc ? null : Math.round(minArc * 100) / 100,
    inViaCombusta: moon >= 195 && moon <= 225,
  };
}

/** حالُ كلِّ كوكبٍ من قربِه للشمس: قلبُ الشمس / احتراق / تحت الشعاع / حُرّ. */
export function combustState(when) {
  const pos = planetPositions(when);
  const sun = P_LON(pos, "الشمس");
  const out = {};
  for (const p of Object.keys(pos)) {
    if (p === "الشمس") { out[p] = "—"; continue; }
    const d = angSep(P_LON(pos, p), sun);
    out[p] = d <= SOLAR_PROXIMITY.cazimi ? "قلبُ الشمس (قوّة)" :
      d <= SOLAR_PROXIMITY.combust ? "احتراق" :
      d <= SOLAR_PROXIMITY.underBeams ? "تحت الشعاع" : "حُرّ";
  }
  return out;
}

const LOT_BODY = { asc: null, sun: "الشمس", moon: "القمر", venus: "الزهرة", saturn: "زحل", jupiter: "المشتري", mars: "المريخ", mercury: "عطارد" };

/** سهامُ العرب (اللوطات): السعادة، الغيب، الزواج، الأولاد، الأعداء. */
export function lots(when, lat, lon) {
  const asc = ascendant(when, lat, lon).longitude;
  const pos = planetPositions(when);
  const sunHouse = houseOf(P_LON(pos, "الشمس"), asc);
  const isDay = sunHouse >= 7; // الشمس فوق الأفق
  const val = (key) => key === "asc" ? asc : P_LON(pos, LOT_BODY[key]);
  const out = {};
  for (const [name, spec] of Object.entries(LOTS)) {
    const [p0, p1, p2] = isDay ? spec.day : spec.night;
    const L = norm360(val(p0) + val(p1) - val(p2));
    const z = zodiacOf(L);
    out[name] = { longitude: L, sign: z.sign, degree: z.degreeInSign, house: houseOf(L, asc), topic: spec.topic };
  }
  return { sect: isDay ? "نهاريّ" : "ليليّ", lots: out };
}

/**
 * «المؤتمن» (Almuten Figuris): الكوكبُ الأعظمُ كرامةً على خريطة الميلاد كلِّها،
 * لا على بيتٍ واحد — يُحسَب بجمع نقاط الكرامة (الجدول نفسُه: بيت٥/شرف٤/مثلَّثة٣/
 * حدّ٢/وجه١) لكلّ كوكبٍ سبعةٍ عند أربع نقاطٍ حسّاسةٍ من الخريطة: الطالع، الشمس،
 * القمر، وسهم السعادة — ثمّ الكوكبُ صاحبُ المجموع الأعلى هو «المؤتمن».
 * (بعض المصادر تضيف نقطة خامسة كوسط السماء أو الاجتماع/الاستقبال السابق؛
 * اكتُفِي هنا بالأربعة الأكثر اتّفاقًا بين المصادر.)
 */
export function almuten(when, lat, lon) {
  const asc = ascendant(when, lat, lon).longitude;
  const pos = planetPositions(when);
  const sunLon = P_LON(pos, "الشمس"), moonLon = P_LON(pos, "القمر");
  const fortuneLon = lots(when, lat, lon).lots["سهم السعادة"].longitude;
  const points = [
    { name: "الطالع", longitude: asc },
    { name: "الشمس", longitude: sunLon },
    { name: "القمر", longitude: moonLon },
    { name: "سهم السعادة", longitude: fortuneLon },
  ];
  const totals = {};
  const detail = [];
  for (const pt of points) {
    const z = zodiacOf(pt.longitude);
    const perPlanet = CHALDEAN.map((pl) => {
      const d = dignities(pl, pt.longitude);
      totals[pl] = (totals[pl] || 0) + Math.max(d.score, 0); // الوبال/الهبوط لا يُخصَمان من مجموع المؤتمن، فقط الحظوظُ الموجبة تُحسب
      return { planet: pl, score: Math.max(d.score, 0), dignities: d.dignities };
    });
    detail.push({ point: pt.name, sign: z.sign, degree: z.degreeInSign, perPlanet });
  }
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const [winner, winnerScore] = ranked[0];
  const tie = ranked.filter(([, s]) => s === winnerScore).map(([p]) => p);
  return {
    planet: winner, score: winnerScore, tie: tie.length > 1 ? tie : null,
    ranking: ranked.map(([planet, score]) => ({ planet, score })),
    points: detail,
    note: "المؤتمنُ هنا من أربع نقاطٍ (الطالع، الشمس، القمر، سهم السعادة)؛ بعض المصادر تضيف نقطةً خامسة (وسط السماء أو الاجتماع السابق) فقد يختلف الترتيبُ الدقيق تبعًا لذلك.",
  };
}

/** تصنيفُ موضوعِ السؤال إلى مفتاحٍ في جدول الدلائل. */
export function classifyAstroTopic(text) {
  const q = abjad.normalize(String(text || ""));
  // المسائلُ المخصوصة أوّلًا (البارع): كلماتُها أدلُّ من الكلمات العامّة («محبوس» ليست «حب»، و«انسرق… يرجع» سرقةٌ لا غائب)
  const PRIORITY = [["سرقة", ["سرق", "حرامي", "لص", "انسرق"]], ["حبس", ["سجن", "محبوس", "مسجون", "اسير", "أسير", "موقوف"]],
    ["ضالة", ["ضاع", "ضايع", "ضيعت", "اضعت", "فقدت", "ضالة"]], ["كنز", ["كنز", "دفين", "دفينة", "مدفون"]],
    ["رؤيا", ["حلم", "منام", "رؤيا", "حلمت"]], ["صناعة", ["مهنة", "صنعة", "صنعه", "تخصص"]], ["شركة", ["شريك", "شراكة", "شركه"]]];
  for (const [key, kws] of PRIORITY) if (kws.some((k) => q.includes(abjad.normalize(k)))) return key;
  for (const key of Object.keys(SIGNIFICATORS)) {
    if (key !== "عام" && q.includes(abjad.normalize(key))) return key;
  }
  const map = [["زواج", ["اتزوج", "زواج", "خطبه", "عريس", "عروس", "نتزوج", "زوجه", "زوجي"]],
    ["حب", ["حب", "يحبني", "تحبني", "أحب", "عشق"]],
    ["رزق", ["رزق", "فلوس", "مال", "دخل", "راتب", "فقر"]],
    ["عمل", ["عمل", "وظيفة", "شغل", "ترقية", "مشروع", "تجارة"]],
    ["سفر", ["سفر", "هجرة", "أسافر", "نسافر", "رحلة"]],
    ["ولد", ["ولد", "حمل", "أنجب", "ذرية", "عقم"]],
    ["مرض", ["مرض", "شفاء", "أشفى", "علة", "وجع", "المستشفى"]],
    ["قضية", ["قضية", "دعوى", "محكمة", "نزاع", "خصومة", "أكسب القضية"]],
    ["عدو", ["عدو", "خصم", "يكيد", "أعدائي"]],
    ["سحر", ["سحر", "مسحور", "معمول", "ربط"]],
    ["عين", ["عين", "حسد", "محسود", "نظرة"]],
    ["دراسة", ["دراسة", "امتحان", "نجاح", "الجامعة", "شهادة", "أنجح"]],
    ["غائب", ["غائب", "المسافر", "يرجع", "أخباره", "مفقود"]],
    // مسائلُ البارع
    ["صناعة", ["مجال"]],
    ["عقار", ["بيت", "دار", "شقة", "شقه", "ارض", "أرض", "عقار"]],
    ["بيع وشراء", ["ابيع", "بيع", "اشتري", "أشتري", "شراء", "صفقة"]],
    ["شركة", ["شريك", "شراكة", "شركه"]],
    ["كتاب", ["رسالة", "رساله", "مكتوب", "ايميل", "كتاب"]],
    ["رجاء", ["امنية", "أمنية", "امنيتي", "اتمنى", "أتمنى"]],
    ["صديق", ["صديق", "صاحبي", "صديقتي", "صحبة"]]];
  for (const [key, kws] of map) if (kws.some((k) => q.includes(abjad.normalize(k)))) return key;
  return "عام";
}

/**
 * حكمُ المسألة (على طريقة الاختيارات): يحدّد دليلَ السائل (حاكم الطالع + القمر)
 * ودليلَ المطلوب (حاكم بيته + كوكبه الطبيعيّ)، وينظر هل بينهما اتّصالٌ مقبل،
 * وحالَ الدليلين (كرامة/احتراق)، وحالَ القمر (خلوّ السير)، فيخرج «نعم/لا» +
 * تقديرَ وقتٍ + عواملَ + أثرًا كاملًا.
 */
export function horary(question, when, lat, lon) {
  const topic = classifyAstroTopic(question);
  const sig = SIGNIFICATORS[topic] || SIGNIFICATORS["عام"];
  const asc = ascendant(when, lat, lon);
  const ascLord = SIGNS[Math.floor(asc.longitude / 30)].ruler;
  const pos = planetPositions(when);
  const houses = wholeSignHouses(asc.longitude, when);
  const qHouse = houses[sig.house - 1];
  const qLord = qHouse.ruler;
  const natSigs = (sig.planets || []).filter((p) => CHALDEAN.includes(p));
  const ms = moonState(when);
  const comb = combustState(when);
  const asps = aspectsBetween(when);
  const querentSet = new Set([ascLord, "القمر"]);
  const quesitedSet = new Set([qLord, ...natSigs]);

  const perfection = asps.find((a) =>
    a.applying && ((querentSet.has(a.a) && quesitedSet.has(a.b)) || (querentSet.has(a.b) && quesitedSet.has(a.a))));

  const factors = [];
  let score = 0;
  if (perfection) {
    const w = perfection.name === "تثليث" ? 2 : perfection.name === "تسديس" ? 1
      : perfection.name === "مقارنة" ? 1.5 : perfection.name === "تربيع" ? -0.5 : -1;
    score += w;
    factors.push(`اتّصالٌ مقبلٌ بين الدليلين: ${perfection.a}—${perfection.b} (${perfection.name}، فضلٌ ${perfection.orb.toFixed(1)}°) ⇒ ${w > 0 ? "يقع الأمر" : "يقع بعُسرٍ أو نزاع"}`);
  } else {
    score -= 1.5;
    factors.push("لا اتّصالَ مقبلًا بين دليلِ السائل ودليلِ المطلوب ⇒ لا يتمّ الأمرُ بنفسه.");
  }

  // نقلُ النور وجمعُه [أحكام الحكيم ج١ ص ١٤٩] — تمامُ الأمرِ بوسيط.
  const tol = translationOfLight(when);
  const col = collectionOfLight(when);
  const relTrans = tol.transfers.filter((x) =>
    (querentSet.has(x.from) && quesitedSet.has(x.to)) || (quesitedSet.has(x.from) && querentSet.has(x.to)));
  const relColl = col.collections.filter((x) =>
    (querentSet.has(x.of[0]) && quesitedSet.has(x.of[1])) || (quesitedSet.has(x.of[0]) && querentSet.has(x.of[1])));
  const lightTransfer = relTrans[0] || relColl[0] || null;
  if (!perfection && lightTransfer) {
    score += 1;
    factors.push(relTrans[0]
      ? `${relTrans[0].text} ⇒ يتمّ الأمرُ بوسيطٍ (شخصٍ ينقلُ ويسعى بينكما).`
      : `${relColl[0].text} ⇒ يتمّ الأمرُ بجامعٍ (شخصٍ ذي جاهٍ يجمعُ الطرفين).`);
  }

  const byNight = houseOf(P_LON(pos, "الشمس"), asc.longitude) < 7;
  const dqLord = dignities(qLord, P_LON(pos, qLord), { byNight });
  score += dqLord.score / 5;
  factors.push(`حاكمُ بيت المسألة (${qLord}): ${dqLord.state} [${dqLord.dignities.join("، ")}]`);
  const dAsc = dignities(ascLord, P_LON(pos, ascLord), { byNight });
  factors.push(`حاكمُ الطالع (${ascLord}): ${dAsc.state}`);
  if (ms.voidOfCourse) { score -= 1.5; factors.push("القمرُ خالي السير ⇒ «لا يكون من الأمر شيء»."); }
  else factors.push(`القمرُ متّصلٌ بـ${ms.nextAspectWith} بعد ${ms.degreesToNextAspect}° (${ms.phaseName}، ${ms.waxing ? "متزايد" : "متناقص"}).`);
  for (const p of new Set([ascLord, qLord, ...natSigs])) {
    if (comb[p] === "احتراق") { score -= 1; factors.push(`${p} محترقٌ تحت الشمس ⇒ ضعفٌ ومنعٌ وخفاء.`); }
    else if (comb[p] === "قلبُ الشمس (قوّة)") { score += 0.5; factors.push(`${p} في قلبِ الشمس ⇒ قوّةٌ خفيّة.`); }
  }

  // درجاتُ البروج الخاصّة [أحكام الحكيم ج١ ص ١٥٨] على الطالع والقمر ودليل المطلوب.
  const isHealth = topic === "صحة" || topic === "مرض";
  const sdChecks = [
    ["الطالع", specialDegrees(asc.longitude)],
    ["القمر", specialDegrees(P_LON(pos, "القمر"))],
    [`حاكمُ بيت المسألة (${qLord})`, specialDegrees(P_LON(pos, qLord))],
  ];
  const specialDegreeHits = [];
  for (const [who, sd] of sdChecks) {
    if (sd.fortunate) { score += 0.3; factors.push(`${who} في درجةٍ زائدةٍ في السعادة (${sd.sign} ${sd.degree}°) ⇒ تقويةٌ للموضع.`); }
    if (sd.pitted) { score -= 0.5; factors.push(`${who} في درجةِ بئرٍ/عَمًى (${sd.sign} ${sd.degree}°) ⇒ خذلانٌ واحتباسٌ حتى يخرجَ منها.`); }
    if (sd.azemena && (who === "القمر" || isHealth)) { score -= 0.5; factors.push(`${who} في درجةِ زمانةٍ (${sd.sign} ${sd.degree}°) ⇒ خوفُ عاهةٍ أو مرضٍ${isHealth ? "" : " (يُعتَدُّ به في مسائل البدن)"}.`); }
    if (sd.labels.length) specialDegreeHits.push({ who, ...sd });
  }

  factors.push(`بيتُ المسألة: ${sig.house} (${qHouse.name}، ${qHouse.strength}) في ${qHouse.sign}.`);

  // العقدتان [ص ١٥٤]: الرأسُ يزيدُ طبعَ ما قارَنَه، والذنبُ يُنقِصُه.
  const nodes = lunarNodes(when);
  for (const [who, lon2] of [["حاكمُ الطالع", P_LON(pos, ascLord)], ["حاكمُ بيت المسألة", P_LON(pos, qLord)], ["القمر", P_LON(pos, "القمر")]]) {
    if (angSep(lon2, nodes.head.longitude) < 6) { factors.push(`${who} مع الرأس (${nodes.head.sign} ${nodes.head.degree.toFixed(0)}°) ⇒ زيادةٌ في طبعِه.`); score += who.includes("الطالع") ? 0.3 : 0.15; }
    if (angSep(lon2, nodes.tail.longitude) < 6) { factors.push(`${who} مع الذنب (${nodes.tail.sign} ${nodes.tail.degree.toFixed(0)}°) ⇒ نقصٌ في طبعِه.`); score -= who.includes("الطالع") ? 0.3 : 0.15; }
  }

  // جنسُ المرض [أحكام الحكيم ج٤ ص ٤]: في مسائل البدن، طبعُ حاكمِ السادس أو النحسِ الناظر.
  let disease = null;
  if (isHealth) {
    const sixthLord = houses[5].ruler;
    const dcand = diseaseNature(sixthLord) ? sixthLord
      : (natSigs.find((p) => diseaseNature(p)) || null);
    if (dcand) {
      disease = { from: dcand, ...diseaseNature(dcand) };
      factors.push(`جنسُ العلّة (من ${dcand}، حاكمِ السادس/النحسِ الدالّ): ${disease.nature} — ${disease.diseases}`);
    }
    // الأمراضُ الجلديّة [ص ١٥٥]: القمرُ أو سهمُ السعادة في أحدِ البروج الثمانية منحوسًا.
    const moonSign = zodiacOf(P_LON(pos, "القمر")).sign;
    if (SKIN_DISEASE_SIGNS.includes(moonSign) && (ms.voidOfCourse || comb["القمر"] === "احتراق")) {
      factors.push(`القمرُ في ${moonSign} (من بروج الأمراض الجلديّة) منحوسًا ⇒ خوفُ: ${SKIN_DISEASES}.`);
      score -= 0.4;
    }
  }

  // أحكامُ المسائل الخاصّة بكلّ موضوع [البارع لابن أبي الرجال، باب المسائل]
  let bariR = null;
  try {
    const lotsNow = lots(when, lat, lon);
    const hr = currentHour(when, lat, lon);
    bariR = bari.judge(topic, {
      ascLon: asc.longitude, pos, asps, comb, ms, hourRuler: hr?.ruler, ascLord, qLord,
      lotLon: lotsNow.lots["سهم السعادة"]?.longitude, dig: (p) => dignities(p, P_LON(pos, p), { byNight }).score,
    });
    score += bariR.adj;
    for (const x of bariR.details) if (x.s) factors.push(`${x.text} [${x.src}]`);
  } catch {}

  let verdict = score >= 1.5 ? "نعم — يتمّ الأمرُ بإذن الله"
    : score >= 0 ? "نعم، بشرطِ سعيٍ وشيءٍ من التأخير"
    : score > -1.5 ? "الأمرُ متوقّفٌ لم يترجّحْ بعدُ لجانب"
    : "لا — لا يتمّ، والأولى تركُه";
  // مسائلُ الوصف (أيُّ صنعة؟ ما معنى الرؤيا؟) لا جوابَ «نعم/لا» لها: الحكمُ هو الوصفُ نفسُه
  const infoV = (topic === "صناعة" || topic === "رؤيا") && bariR ? bariR.details.find((x) => !/^مراحلُ الأمر|^القمرُ مقبلٌ|^صاحبُ الطالع/.test(x.text)) : null;
  if (infoV) verdict = infoV.text.replace(/\.$/, "");

  // تقديرُ الوقت [مقياس الزمن — أحكام الحكيم ج١ ص ١٥٢]: عددُ الوحدات = فضلُ
  // الاتّصال بالدرجات؛ نوعُ الوحدة من جدول (طبعُ برجِ الدليل الأسرع × موضعُ بيتِه).
  let timing = null;
  if (perfection) {
    const LIGHT = ["القمر", "عطارد", "الزهرة", "الشمس", "المريخ", "المشتري", "زحل"];
    const faster = LIGHT.indexOf(perfection.a) <= LIGHT.indexOf(perfection.b) ? perfection.a : perfection.b;
    const fHouse = houseOf(P_LON(pos, faster), asc.longitude);
    const tu = timingUnit(P_LON(pos, faster), fHouse);
    const count = Math.max(1, Math.round(perfection.orb));
    timing = {
      text: tu.unit.includes("مطلقة") ? "مدّةٌ مطلقةٌ لا تتحدّد (الدليل الأسرع ثابتٌ ساقط)"
        : `نحوَ ${count} ${tu.unit}`,
      count, unit: tu.unit, orb: perfection.orb,
      byPosition: tu.scaled ? tu.scaled.text : null,
      fromPlanet: faster, modality: tu.modality, angularity: tu.angularity,
    };
    factors.push(`مقياسُ الزمن من ${faster} (${tu.modality}، ${tu.angularity}) وفضلِ الاتّصال ${perfection.orb.toFixed(1)}° ⇒ ${timing.text}${tu.scaled ? ` (وبموضعه في برجه: ${tu.scaled.text})` : ""}.`);
  }

  return {
    topic, question: String(question || ""),
    ascendant: asc.sign, ascLord,
    quesited: { house: sig.house, name: qHouse.name, sign: qHouse.sign, lord: qLord, naturalSignificators: natSigs, note: sig.note },
    moon: { phase: ms.phaseName, waxing: ms.waxing, voidOfCourse: ms.voidOfCourse },
    perfection: perfection ? { between: [perfection.a, perfection.b], aspect: perfection.name, orb: perfection.orb } : null,
    lightTransfer: lightTransfer ? { kind: relTrans[0] ? "نقل نور" : "جمع نور", text: lightTransfer.text } : null,
    specialDegrees: specialDegreeHits,
    disease,
    score: Math.round(score * 100) / 100,
    verdict, timing, factors,
    bari: bariR,
    trace: [
      `موضوع السؤال ⇒ «${topic}» ⇒ البيت ${sig.house} وكواكبُه ${(sig.planets || []).join("، ")}.`,
      `الطالع: ${asc.sign} ${asc.degreeInSign.toFixed(1)}° ⇒ حاكمُه ${ascLord}.`,
      `بيت المسألة (${sig.house}) في ${qHouse.sign} ⇒ حاكمُه ${qLord}.`,
      ...factors,
      `مجموع النقاط = ${Math.round(score * 100) / 100} ⇒ ${verdict}${timing ? " — " + timing.text : ""}.`,
      "كلُّ ذلك زوايا محسوبةٌ وجداولُ حظوظٍ ثابتة — لا غيبَ يُقرأ من السماء.",
    ],
  };
}

/** الانتهاء السنويّ (profection): بيتُ السنة وحاكمُها من عمرِ المولود وطالعِه. */
export function annualProfection(birthWhen, targetWhen, birthAscLongitude) {
  const b = new Date(birthWhen), tgt = new Date(targetWhen);
  let age = tgt.getUTCFullYear() - b.getUTCFullYear();
  const beforeBday = (tgt.getUTCMonth() < b.getUTCMonth()) ||
    (tgt.getUTCMonth() === b.getUTCMonth() && tgt.getUTCDate() < b.getUTCDate());
  if (beforeBday) age--;
  age = Math.max(0, age);
  const ascIdx = Math.floor(norm360(birthAscLongitude) / 30);
  const house = (age % 12) + 1;
  const signIdx = (ascIdx + age) % 12;
  const yearLord = SIGNS[signIdx].ruler;
  return {
    age, profectedHouse: house, profectedSign: SIGNS[signIdx].name, yearLord,
    houseName: HOUSE_TOPICS[house - 1].name, houseTopic: HOUSE_TOPICS[house - 1].topic,
    governs: PLANET_GOVERNS[yearLord],
    note: `سنةُ العمر ${age}: يحكمها ${yearLord}، ومحورُها بيتُ «${HOUSE_TOPICS[house - 1].name}» (${SIGNS[signIdx].name}).`,
  };
}

/** الفردارات: صاحبُ الفترة الكبرى والفرعيّة بحسب العمر (٧٥ سنةً ثم تعود). */
export function firdaria(birthWhen, targetWhen, opt = {}) {
  const order = opt.byNight ? FIRDARIA_NIGHT : FIRDARIA_DAY;
  const cycle = order.reduce((a, [, y]) => a + y, 0); // ٧٠
  const ageYears = (new Date(targetWhen) - new Date(birthWhen)) / (365.2422 * 86400000);
  let t = ((ageYears % cycle) + cycle) % cycle;
  let major = order[0], acc = 0;
  for (const row of order) { if (t < acc + row[1]) { major = row; break; } acc += row[1]; }
  const posInMajor = t - acc;
  const majorLord = major[0], majorYears = major[1];
  const subLen = majorYears / 7;
  const start = FIRDARIA_SUB_ORDER.indexOf(majorLord);
  const rot = FIRDARIA_SUB_ORDER.slice(start < 0 ? 0 : start).concat(FIRDARIA_SUB_ORDER.slice(0, start < 0 ? 0 : start));
  const minorLord = rot[Math.min(6, Math.floor(posInMajor / subLen))];
  return {
    ageYears: Math.round(ageYears * 100) / 100,
    majorLord, majorGoverns: PLANET_GOVERNS[majorLord], yearsIntoMajor: Math.round(posInMajor * 100) / 100, majorLength: majorYears,
    minorLord, minorGoverns: PLANET_GOVERNS[minorLord],
    nextLord: order[(order.indexOf(major) + 1) % order.length][0], yearsLeftMajor: Math.round((majorYears - posInMajor) * 100) / 100,
    yearsLeftMinor: Math.round((subLen - (posInMajor % subLen)) * 100) / 100, nextMinor: rot[Math.min(6, Math.floor(posInMajor / subLen)) + 1] || null,
    note: `الحكمُ الأكبرُ لـ${majorLord} (${PLANET_GOVERNS[majorLord]})، والفرعيُّ الآن لـ${minorLord}.`,
  };
}

/** جودةُ يومٍ للأعمال: رب اليوم + منزلة القمر + طوره + خلوّ سيره. */
export function dayQuality(when, lat, lon) {
  const dr = dayRuler(when, lat, lon).planet;
  const hr = currentHour(when, lat, lon).ruler;
  const mm = moonMansion(when);
  const ms = moonState(when);
  const works = DAY_RULER_WORKS[dr] || { good: [], bad: [] };
  let score = 0;
  score += ms.waxing ? 0.5 : -0.5;
  score += ms.voidOfCourse ? -1 : 0;
  score += mm.roohaniyya === "سعد" ? 1 : mm.roohaniyya === "نحس" ? -1 : 0;
  score += ["المشتري", "الزهرة"].includes(dr) ? 0.5 : ["زحل", "المريخ"].includes(dr) ? -0.3 : 0;
  score = Math.round(score * 100) / 100;
  return {
    dayRuler: dr, hourRuler: hr,
    mansion: { n: mm.number, name: mm.name, roohaniyya: mm.roohaniyya, work: mm.work },
    moon: { phase: ms.phaseName, waxing: ms.waxing, voidOfCourse: ms.voidOfCourse },
    goodFor: works.good, badFor: works.bad, score,
    verdict: score >= 1 ? "يومٌ صالحٌ عمومًا" : score >= 0 ? "يومٌ متوسّط" : "يومٌ متعثّر — أجّل المهمّ",
  };
}

/**
 * اختيارُ وقتٍ لغرضٍ: يمسح ساعةً ساعةً بين وقتين (بحدٍّ أسبوع) ويرتّب النوافذ
 * بحسب: مطابقةِ حاكم الساعة لكوكب الغرض + جودةِ اليوم + كرامةِ كوكب الغرض +
 * سلامتِه من الاحتراق.
 */
export function election(topic, fromWhen, toWhen, lat, lon) {
  const key = SIGNIFICATORS[topic] ? topic : classifyAstroTopic(topic);
  const sig = SIGNIFICATORS[key] || SIGNIFICATORS["عام"];
  const purposePlanet = (sig.planets || []).find((p) => CHALDEAN.includes(p)) || "المشتري";
  const start = new Date(fromWhen).getTime();
  const end = Math.min(new Date(toWhen).getTime(), start + 7 * 86400000);
  const rows = [];
  for (let ti = start, guard = 0; ti < end && guard < 180; ti += 3600000, guard++) {
    const t = new Date(ti);
    const hr = currentHour(t, lat, lon).ruler;
    const dq = dayQuality(t, lat, lon);
    const pos = planetPositions(t);
    const dig = dignities(purposePlanet, P_LON(pos, purposePlanet));
    const comb = combustState(t)[purposePlanet];
    let s = 0;
    if (hr === purposePlanet) s += 2;
    s += dq.score;
    s += dig.score / 5;
    if (comb === "احتراق") s -= 1.5;
    rows.push({ start: t.toISOString(), hourRuler: hr, dayScore: dq.score, purposeDignity: dig.state, combust: comb, score: Math.round(s * 100) / 100 });
  }
  rows.sort((a, b) => b.score - a.score);
  return {
    topic: key, purposePlanet,
    best: rows.slice(0, 3),
    note: `أفضلُ نافذةٍ: ساعةُ ${purposePlanet}، والقمرُ متزايدٌ غيرُ خالٍ، وكوكبُ الغرضِ في كرامةٍ وغيرُ محترق.`,
  };
}

// ── لقطة كاملة ─────────────────────────────────────────────────────────
/**
 * "خريطة الساعة" التي يبني عليها الممارس قراءته: اليوم، الساعة وحاكمها،
 * الطالع، البيوت، منزلة القمر، حال القمر، مواقع الكواكب، الأنظار، السهام.
 */
export function snapshot(when, lat, lon, elev = 0) {
  const asc = ascendant(when, lat, lon);
  const ms = moonState(when);
  return {
    when: new Date(when).toISOString(),
    location: { lat, lon, elev },
    day: dayRuler(when, lat, lon),
    hour: currentHour(when, lat, lon, elev),
    ascendant: asc,
    houses: wholeSignHouses(asc.longitude, when),
    moonMansion: moonMansion(when),
    moon: ms,
    planets: planetPositions(when),
    aspects: aspectsBetween(when),
    lots: lots(when, lat, lon),
    dayQuality: dayQuality(when, lat, lon),
    specialDegrees: {
      ascendant: specialDegrees(asc.longitude),
      moon: specialDegrees(ms.longitude),
      note: AHKAM_SRC_NOTE,
    },
    orientalOccidental: orientalOccidental(when),
    translationOfLight: translationOfLight(when),
    collectionOfLight: collectionOfLight(when),
    lunarNodes: lunarNodes(when),
    fathAlBab: fathAlBab(when),
    mundane: mundaneForecast(when, lat, lon),
  };
}

export const SOURCES = { ...SOURCES_META, ahkam1: AHKAM_SRC, ahkam4: MUNDANE_SRC };
/** سنو الكواكب الأربعة (العظمى/الكبرى/الوسطى/الصغرى) والفردارات [المدخل الكبير ٧:٨] */
export function planetYears(planet) { return planet ? (PLANET_YEARS[planet] ? { planet, ...PLANET_YEARS[planet], src: PLANET_YEARS_SRC } : null) : { table: PLANET_YEARS, nodes: NODE_FIRDAR, src: PLANET_YEARS_SRC }; }
export const SPECIAL_DEGREE_TABLES = {
  FORTUNATE_DEGREES, PITTED_DEGREES, AZEMENA_DEGREES,
  SIGN_TEMPERAMENT, SIGN_TEMPERAMENT_NOTE, ASPECT_AFFINITY,
  TIMING_TABLE, LONG_ASCENSION, SHORT_ASCENSION, note: AHKAM_SRC_NOTE,
};

export default {
  dayRuler,
  planetYears,
  sunTimes,
  planetaryHours,
  planetaryHoursForMoment,
  currentHour,
  zodiacOf,
  planetPositions,
  moonMansion,
  ascendant,
  snapshot,
  dignities,
  specialDegrees,
  timingUnit,
  longShortAscension,
  diseaseNature,
  orientalOccidental,
  translationOfLight,
  collectionOfLight,
  lunarNodes,
  signCharacter,
  skinDiseaseSigns,
  fathAlBab,
  mundaneForecast,
  aspectBetween,
  aspectsBetween,
  houseOf,
  wholeSignHouses,
  moonState,
  combustState,
  lots,
  almuten,
  classifyAstroTopic,
  horary,
  annualProfection,
  firdaria,
  dayQuality,
  election,
  CHALDEAN,
  PLANETS,
  SIGNS,
  MANSIONS,
  SOURCES,
  SPECIAL_DEGREE_TABLES,
};
