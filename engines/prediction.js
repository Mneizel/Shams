// engines/prediction.js
// ─────────────────────────────────────────────────────────────────────────────
// المُركِّب — يجمع مخرجات كل المحرّكات في «قراءةٍ» واحدة كما يقدّمها الممارس:
// هويّة الاسم، التوقيت، الحال الفلكيّة، النبوءة، وجواب السؤال (جفر + زايرجة)،
// مع طلاسم الشخص. وكل ذلك مصحوبٌ بـ `reveal`: سردٌ لكل خطوةٍ حسابية وسببِ
// كونها اعتباطية (نفس المدخل ⇒ نفس المخرج دائمًا).
// ─────────────────────────────────────────────────────────────────────────────

import abjad from "./abjad.js";
import falak from "./falak.js";
import ak from "./asma-khuddam.js";
import jafr from "./jafr.js";
import zairja from "./zairja.js";
import talisman from "./talisman.js";
import awfaq from "./awfaq.js";
import {
  BY_PLANET, BY_ELEMENT, BY_DISPOSITION, TIMING_BY_SIGN, DAY_MATCH
} from "../data/phrases.data.js";

// توافق الكواكب (تصنيف مبسّط: نفس / موافق / مخالف)
const FRIEND = {
  زحل: ["المشتري", "عطارد"], المشتري: ["الشمس", "الزهرة", "القمر", "زحل"],
  المريخ: ["الزهرة"], الشمس: ["المشتري", "المريخ"], الزهرة: ["المشتري", "المريخ", "عطارد", "القمر"],
  عطارد: ["زحل", "الزهرة"], القمر: ["المشتري", "الزهرة"]
};
function planetMatch(a, b) {
  if (a === b) return "same";
  if ((FRIEND[a] || []).includes(b)) return "friendly";
  return "hostile";
}

/**
 * @param {object} q
 * @param {string} q.name           اسم الشخص
 * @param {string} q.mother         اسم أمّه
 * @param {string} [q.question]     سؤاله (اختياري)
 * @param {string} [q.watar]        بيت الزايرجة الحاكم (اختياري)
 * @param {Date|string} [q.when]     لحظةُ الميلاد (للهويّة والطالع الفطريّ)
 * @param {Date|string} [q.now]      لحظةُ الاستشارة (للسماء الحاليّة وحكمِ المسألة والتوقيت)
 * @param {number} [q.lat=21.4225]  خط العرض (مكّة افتراضيًا)
 * @param {number} [q.lon=39.8262]  خط الطول
 * @param {number} [q.wafqOrder]    رتبة وفق الاسم (افتراضيًا أصغر رتبةٍ تقسم الجُمّل، وإلا 4)
 */
export function reading(q) {
  const birth = q.when ? new Date(q.when) : new Date();
  const now = q.now ? new Date(q.now) : (q.when ? new Date(q.when) : new Date());
  const lat = q.lat ?? 21.4225;
  const lon = q.lon ?? 39.8262;
  const reveal = [];

  // ── 1. هويّة الاسم ──────────────────────────────────────────────────
  const id = ak.reading(q.name, q.mother);
  reveal.push("— اشتقاق هويّة الاسم —", ...id.trace);

  // ── 2أ. طالعُ المولد (لحظةُ الميلاد) ─────────────────────────────────
  const sky = falak.snapshot(birth, lat, lon);
  // ── 2ب. الحال الفلكيّة وقتَ الاستشارة (الآن) ─────────────────────────
  const skyNow = falak.snapshot(now, lat, lon);
  reveal.push(
    "— طالعُ المولد —",
    `ربُّ يومِ المولد: ${sky.day.planet} (${sky.day.weekday}) · الطالعُ الفطريّ: ${sky.ascendant.sign} ${sky.ascendant.degreeInSign.toFixed(1)}° · منزلةُ القمر: ${sky.moonMansion.number} ${sky.moonMansion.name}`,
    "— الحال الفلكيّة وقتَ الاستشارة —",
    `ربُّ اليوم: ${skyNow.day.planet} (${skyNow.day.weekday})`,
    `الساعةُ الكوكبيّةُ الجارية: #${skyNow.hour.i} ${skyNow.hour.phase}، حاكمها ${skyNow.hour.ruler}`,
    `الطالعُ الآن: ${skyNow.ascendant.sign} ${skyNow.ascendant.degreeInSign.toFixed(1)}°`,
    `منزلةُ القمرِ الآن: ${skyNow.moonMansion.number} ${skyNow.moonMansion.name} — تُوافق: ${skyNow.moonMansion.work}`
  );

  // ── 3. التوقيت المختار للشخص (يُقاس على يومِ الاستشارة) ─────────────
  const pv = id.planet.name;
  const dayM = planetMatch(pv, skyNow.day.planet);
  const hourM = planetMatch(pv, skyNow.hour.ruler);
  const timing = {
    personPlanet: pv,
    bestDay: id.timing.day,
    bestHourRuler: id.timing.hourRuler,
    todayVerdict: DAY_MATCH[dayM === "same" ? "same" : dayM === "friendly" ? "friendly" : "hostile"],
    currentHourFavourable: hourM !== "hostile"
  };
  reveal.push(
    "— التوقيت —",
    `كوكبُ الشخص ${pv}؛ حاكمُ يومِ الاستشارة ${skyNow.day.planet} ⇒ ${dayM}`,
    `حاكمُ الساعةِ الآن ${skyNow.hour.ruler} ⇒ ${hourM}`,
    `اليومُ المختارُ للأعمال: ${id.timing.day}، وساعة ${id.timing.hourRuler}`
  );

  // ── 4. النبوءة (فهرسة جداول ببواقٍ) ──────────────────────────────
  const total = id.values.total;
  const signIdx = ((total % 12) + 12) % 12; // 0..11
  const fortune = {
    byPlanet: BY_PLANET[pv],
    byElement: BY_ELEMENT[id.element],
    byDisposition: BY_DISPOSITION[id.planet.disposition] || BY_DISPOSITION["متوسّط/متقلّب"],
    timing: TIMING_BY_SIGN[signIdx],
    suitableWorks: id.mansion.work,
    luckyDay: id.timing.day,
    luckyHourRuler: id.timing.hourRuler
  };
  reveal.push(
    "— النبوءة: كيف فُهرِست —",
    `${total} ÷ 7 ⇒ ${total % 7} ⇒ عبارة الكوكب (${pv})`,
    `${total} ÷ 4 ⇒ ${total % 4} ⇒ عبارة العنصر (${id.element})`,
    `${total} ÷ 12 ⇒ ${signIdx || 12} ⇒ نافذة التوقيت: «${fortune.timing}»`,
    "كل عبارةٍ نصٌّ ثابتٌ في جدول؛ لا شيء هنا سوى قسمةٍ وانتقاء."
  );

  // ── 5. جواب السؤال (إن وُجد) — يُقاس على لحظةِ الاستشارة ─────────────
  let answer = null;
  if (q.question && q.question.trim()) {
    const j = jafr.extractAnswer(q.question, { name: q.name, mother: q.mother });
    const ascDeg = skyNow.ascendant.longitude;
    const topic = zairja.classifyTopic(q.question);
    const z = zairja.operate(q.question, { ascendantDegree: ascDeg, watar: q.watar, topic });

    // حكمُ المسألة الفلكيُّ (على طريقة الاختيارات) — طالعُ لحظةِ السؤال.
    const hor = falak.horary(q.question, now, lat, lon);
    const horSent = hor.score >= 0.6 ? 1 : hor.score <= -0.6 ? -1 : 0;

    // ميلُ كلِّ طريقةٍ: −١ نحس · ٠ مستور · +١ سعد — الجفرُ من حُكمِه الموحَّد.
    const jafrSent = j.verdict.direction === "نعم" ? 1 : j.verdict.direction === "لا" ? -1 : 0;
    const methods = [
      { name: "الجفر", sign: jafrSent, say: j.verdict.text },
      { name: "الزايرجة", sign: Math.sign(z.sentiment), say: z.answer },
      { name: "الفلك (أحكام المسائل)", sign: horSent, say: hor.verdict },
    ];
    const votes = methods.reduce((a, m) => a + m.sign, 0);
    const nonZero = methods.filter((m) => m.sign !== 0);
    const dirSign = Math.sign(votes) || (nonZero[0]?.sign ?? 0);
    const agreeCount = nonZero.filter((m) => m.sign === dirSign).length;
    const consensus = nonZero.length === 0 ? "مستورة"
      : agreeCount === nonZero.length ? "متوافقة"
      : agreeCount >= 2 ? "أغلبيّة"
      : "متعارضة";
    const direction = dirSign > 0 ? "نعم" : dirSign < 0 ? "لا" : "مستور";
    const confidence = Math.round(
      (nonZero.length ? (agreeCount / nonZero.length) : 0) *
      (55 + 12 * nonZero.length) // 3 طرق متوافقة ⇒ ~91٪
    );
    // سؤالٌ بصيغة «لماذا/كيف/متى/ماذا» ليس نعم/لا — فرضُ حكمٍ ثنائيٍّ عليه تدليسٌ.
    // في هذه الحالة العنوانُ الرئيسيّ هو جوابُ الجفر المصوغُ لشكل السؤال (سببٌ/توجيهٌ/توقيتٌ/وصف)،
    // واتّجاهُ الطرق الثلاث (إيجابي/سلبي/متوسط) يُذكَر كنسيجٍ داعمٍ لا كعنوان.
    const qForm = jafr.classifyQuestionForm(q.question);
    const leanWord = (s) => qForm === "yesno" ? (s > 0 ? "نعم" : s < 0 ? "لا" : "مستور") : (s > 0 ? "إيجابيّ" : s < 0 ? "سلبيّ" : "متوسّط");
    const agreementNote = consensus === "متوافقة" ? " (اتّفقتِ الطرقُ الثلاث)" : consensus === "أغلبيّة" ? " (بأغلبيّةِ الطرق)" : consensus === "متعارضة" ? " (على تعارُضٍ — رجّحتُ الأقرب)" : "";
    const verdict = qForm === "yesno" ? {
      direction, consensus, confidence, votes,
      text: consensus === "مستورة"
        ? "لم يترجّحْ جانبٌ — أعِدِ السؤالَ بنيّةٍ أصفى."
        : direction === "نعم"
        ? `الحكمُ: نعم — يتمُّ الأمرُ${agreementNote}، بعد سعيٍ وصبر.`
        : `الحكمُ: لا — الأولى التريّثُ أو تركُ الأمر${agreementNote}.`,
      dissent: consensus === "متعارضة" || consensus === "أغلبيّة"
        ? nonZero.filter((m) => m.sign !== dirSign).map((m) => m.name)
        : [],
    } : {
      direction: j.formed.label, consensus, confidence, votes,
      text: `${j.formed.text}\n\nالاتجاهُ العامُّ من الطرق الثلاث معًا: ${leanWord(dirSign)}${agreementNote}.`,
      dissent: consensus === "متعارضة" || consensus === "أغلبيّة"
        ? nonZero.filter((m) => m.sign !== dirSign).map((m) => m.name)
        : [],
    };

    answer = {
      question: j.question,
      topic, questionForm: qForm,
      verdict,                                  // ← الحكمُ الواحد
      timing: hor.timing?.text || (j.time?.text ?? null),  // توقيتٌ واحد (من الفلك أوّلًا)
      methods: methods.map((m) => ({ name: m.name, lean: leanWord(m.sign), say: m.say })),
      jafr: {
        answerLetter: j.answerLetter, bab: j.bab,
        verdict: j.verdict, yesNo: j.yesNo,
        letterClass: j.letterClass, consensusLetter: j.consensusLetter, consensusBab: j.consensusBab,
        planetAnswer: j.planetAnswer, elementAnswer: j.elementAnswer,
        time: j.time, letterChain: j.answerWord
      },
      zairja: { answer: z.answer, raw: z.answerRaw, rhymeLetter: z.rhymeLetter, sentiment: z.sentiment, topicNote: z.topicNote || null, note: z.note },
      falak: {
        verdict: hor.verdict, score: hor.score, sentiment: horSent,
        quesitedHouse: hor.quesited.house, quesitedLord: hor.quesited.lord,
        ascLord: hor.ascLord, perfection: hor.perfection, timing: hor.timing,
        moonVoid: hor.moon.voidOfCourse, factors: hor.factors
      }
    };
    reveal.push(
      "— جواب السؤال —",
      `موضوعُ السؤال (تصنيفٌ آليٌّ من كلماته): ${topic}`,
      ...j.trace.map((s) => "جفر: " + s),
      `جفر: الحكمُ الموحَّد = «${j.verdict.direction}» بثقة ${j.verdict.confidence}٪`,
      ...z.trace.map((s) => "زايرجة: " + s),
      `زايرجة: ميلُ الشطرِ المختار = ${z.sentiment}`,
      ...hor.trace.map((s) => "فلك: " + s),
      `فلك: نقاطُ الحكم = ${hor.score} ⇒ ميل ${horSent}`,
      `التوفيق: أصواتٌ [${methods.map((m) => `${m.name}:${m.sign}`).join("، ")}] ⇒ ${consensus} ⇒ «${direction}» بثقة ${confidence}٪.`,
      "لا رابطَ سببيًّا بين الطرق؛ التوافقُ (أو تعارُضُه) لا يزيدُ الأمرَ يقينًا — العدّةُ للنيّةِ والسياق."
    );
  }

  // ── 6. طلاسم الشخص ──────────────────────────────────────────────
  const wOrder = q.wafqOrder || [3, 4, 5, 6, 7, 8, 9].find((n) => total % n === 0) || 4;
  const nameWafq = awfaq.wafqForTarget(wOrder, total);
  const planetSq = awfaq.planetSquare(pv);
  const talismans = {
    nameWafqOrder: wOrder,
    nameWafqExact: nameWafq.exact,
    nameWafqSvg: talisman.svgWafq(nameWafq.square),
    nameSigilSvg: talisman.svgSigil(nameWafq.square),
    planetKameaSvg: talisman.svgWafq(planetSq.square),
    planetSigilSvg: talisman.svgSigil(planetSq.square),
    buduhSvg: talisman.svgBuduh(),
    letterRingSvg: talisman.svgLetterRing(abjad.normalize(q.name))
  };
  reveal.push(
    "— الطلاسم —",
    `وفق الاسم: رتبة ${wOrder}، مجموعه السحري ${nameWafq.realized}${nameWafq.exact ? "" : ` (قُرّب من ${nameWafq.requested})`}`,
    `كامية ${pv}: رتبة ${planetSq.order}، مجموعها ${planetSq.magic}`,
    "السيجيل: خطٌّ يصل الخانات على ترتيب أعدادها — لا رمز غيبيّ، بل مسارُ ترقيم."
  );

  return {
    input: { name: abjad.normalize(q.name), mother: abjad.normalize(q.mother),
             birth: birth.toISOString(), now: now.toISOString(), lat, lon },
    identity: {
      nameValue: id.values.name,
      motherValue: id.values.mother,
      total,
      element: id.element,
      planet: id.planet.name,
      planetDisposition: id.planet.disposition,
      sign: id.sign.name,
      mansion: id.mansion,
      dominantLetterNature: id.dominantLetterNature,
      angel: id.servant.angelOfPlanet,
      spirit: id.servant.spiritOfPlanet,
      servantName: id.servant.derivedServantName
    },
    sky,        // طالعُ المولد
    skyNow,     // السماءُ وقتَ الاستشارة
    timing,
    fortune,
    answer,
    talismans,
    reveal
  };
}

export default { reading };
