// engines/diagnosis.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك «تشخيص الحالة الروحانية»
//
// يحاكي بدقّةٍ ما يفعله الراقي/المشعوذ: تُعلِّم الأعراضَ التي تنطبق عليك، فيَخرج
// لك «تشخيصٌ» (عين/حسد/مسّ/سحر…) بنسبة، ثم «خطّة علاج».
//
// ومعه الكشف: أنّ قائمة الأعراض مصمَّمةٌ بحيث تسجّل علّةٌ ما نتيجةً عاليةً دائمًا
// (تأثير فورر)، وأنّ «التشخيص» دالّةٌ حتميّةٌ من المربّعات التي أشّرتها، وأنّ لكلّ
// عرضٍ تفسيرًا دنيويًّا. ومعه تنبيهٌ صحّيٌّ حقيقيّ.
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import talisman from "./talisman.js";
import awfaq from "./awfaq.js";
import {
  AFFLICTIONS, SYMPTOMS, REMEDIES, BARNUM, DISCLAIMER
} from "../data/diagnosis.data.js";

const SYM = new Map(SYMPTOMS.map((s) => [s.id, s]));

/** قائمة الأعراض للعرض في الواجهة. */
export function symptomList() {
  return SYMPTOMS.map((s) => ({ id: s.id, text: s.text }));
}

/** كم علّةً «يدلّ عليها» كلُّ عرضٍ وسطيًّا — مقياسُ فضفاضةِ القائمة. */
export function forerStats() {
  const perSym = SYMPTOMS.map((s) => s.indicates.length);
  const avg = perSym.reduce((a, b) => a + b, 0) / perSym.length;
  // أعلى نتيجةٍ ممكنةٍ إذا أشّر المستخدمُ كلَّ الأعراض
  const maxCount = {};
  for (const s of SYMPTOMS) for (const a of s.indicates) maxCount[a] = (maxCount[a] || 0) + 1;
  return { symptoms: SYMPTOMS.length, avgAfflictionsPerSymptom: +avg.toFixed(2), coverageIfAll: maxCount };
}

/**
 * @param {object} opt
 * @param {string[]} opt.symptoms  معرّفات الأعراض المؤشَّرة
 * @param {string} [opt.name]      لتوليد «حرز/وفق» شخصيّ
 * @param {string} [opt.mother]
 * @param {number} [opt.seed]      لاختيار جملة الافتتاح (وإلا حتميّة من الأعراض)
 */
export function assess(opt = {}) {
  const requested = opt.symptoms || [];
  const picked = requested.filter((id) => SYM.has(id));
  const unknownSymptoms = requested.filter((id) => !SYM.has(id));
  const chosen = picked.map((id) => SYM.get(id));

  // فرزٌ حتميّ: عدّ إشاراتِ كلِّ علّة
  const tally = {};
  for (const s of chosen) for (const a of s.indicates) tally[a] = (tally[a] || 0) + 1;
  const ranked = Object.entries(tally)
    .map(([a, n]) => ({ affliction: a, label: AFFLICTIONS[a]?.label || a, hits: n }))
    .sort((x, y) => y.hits - x.hits);

  const totalPicks = chosen.length || 1;
  const top = ranked[0] || null;
  // «نسبةٌ» عدديّةٌ زائفة (بارنوم): تُحفَظ للكشف ووجهًا لوجه، ولا تُقدَّم كيقين.
  const barnumPct = top ? Math.min(97, Math.round((top.hits / totalPicks) * 100) + 12) : 0;
  // وصفٌ لفظيٌّ صادقٌ لقوّةِ الدلالة (كم عرضًا يدعمُ العلّةَ الأعلى فعليًّا).
  const support = top
    ? (top.hits >= 3 ? "أعراضٌ متعدّدةٌ تشير إليها"
      : top.hits === 2 ? "عَرَضان يشيران إليها"
      : "عَرَضٌ واحدٌ فقط يشير إليها — لا يكفي للجزم")
    : "لم تُؤشَّرْ أعراضٌ كافية";

  const primary = top ? {
    ...top,
    blurb: AFFLICTIONS[top.affliction]?.blurb || "",
    support,                       // ← اللفظُ الصادق (يُعرَض في المتن)
    barnumPct,                     // ← النسبةُ الزائفة (للكشف فقط)
    remedy: REMEDIES[top.affliction] || null
  } : null;

  const secondary = ranked.slice(1, 3).map((r) => ({
    ...r, blurb: AFFLICTIONS[r.affliction]?.blurb || ""
  }));

  // «حرز» شخصيّ
  let charm = null;
  if (opt.name) {
    const total = abjad.jummal(opt.name) + (opt.mother ? abjad.jummal(opt.mother) : 0);
    const order = [3, 4, 5, 6, 7].find((n) => total % n === 0) || 4;
    const w = awfaq.wafqForTarget(order, total);
    charm = { total, order, svg: talisman.svgWafq(w.square), buduhSvg: talisman.svgBuduh() };
  }

  // جملة الافتتاح (حتميّة من الأعراض ما لم تُمرَّر بذرة)
  const seed = opt.seed ?? picked.join("").length;
  const opener = BARNUM[seed % BARNUM.length];

  // الكشف
  const reveal = [
    `أشّرتَ ${chosen.length} عرضًا.`,
    `كلُّ عرضٍ يدلّ على ${forerStats().avgAfflictionsPerSymptom} علّةٍ وسطيًّا ⇒ أيُّ اختيارٍ يرفع عدّة عللٍ معًا.`,
    `العدّ: ${ranked.map((r) => `${r.label}=${r.hits}`).join("، ") || "—"}`,
    top ? `الأعلى: «${top.label}» بـ${top.hits} من ${chosen.length} ⇒ «نسبة» ${barnumPct}% (صيغة: hits/الإجمالي +12، بحدٍّ أقصى 97). هذه النسبةُ زائفةٌ — عرضٌ واحدٌ يعطي ٩٧٪ أيضًا.` : "لا أعراض.",
    unknownSymptoms.length ? `أعراضٌ غيرُ معروفةٍ أُسقِطت: ${unknownSymptoms.join("، ")}.` : "",
    `جملة الافتتاح = BARNUM[${seed} % ${BARNUM.length}] — تنطبق على الجميع (تأثير فورر).`,
    "التفسيرات الدنيوية للأعراض التي أشّرتها:",
    ...chosen.map((s) => `• ${s.text} ← ${s.mundane}`),
    "لو أشّرتَ أعراضًا مختلفةً تمامًا لظهرت علّةٌ أخرى بنفس ‹الثقة›. التشخيصُ نتيجةُ مربّعاتٍ لا كشفٍ."
  ];

  return {
    opener,
    picked,
    unknownSymptoms,
    ranked,
    primary,
    secondary,
    charm,
    disclaimer: DISCLAIMER,
    reveal: reveal.filter(Boolean)
  };
}

export default { symptomList, forerStats, assess };
