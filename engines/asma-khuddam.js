// engines/asma-khuddam.js
// ─────────────────────────────────────────────────────────────────────────────
// محرّك الأسماء والخدّام
//
// المدخل: اسم الشخص + اسم أمّه (وهذا هو ما يطلبه الممارس دائمًا).
// المخرج: كل ما "يستخرجه" الممارس من الاسم — العنصر، الكوكب، البرج، المنزلة،
// الطبع الغالب، اسم الخادم/الملَك الموكَّل، اليوم والساعة المختارَة للعمل،
// البخور المناسب، ونوع الأعمال التي "تُوافق" هذا الاسم.
//
// كل قيمة مرفقة بخطوة اشتقاقها (trace) ليكشف زرّ "اكشف الطريقة" أنّ الأمر
// قسمةٌ على 4 و7 و12 و28 لا أكثر.
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import { PLANETS, SIGNS, MANSIONS, DAY_RULERS, DAY_NAMES, CHALDEAN } from "../data/falak.data.js";
import { JINN_RANKS, JINN_ORIGIN, JINN_RANKS_NOTE } from "../data/spirits.data.js";

// ترتيب العناصر على البواقي 1..4 (اصطلاح شائع في كتب الحروف؛ تختلف نسخ).
const ELEMENTS_BY_REM = { 1: "نار", 2: "هواء", 3: "ماء", 0: "تراب" };
// ترتيب الكواكب على البواقي 1..7 بادئًا بزحل (يوافق دور الحروف على الكواكب).
const PLANETS_BY_REM = { 1: "زحل", 2: "المشتري", 3: "المريخ", 4: "الشمس", 5: "الزهرة", 6: "عطارد", 0: "القمر" };

// لواحق التسمية الروحانية حسب العنصر (اصطلاح متداول في تصاريف الأسماء).
const SUFFIX_BY_ELEMENT = { نار: "يائيل", هواء: "طيطيل", ماء: "هيائيل", تراب: "ططغيل" };

function rem(value, mod) {
  const r = value % mod;
  return r === 0 ? mod : r;
}

/**
 * @param {string} name
 * @param {string} mother
 * @param {object} [opt]
 * @param {"kabir"|"mashriqi"|"maghribi"} [opt.method="kabir"]
 * @param {"add"|"sub"} [opt.combine="add"]  جمع الاسمين أو فرقهما
 */
export function reading(name, mother, opt = {}) {
  const method = opt.method || "kabir";
  const combine = opt.combine || "add";

  const rawName = String(name ?? "").trim();
  const rawMother = String(mother ?? "").trim();
  const nName = abjad.normalize(name);
  const nMother = abjad.normalize(mother);
  const vName = abjad.jummal(nName, method);
  const vMother = abjad.jummal(nMother, method);
  const total = combine === "sub" ? Math.abs(vName - vMother) : vName + vMother;

  const trace = [];
  trace.push(`جُمّل «${nName}» (${method}) = ${vName}`);
  trace.push(`جُمّل «${nMother}» = ${vMother}`);
  trace.push(`${combine === "sub" ? "الفرق" : "المجموع"} = ${total}`);

  // العنصر: total mod 4
  const eRem = total % 4;
  const element = ELEMENTS_BY_REM[eRem];
  trace.push(`${total} ÷ 4 ⇒ الباقي ${eRem} ⇒ العنصر: ${element}`);

  // الكوكب: total mod 7
  const pRem = total % 7;
  const planet = PLANETS_BY_REM[pRem];
  trace.push(`${total} ÷ 7 ⇒ الباقي ${pRem} ⇒ الكوكب: ${planet}`);

  // البرج: total mod 12
  const sRem = rem(total, 12);
  const sign = SIGNS[sRem - 1];
  trace.push(`${total} ÷ 12 ⇒ ${sRem} ⇒ البرج: ${sign.name}`);

  // المنزلة: total mod 28
  const mRem = rem(total, 28);
  const mansion = MANSIONS[mRem - 1];
  trace.push(`${total} ÷ 28 ⇒ ${mRem} ⇒ المنزلة: ${mansion.name}`);

  // الطبع الغالب من حروف الاسم نفسه
  const anal = abjad.analyzeLetters(nName);
  trace.push(
    `حروف «${nName}»: ${JSON.stringify(anal.natureCount)} ⇒ الغالب: ${anal.dominantNature}` +
      ` / كوكب الحروف الغالب: ${anal.dominantPlanet}`
  );

  // الخادم/الملَك: ملَك الكوكب (ثابت) + اسم "خادم" مُصرَّف من حروف الاسم + لاحقة العنصر
  const pInfo = PLANETS[planet];
  const nameRoot = [...nName].filter((c) => c !== " ").slice(0, 3).join("");
  const servantName = `${nameRoot}${SUFFIX_BY_ELEMENT[element] || "يائيل"}`;
  trace.push(
    `الخادم: جذر الاسم «${nameRoot}» + لاحقة عنصر ${element} «${SUFFIX_BY_ELEMENT[element]}» = ${servantName}`
  );

  // اليوم والساعة المختارة: يوم الكوكب، وأولى ساعاته (يُحسب موضعها فعليًا في محرّك الفلك)
  const chosenDay = pInfo?.day || DAY_NAMES[DAY_RULERS.indexOf(planet)];
  trace.push(`اليوم المختار: يوم ${planet} = ${chosenDay}؛ والساعة: ساعة ${planet} (من جدول الساعات الكوكبية)`);

  // نوع العمل الموافق: من عمل المنزلة + طبيعة الكوكب (سعد/نحس)
  const beneficLabel =
    pInfo?.benefic === true ? "سعيد" : pInfo?.benefic === false ? "نحس" : "متوسّط/متقلّب";

  return {
    input: { name: rawName || nName, mother: rawMother || nMother, normName: nName, normMother: nMother, method, combine },
    values: { name: vName, mother: vMother, total },
    element,
    planet: { name: planet, ...pInfo, disposition: beneficLabel },
    sign: sign,
    mansion: { number: mansion.n, name: mansion.name, nature: mansion.nature, work: mansion.work },
    dominantLetterNature: anal.dominantNature,
    dominantLetterPlanet: anal.dominantPlanet,
    servant: {
      angelOfPlanet: pInfo?.angel || null,
      spiritOfPlanet: pInfo?.spirit || null,
      derivedServantName: servantName
    },
    timing: { day: chosenDay, hourRuler: planet },
    incenseNote: pInfo?.incenseNote || null,
    suitableWorks: mansion.work,
    trace
  };
}

/**
 * توافق شخصين: نطبّق نفس المنطق على كلا الاسمين ثم نقيس "الاتفاق".
 * مقياس متداول: (جُمّل الأول + جُمّل الثاني) mod 12، ثم يُنظر في الباقي:
 *   عناصر متوافقة (نار/هواء، ماء/تراب) ⇒ محبّة، ومتضادّة ⇒ نفور — إلخ.
 */
export function compatibility(nameA, motherA, nameB, motherB, opt = {}) {
  const a = reading(nameA, motherA, opt);
  const b = reading(nameB, motherB, opt);
  const sum = a.values.total + b.values.total;
  const r12 = rem(sum, 12);
  const r4 = sum % 4;

  const friendly = { نار: "هواء", هواء: "نار", ماء: "تراب", تراب: "ماء" };
  const elementsHarmonize = friendly[a.element] === b.element || a.element === b.element;

  const verdicts = ["محبّة ومودّة", "خير وبركة", "كلام ووساطة", "نفور وخصام", "سفر وفراق", "زواج وعِشرة"];
  const verdict = verdicts[r12 % verdicts.length];

  return {
    a: { name: a.input.name, element: a.element, planet: a.planet.name, total: a.values.total },
    b: { name: b.input.name, element: b.element, planet: b.planet.name, total: b.values.total },
    sum,
    remainder12: r12,
    remainder4: r4,
    elementsHarmonize,
    verdict,
    trace: [
      `مجموع الجُمّلين = ${a.values.total} + ${b.values.total} = ${sum}`,
      `${sum} ÷ 12 ⇒ ${r12} ⇒ الحكم: ${verdict}`,
      `عنصر «${a.input.name}» ${a.element} و«${b.input.name}» ${b.element} ⇒ ${
        elementsHarmonize ? "متوافقان" : "متنافران"
      }`
    ]
  };
}

/** فهرسُ مراتب الجنّ الستّ [كتاب «العفاريت والجنّ» — الطوخي]. */
export function jinnTaxonomy() {
  return { ranks: JINN_RANKS.map((r) => ({ ...r })), origin: JINN_ORIGIN, note: JINN_RANKS_NOTE };
}

/**
 * «رتبةُ ما بالمريض» على طريقة الرقاة: تُشتَقُّ من جُمّل الاسم والأمّ إسقاطًا بستّة
 * ⇒ واحدةٌ من المراتب الستّ. تشخيصٌ ثابتٌ لكلّ من وقع اسمُه على ذلك الرقم — لا فحص.
 * @param {string} name @param {string} mother @param {object} [opt]
 */
export function spiritRank(name, mother, opt = {}) {
  const r = reading(name, mother, opt);
  const idx = (r.values.total % 6);
  const rank = JINN_RANKS[idx];
  return {
    name: r.input.name, mother: r.input.mother, total: r.values.total,
    rank: { ...rank },
    element: r.element, planet: r.planet.name,
    note: JINN_RANKS_NOTE,
    trace: [
      `جُمّل «${r.input.name}» + «${r.input.mother}» = ${r.values.total}`,
      `${r.values.total} ٪ ٦ = ${idx} ⇒ المرتبة «${rank.name}»: ${rank.def}`,
      "رقمٌ ⇒ «رتبةُ ما بك» — لا فحصَ ولا دليل؛ نفسُ الاسم يعطي نفسَ التشخيص أبدًا.",
    ],
  };
}

export default { reading, compatibility, jinnTaxonomy, spiritRank };
