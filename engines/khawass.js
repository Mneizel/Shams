// engines/khawass.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك الخواصّ — كتالوجٌ مُهيكَل لما لا يُحسَب في الكتاب:
//   الأسماء الحسنى (مع قيمها العددية المحسوبة)، خواصّ السور والآيات، الحروف
//   المقطّعة، والبخور/الأعشاب/الأحجار (مع وسم السُّمّ).
//
// ويربط الأرقام بالأسماء: أعطِه جُمّل اسمٍ أو حاجة، يدلّك على الاسم/الأسماء
// المطابقة له أو الأقرب — وهذا ما يفعله المشتغل بالكتاب لاختيار «الاسم الموافق».
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import { NAMES } from "../data/asma-husna.data.js";
import { SURAHS, AYAT, HURUF_MUQATTAA } from "../data/khawass-quran.data.js";
import { INCENSE, HERBS, STONES, SAFETY } from "../data/materia.data.js";
import { ADIYA, NOTE as ADIYA_NOTE } from "../data/adiya.data.js";
import { FUTUH_RABBANI, FUTUH_RABBANI_RAW } from "../data/turuq-tukhi.data.js";

// الأسماء + قيمها (تُحسب مرّة)
const NAMES_V = NAMES.map((n, i) => ({
  index: i + 1,
  name: n.name,
  value: abjad.jummal(n.name),
  saghir: abjad.saghir(abjad.jummal(n.name)),
  khassa: n.khassa
}));

export function names() { return NAMES_V.slice(); }

export function nameByIndex(i) { return NAMES_V[i - 1] || null; }

/** الأسماء التي قيمتها = value تمامًا. */
export function namesByValue(value) {
  return NAMES_V.filter((n) => n.value === value);
}

/**
 * الاسم/الأسماء «الموافقة» لعددٍ (جُمّل اسمٍ أو حاجة): المطابقة تمامًا، وإلا
 * الأقرب، وإلا التي توافق في الجُمّل الصغير (نفس الجذر الرقميّ).
 */
export function matchName(value) {
  const exact = namesByValue(value);
  if (exact.length) return { mode: "تطابق", value, names: exact };
  const sag = abjad.saghir(value);
  const bySaghir = NAMES_V.filter((n) => n.saghir === sag)
    .sort((a, b) => Math.abs(a.value - value) - Math.abs(b.value - value));
  const nearest = NAMES_V.slice().sort((a, b) => Math.abs(a.value - value) - Math.abs(b.value - value)).slice(0, 3);
  return {
    mode: "تقريب",
    value,
    saghir: sag,
    bySaghir: bySaghir.slice(0, 5),
    nearest,
    note: "لا يوجد اسمٌ بنفس العدد؛ يختار المشتغل الأقرب عددًا أو الموافق في الجُمّل الصغير."
  };
}

/** الاسم الموافق لشخصٍ من اسمه واسم أمّه (طريقة متداولة). */
export function nameForPerson(name, mother) {
  const total = abjad.jummal(name) + abjad.jummal(mother);
  const idx = ((total - 1) % NAMES_V.length) + 1;
  return {
    total,
    method: `(${abjad.jummal(name)} + ${abjad.jummal(mother)}) mod ${NAMES_V.length} + 1 = ${idx}`,
    name: NAMES_V[idx - 1],
    alsoByValue: matchName(total)
  };
}

/**
 * «الفتوح الرباني» (النقشبندي/الجيلاني) من مُلحق قرعة جعفر الصادق: الوِردُ اليوميُّ
 * ببنودِه وأعدادِه، ثمّ خطواتُ الجلسةِ الروحيّةِ (الذكرِ القلبيِّ) بالترتيب — رابطةُ
 * القبرِ ورابطةُ الشيخِ ضمنَها. نصُّ الكتابِ الحرفيُّ في `raw`.
 */
export function futuhRabbani() {
  const totalWirdReps =
    FUTUH_RABBANI.wird.reduce((a, w) => a + w.count, 0) + FUTUH_RABBANI.dua.count;
  return {
    heading: FUTUH_RABBANI.heading,
    murshid: FUTUH_RABBANI.murshid,
    intro: FUTUH_RABBANI.intro,
    wird: FUTUH_RABBANI.wird.map((w) => ({ ...w })),
    dua: { ...FUTUH_RABBANI.dua },
    wirdNote: FUTUH_RABBANI.wirdNote,
    wirdRepsTotal: totalWirdReps,
    jalsa: {
      title: FUTUH_RABBANI.jalsa.title,
      when: FUTUH_RABBANI.jalsa.when,
      claim: FUTUH_RABBANI.jalsa.claim,
      steps: FUTUH_RABBANI.jalsa.steps.slice(),
      waswasa: FUTUH_RABBANI.jalsa.waswasa,
      hadith: FUTUH_RABBANI.jalsa.hadith,
    },
    source: "قرعة جعفر الصادق (مُلحق) — الطوخي، ص ٤٧–٥٢",
    raw: FUTUH_RABBANI_RAW,
  };
}

export function surahs() { return SURAHS.slice(); }
export function ayat() { return AYAT.slice(); }
export function hurufMuqattaa() { return HURUF_MUQATTAA; }
export function adiya() { return { list: ADIYA.slice(), note: ADIYA_NOTE }; }

export function materia() {
  return { incense: INCENSE, herbs: HERBS, stones: STONES, safety: SAFETY };
}

/** كل المكوّنات السامّة الموسومة — لجدول التحذيرات في الواجهة. */
export function toxicList() {
  return [...INCENSE, ...HERBS].filter((m) => m.toxic).map((m) => ({ name: m.name, note: m.note }));
}

/** بحثٌ نصّيٌّ بسيط في كل كتالوجات الخواصّ. */
export function search(q) {
  const n = abjad.normalize(q);
  const hit = (s) => abjad.normalize(String(s)).includes(n);
  return {
    names: NAMES_V.filter((x) => hit(x.name) || hit(x.khassa)),
    surahs: SURAHS.filter((x) => hit(x.ref) || hit(x.uses) || hit(x.also || "")),
    ayat: AYAT.filter((x) => hit(x.ref) || hit(x.uses)),
    materia: [...INCENSE, ...HERBS, ...STONES].filter((x) => hit(x.name) || hit(x.use || "") || hit(x.note || "")),
    adiya: ADIYA.filter((x) => hit(x.name) || hit(x.purpose) || hit(x.attrib) || hit(x.structure))
  };
}

export default {
  names, nameByIndex, namesByValue, matchName, nameForPerson, futuhRabbani,
  surahs, ayat, hurufMuqattaa, adiya, materia, toxicList, search
};
