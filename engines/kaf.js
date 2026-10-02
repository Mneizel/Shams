// engines/kaf.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك «قراءة الكفّ» — التفسيرُ الحتميُّ من كتبِ علمِ الكفّ.
//
// المحرّكُ لا «يرى» — يستقبلُ كائنَ ملامحَ (features) تُنتِجُه طبقةُ الرؤيةِ في
// المتصفّح (MediaPipe لشكلِ اليدِ والأصابع، OpenCV.js للخطوط)، ويحوّلُه إلى
// قراءةٍ منظَّمةٍ بنصِّ الكتابِ وأرقامِ فصولِه/فقراتِه. نفسُ الملامح ⇒ نفسُ القراءة.
//
// حاجزُ الصدق: أيُّ ميزةٍ ثقتُها دون العتبةِ تُوسَمُ «لم يتبيّنْ» ولا يُبنى عليها حكم.
// ─────────────────────────────────────────────────────────────────────────────

import { HAND_TYPES, HAND_TYPES_NOTE, SOURCE_META } from "../data/kaf-hands.data.js";
import {
  FINGERS, PHALANX_MEANING, FINGER_SET, THUMB, NAILS, HAND_TEXTURE,
} from "../data/kaf-fingers.data.js";
import { MOUNTS, PALM_SURFACE, MOUNTS_NOTE } from "../data/kaf-mounts.data.js";
import { LINES, GREAT_TRIANGLE, LINES_NOTE } from "../data/kaf-lines.data.js";
import {
  MARKS_GENERAL, GRILLE_ON_MOUNT, SECONDARY_LINES, MARKS_NOTE,
} from "../data/kaf-marks.data.js";

export const CONFIDENCE_FLOOR = 0.45; // دون هذا ⇒ «لم يتبيّنْ»

const lc = (v) => (v == null ? "" : String(v));
const seg = (title, body, src, cite) => ({ title, body, src: src || null, cite: cite || null });

/**
 * @param {object} f كائنُ الملامح (من طبقةِ الرؤية):
 *   f.hand "right"|"left" · f.handType مفتاحٌ من HAND_TYPES · f.texture "soft"|"firm"|"elastic"
 *   f.fingers.{index,middle,ring,little} = { state: "<نصُّ حالة مطابقٌ لِـ FINGERS[x].rules[].when>" }
 *   f.fingerSet = [ "leaningBack", "wideGaps", "knotty", ... ]  (مفاتيحُ FINGER_SET)
 *   f.thumb = { firstPhalanx:"large"|"small", secondPhalanx:"long"|"short",
 *               angle:"open"|"closed", ball:"full"|"flat", joint:"knotty"|null }
 *   f.nails = [ "short", "white", ... ]  (مفاتيحُ NAILS)
 *   f.mounts.{jupiter,...} = "full"|"excess"|"flat"
 *   f.palmSurface = مفتاحٌ من PALM_SURFACE
 *   f.lines.{life,head,heart,fate,sun,health} = { present:bool, confidence:0..1, states:[نصوصُ حالاتٍ من LINES[x].states] }
 *   f.marks = [ { type:"star"|"cross"|..., where:"mount:jupiter"|"line:life@0.6"|..., confidence:0..1 } ]
 *   f.secondary = { venusGirdle:bool, marriageCount:number, rascettes:number, quadrangle:"wide"|"narrow" }
 *   f.triangle = "wideClear"|"narrowCrooked"|null
 * @returns {{hand, sections, honesty, note, sources}}
 */
export function read(f = {}) {
  const S = [];
  const honesty = []; // ما لم يتبيّنْ
  const hand = f.hand === "left" ? "اليسرى (الفطرةُ والاستعداد)" : "اليمنى (المكتسَبُ الحاليّ)";

  // ── ١) نوعُ اليد ─────────────────────────────────────────────────
  const ht = HAND_TYPES[f.handType];
  if (ht) {
    S.push(seg(`نوعُ يدك: ${ht.ar}`, ht.traits, ht.src));
  } else {
    honesty.push("نوعُ اليدِ لم يتبيّنْ بوضوح (وضعيّةٌ أو إضاءة).");
  }
  if (f.texture && HAND_TEXTURE[f.texture]) {
    S.push(seg("ملمسُ اليد", HAND_TEXTURE[f.texture], "[ب] الفصل ٢، ص ٣٤"));
  }
  if (f.palmSurface && PALM_SURFACE[f.palmSurface]) {
    S.push(seg("راحةُ اليد", PALM_SURFACE[f.palmSurface], "[ب] الفصل ٥"));
  }

  // ── ٢) الأصابع ─────────────────────────────────────────────────
  const fingerLines = [];
  for (const key of ["index", "middle", "ring", "little"]) {
    const meta = FINGERS[key];
    const st = f.fingers?.[key]?.state;
    if (!meta) continue;
    if (!st) { honesty.push(`${meta.ar} لم تتبيّنْ حالتُها.`); continue; }
    // مطابقةٌ تامّةٌ فقط: مطابقةُ أوّلِ ستّةِ أحرفٍ كانت قد تربطُ الحالَ بقاعدةٍ أخرى («طويلةٌ…» بغيرِ ما قُصِد)
    const rule = meta.rules.find((r) => r.when === st);
    fingerLines.push(`<b>${meta.ar}</b> (${meta.planet}) — ${lc(st)}: ${rule ? rule.say : "—"}`);
  }
  if (fingerLines.length) S.push(seg("الأصابع", fingerLines.join("<br>"), FINGERS.index.src));

  // وضعُ الأصابعِ مجتمعةً
  const setLines = (f.fingerSet || []).map((k) => FINGER_SET[k]).filter(Boolean);
  if (setLines.length) S.push(seg("وضعُ الأصابعِ مجتمعةً", setLines.join("<br>"), "[ب] الفصل ٢، ص ٣٨"));

  // ── ٣) الإبهام ─────────────────────────────────────────────────
  const th = f.thumb || {};
  const thumbLines = [];
  if (th.firstPhalanx === "large") thumbLines.push("السلامى الأولى كبيرةٌ ⇒ إرادةٌ قويّةٌ وحزم.");
  else if (th.firstPhalanx === "small") thumbLines.push("السلامى الأولى صغيرةٌ ⇒ ضعفُ إرادةٍ وترددٌ واضطراب.");
  if (th.secondPhalanx === "long") thumbLines.push("السلامى الثانية طويلةٌ ⇒ منطقٌ ورويّةٌ وتفكيرٌ قبلَ الفعل.");
  else if (th.secondPhalanx === "short") thumbLines.push("السلامى الثانية قصيرةٌ ⇒ اندفاعٌ بلا تدبير.");
  if (th.joint === "knotty") thumbLines.push(THUMB.parts.joint);
  if (th.ball === "full") thumbLines.push(THUMB.parts.ball.split("؛")[0] + ".");
  else if (th.ball === "flat") thumbLines.push("كُرَةُ الإبهامِ مسطّحةٌ ⇒ بردُ العاطفةِ وقلّةُ الحيويّة.");
  if (th.angle === "open") thumbLines.push(THUMB.angle.open);
  else if (th.angle === "closed") thumbLines.push(THUMB.angle.closed);
  if (thumbLines.length) S.push(seg("الإبهام", thumbLines.join("<br>"), THUMB.src));
  else honesty.push("الإبهامُ لم تتبيّنْ تفاصيلُه.");

  // ── ٤) الأظافر ─────────────────────────────────────────────────
  const nailLines = (f.nails || []).map((k) => NAILS[k]).filter(Boolean);
  if (nailLines.length) S.push(seg("الأظافر", nailLines.join("<br>"), NAILS.src));

  // ── ٥) التلال السبعة ────────────────────────────────────────────
  const mountLines = [];
  for (const [k, m] of Object.entries(MOUNTS)) {
    const deg = f.mounts?.[k];
    if (!deg) continue;
    const txt = deg === "excess" ? m.excess : deg === "flat" ? m.flat : m.full;
    mountLines.push(`<b>${m.ar}</b> (${deg === "excess" ? "مفرطُ البروز" : deg === "flat" ? "مسطّح/غائر" : "مرتفعٌ ممتلئ"}) — ${txt}`);
  }
  if (mountLines.length) S.push(seg("التلال (المرتفعات)", mountLines.join("<br>"), "[ب] الفصل ٦"));
  else honesty.push("التلالُ لم تتبيّنْ درجاتُها (تحتاجُ إضاءةً جانبيّةً تُظهِرُ الارتفاعات).");

  // ── ٦) الخطوط ─────────────────────────────────────────────────
  for (const [k, L] of Object.entries(LINES)) {
    const ln = f.lines?.[k];
    if (!ln || !ln.present) { honesty.push(`${L.ar}: لم أتبيّنْه في الصورة.`); continue; }
    if ((ln.confidence ?? 1) < CONFIDENCE_FLOOR) {
      honesty.push(`${L.ar}: رأيتُه لكنْ لم يتّضحْ بثقةٍ كافيةٍ لقراءةِ حالتِه.`);
      continue;
    }
    const states = (ln.states || []).map((s) => `${s}: ${L.states[s] || "—"}`);
    S.push(seg(
      L.ar,
      `<span class="gloss">${L.means}</span><br>` + (states.length ? states.join("<br>") : "الخطُّ حاضرٌ معتدلٌ لا يحملُ علاماتٍ خاصّة."),
      L.src
    ));
  }
  if (f.triangle && GREAT_TRIANGLE[f.triangle]) {
    S.push(seg("المثلّثُ العظيم", GREAT_TRIANGLE[f.triangle], GREAT_TRIANGLE.src));
  }

  // ── ٧) العلامات ─────────────────────────────────────────────────
  const markLines = [];
  for (const mk of (f.marks || [])) {
    if ((mk.confidence ?? 1) < CONFIDENCE_FLOOR) continue;
    const gen = MARKS_GENERAL[mk.type];
    if (!gen) continue;
    let extra = "";
    const mMount = /^mount:(\w+)$/.exec(mk.where || "");
    if (mk.type === "grille" && mMount && GRILLE_ON_MOUNT[mMount[1]]) {
      extra = ` — على ${MOUNTS[mMount[1]]?.ar}: ${GRILLE_ON_MOUNT[mMount[1]]}`;
    } else if (mk.where) {
      extra = ` — الموضع: ${humanWhere(mk.where)}`;
    }
    markLines.push(gen + extra);
  }
  if (markLines.length) S.push(seg("العلاماتُ الصغرى", markLines.join("<br>"), "[ن] القسمُ الثاني · [ب] الفصل ٧"));

  // ── ٨) الخطوطُ الثانويّة ────────────────────────────────────────
  const sec = f.secondary || {};
  const secLines = [];
  if (sec.venusGirdle) secLines.push(`<b>${SECONDARY_LINES.venusGirdle.ar}:</b> ${SECONDARY_LINES.venusGirdle.means}`);
  if (sec.marriageCount != null) {
    secLines.push(`<b>${SECONDARY_LINES.marriage.ar}:</b> ${sec.marriageCount === 0 ? "لا تظهرُ خطوطٌ واضحة." : `عددُها ${toAr(sec.marriageCount)}. ` + SECONDARY_LINES.marriage.means}`);
  }
  if (sec.rascettes != null) secLines.push(`<b>${SECONDARY_LINES.rascettes.ar}:</b> عددُها ${toAr(sec.rascettes)}. ${SECONDARY_LINES.rascettes.means}`);
  if (sec.quadrangle) secLines.push(`<b>${SECONDARY_LINES.quadrangle.ar}:</b> ${sec.quadrangle === "wide" ? "واسعٌ منتظم — " : "ضيّقٌ مضغوط — "}${SECONDARY_LINES.quadrangle.means}`);
  if (secLines.length) S.push(seg("خطوطٌ ثانويّة", secLines.join("<br>"), "[ب] الفصول ١٥–١٨"));

  return {
    hand,
    phalanxKey: PHALANX_MEANING,
    sections: S,
    honesty,
    note:
      `${HAND_TYPES_NOTE}\n${MOUNTS_NOTE}\n${LINES_NOTE}\n${MARKS_NOTE}\n` +
      "هذه قراءةٌ حتميّةٌ: نفسُ الملامحِ المستخرَجةِ من الصورةِ ⇒ نفسُ النصِّ أبدًا، والنصُّ كلُّه من كتبِ علمِ الكفِّ لا من إنشاءٍ حرّ.",
    sources: [SOURCE_META.primary, SOURCE_META.broad, SOURCE_META.aux],
  };
}

function humanWhere(w) {
  const m = /^mount:(\w+)$/.exec(w);
  if (m) return MOUNTS[m[1]]?.ar || w;
  const l = /^line:(\w+)@([\d.]+)$/.exec(w);
  if (l) {
    const pos = +l[2];
    const era = pos < 0.33 ? "مطلعِ الحياة" : pos < 0.66 ? "منتصفِ العمر" : "المراحلِ المتأخّرة";
    return `${LINES[l[1]]?.ar || l[1]} — عند ${era}`;
  }
  return w;
}
function toAr(n) { const d = "٠١٢٣٤٥٦٧٨٩"; return String(n).replace(/[0-9]/g, (c) => d[+c]); }

/** فهرسُ الملامحِ المقبولةِ — لطبقةِ الرؤيةِ ولواجهةِ الإدخالِ اليدويّ. */
export function schema() {
  return {
    handTypes: Object.entries(HAND_TYPES).map(([k, v]) => ({ key: k, ar: v.ar })),
    textures: Object.entries(HAND_TEXTURE).map(([k, v]) => ({ key: k, ar: v.split("⇒")[0].trim() })),
    palmSurfaces: Object.entries(PALM_SURFACE).map(([k, v]) => ({ key: k, ar: v.split("⇒")[0].trim() })),
    fingers: Object.entries(FINGERS).map(([k, v]) => ({ key: k, ar: v.ar, planet: v.planet, states: v.rules.map((r) => r.when) })),
    fingerSet: Object.entries(FINGER_SET).map(([k, v]) => ({ key: k, ar: v.split("⇒")[0].trim() })),
    nails: Object.entries(NAILS).filter(([k]) => k !== "src").map(([k, v]) => ({ key: k, ar: v.split("⇒")[0].trim() })),
    mounts: Object.entries(MOUNTS).map(([k, v]) => ({ key: k, ar: v.ar, degrees: ["full", "flat", "excess"] })),
    lines: Object.entries(LINES).map(([k, v]) => ({ key: k, ar: v.ar, states: Object.keys(v.states) })),
    marks: Object.keys(MARKS_GENERAL),
  };
}

export const SOURCES = SOURCE_META;
export default { read, schema, SOURCES, CONFIDENCE_FLOOR };
