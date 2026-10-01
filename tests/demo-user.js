// تجربة كاملة على مدخلات حقيقية — تشغيل كل المحرّكات وطبع النتائج + الأثر.
//   node tests/demo-user.js
import abjad from "../engines/abjad.js";
import awfaq from "../engines/awfaq.js";
import falak from "../engines/falak.js";
import ak from "../engines/asma-khuddam.js";
import jafr from "../engines/jafr.js";
import zairja from "../engines/zairja.js";
import talisman from "../engines/talisman.js";
import prediction from "../engines/prediction.js";

const H = (s) => console.log("\n" + "═".repeat(64) + "\n  " + s + "\n" + "═".repeat(64));
const P = (...a) => console.log(...a);

// ── المدخلات ───────────────────────────────────────────────────────────
const NAME = "محمد";
const MOTHER = "سميرة";
// 9 نوفمبر 1991، الساعة 04:35 فجرًا، عمّان. توقيت الأردن القياسي في نوفمبر = UTC+2.
const BIRTH_LOCAL = "1991-11-09 04:35 (عمّان, UTC+2)";
const BIRTH_UTC = new Date("1991-11-09T02:35:00Z");
const LAT = 31.9539, LON = 35.9106;

H("المدخلات");
P("الاسم:", NAME, "| اسم الأم:", MOTHER);
P("الميلاد:", BIRTH_LOCAL, "→ UTC:", BIRTH_UTC.toISOString());
P("الموضع:", `عمّان  ${LAT}°N, ${LON}°E`);

// ── 1) حساب الجُمّل ────────────────────────────────────────────────────
H("1) محرّك حساب الجُمّل  (abjad.js)");
const vName = abjad.value(NAME, { perLetter: true });
const vMother = abjad.value(MOTHER, { perLetter: true });
P("«محمد» مُطبّعًا:", abjad.normalize(NAME), "| تفصيل:", vName.breakdown.map(b => `${b.ch}=${b.value}`).join(" "));
P("  الجُمّل الكبير =", vName.total, "| الصغير =", abjad.value(NAME, { saghir: true }).total);
P("«سميرة» مُطبّعًا:", abjad.normalize(MOTHER), "| تفصيل:", vMother.breakdown.map(b => `${b.ch}=${b.value}`).join(" "));
P("  الجُمّل الكبير =", vMother.total);
P("المجموع (الاسم + الأم) =", vName.total + vMother.total);
P("بَسط «محمد» =", abjad.bast(NAME).total, "| تكسير بسيط =", abjad.taksirBasit(NAME).total);
const anal = abjad.analyzeLetters(NAME);
P("طبائع حروف «محمد»:", JSON.stringify(anal.natureCount), "→ الغالب:", anal.dominantNature,
  "| كوكب الحروف الغالب:", anal.dominantPlanet);

// ── 2) الأوفاق ────────────────────────────────────────────────────────
H("2) محرّك الأوفاق  (awfaq.js)");
const total = vName.total + vMother.total;
for (const n of [3, 4, 5]) {
  const w = awfaq.wafqForTarget(n, total);
  const v = awfaq.verify(w.square);
  P(`وفق رتبة ${n} للمجموع ${total}: ${w.exact ? "مضبوط" : `مقرَّب إلى ${w.realized}`}`,
    `| تحقّق: ${v.ok ? "✔ كل الصفوف/الأعمدة/الأقطار =" : "�’"} ${v.magic}`);
}
const zuhal = awfaq.planetSquare("زحل");
P("\nوفق زحل (٣×٣، المجموع السحري 15):");
P(awfaq.toText(zuhal.square));

// ── 3) الفلك (لحظة الميلاد) ──────────────────────────────────────────
H("3) محرّك الفلك — لحظة الميلاد  (falak.js + astronomy-engine)");
const sky = falak.snapshot(BIRTH_UTC, LAT, LON);
P("رب اليوم:", sky.day.planet, `(${sky.day.weekday})`);
P("الطالع (البرج الصاعد):", sky.ascendant.sign, sky.ascendant.degreeInSign.toFixed(2) + "°");
P("منزلة القمر:", sky.moonMansion.number, sky.moonMansion.name, "— تُوافق:", sky.moonMansion.work);
const st = falak.sunTimes(BIRTH_UTC, LAT, LON);
P("شروق ذلك اليوم:", st.sunrise?.toISOString(), "| غروب:", st.sunset?.toISOString());
const ch = falak.currentHour(BIRTH_UTC, LAT, LON);
P("الساعة الكوكبية لحظة الميلاد: #" + ch.i, ch.phase, "— حاكمها:", ch.ruler);
P("\nمواقع الكواكب السبعة لحظة الميلاد:");
for (const [nm, p] of Object.entries(sky.planets)) {
  P(`  ${nm.padEnd(8)} ${p.sign.padEnd(7)} ${p.degreeInSign.toFixed(2).padStart(6)}°  ${p.retrograde ? "راجع" : ""}`);
}

// ── 4) الأسماء والخدّام ─────────────────────────────────────────────
H("4) محرّك الأسماء والخدّام  (asma-khuddam.js)");
const r = ak.reading(NAME, MOTHER);
P("العنصر:", r.element, "| الكوكب:", r.planet.name, `(${r.planet.disposition})`,
  "| البرج:", r.sign.name, "| المنزلة:", r.mansion.name);
P("الطبع الغالب من الحروف:", r.dominantLetterNature);
P("المَلَك الموكَّل بالكوكب:", r.servant.angelOfPlanet, "| روح الكوكب:", r.servant.spiritOfPlanet);
P("اسم الخادم المُستخرَج:", r.servant.derivedServantName);
P("اليوم والساعة المختارة:", r.timing.day, "— ساعة", r.timing.hourRuler);
P("البخور:", r.incenseNote);
P("\nأثر الاشتقاق خطوةً بخطوة:");
r.trace.forEach((s, i) => P(`  ${i + 1}. ${s}`));

// ── 5) الجفر ───────────────────────────────────────────────────────
H("5) محرّك الجفر  (jafr.js)");
const QUESTION = "هل أوفَّق في السنة القادمة";
const j = jafr.extractAnswer(QUESTION, { name: NAME, mother: MOTHER });
P("السؤال:", j.question);
P("المجموع الكلّي:", j.grandTotal);
P("حرف الجواب:", j.answerLetter, "| كلمة الجواب:", j.answerWord);
P("رقم البرج:", j.burjIndex, "| رقم الكوكب:", j.planetIndex, "| رقم العنصر:", j.elementIndex);
P("تكسير «محمد»:", jafr.taksir(NAME, 1).result, "| مثلّث «محمد» (إسقاط 9):", JSON.stringify(jafr.numberTriangle(NAME, 9).rows));
P("\nأثر الاستخراج:");
j.trace.forEach((s, i) => P(`  ${i + 1}. ${s}`));

// ── 6) الزايرجة ────────────────────────────────────────────────────
H("6) محرّك الزايرجة  (zairja.js)");
const z = zairja.operate(QUESTION, { ascendantDegree: sky.ascendant.longitude });
P("درجة الطالع المُدخَلة:", sky.ascendant.longitude.toFixed(2));
P("الجواب المستخرَج:", z.answer, "| قافية الوَتَر:", z.rhymeLetter);
P("ملاحظة:", z.note);
const z2 = zairja.operate(QUESTION, { ascendantDegree: sky.ascendant.longitude + 1 });
P(`اختبار الحساسية: درجة الطالع +1° ⇒ الجواب صار: «${z2.answer}»  (${z2.answer === z.answer ? "لم يتغيّر" : "تغيّر"})`);

// ── 7) الطلاسم ─────────────────────────────────────────────────────
H("7) محرّك الطلاسم  (talisman.js)");
const wOrder = [3, 4, 5, 6, 7, 8, 9].find(n => total % n === 0) || 4;
const nameW = awfaq.wafqForTarget(wOrder, total);
const svg1 = talisman.svgWafq(nameW.square);
const svg2 = talisman.svgSigil(nameW.square);
const svg3 = talisman.svgSevenSeals();
P(`وفق الاسم رتبة ${wOrder} (SVG): ${svg1.length} حرفًا، يبدأ بـ ${svg1.slice(0, 40)}…`);
P(`سيجيل الوفق (SVG): ${svg2.includes("<polyline") ? "فيه خطّ الوصل ✔" : "✗"}`);
P(`الأختام السبعة (SVG): ${svg3.includes("<polygon") ? "فيه النجمة الخماسية ✔" : "✗"}`);
P("(الأشكال تُحفَظ كملفات .svg أو تُعرَض في الواجهة)");
import { writeFileSync, mkdirSync } from "node:fs";
mkdirSync("tests/out", { recursive: true });
writeFileSync("tests/out/muhammad-wafq.svg", svg1);
writeFileSync("tests/out/muhammad-sigil.svg", svg2);
writeFileSync("tests/out/seven-seals.svg", svg3);
P("حُفظت: tests/out/muhammad-wafq.svg , muhammad-sigil.svg , seven-seals.svg");

// ── 8) المُركِّب (القراءة الكاملة) ────────────────────────────────
H("8) المُركِّب — القراءة الكاملة  (prediction.js)");
const full = prediction.reading({
  name: NAME, mother: MOTHER, question: QUESTION,
  when: BIRTH_UTC, lat: LAT, lon: LON
});
P("— الهويّة —");
P("  المجموع:", full.identity.total, "| العنصر:", full.identity.element,
  "| الكوكب:", full.identity.planet, "| البرج:", full.identity.sign);
P("  المنزلة:", full.identity.mansion.name, "| المَلَك:", full.identity.angel,
  "| الخادم:", full.identity.servantName);
P("— الفلك لحظة الميلاد —");
P("  رب اليوم:", full.sky.day.planet, "| الطالع:", full.sky.ascendant.sign,
  "| منزلة القمر:", full.sky.moonMansion.number, full.sky.moonMansion.name);
P("— التوقيت —");
P("  ", full.timing.todayVerdict, "| أفضل يوم:", full.timing.bestDay, "ساعة", full.timing.bestHourRuler);
P("— النبوءة —");
P("  الكوكب:", full.fortune.byPlanet);
P("  العنصر:", full.fortune.byElement);
P("  الحكم:", full.fortune.byDisposition);
P("  التوقيت:", full.fortune.timing);
P("  الأعمال الموافقة:", full.fortune.suitableWorks);
P("— جواب السؤال —");
P("  جفر: حرف", full.answer.jafr.answerLetter, "| كلمة", full.answer.jafr.answerWord,
  "| الميل:", full.answer.jafr.tenor);
P("  زايرجة:", full.answer.zairja.answer);
P("— الطلاسم —");
P("  وفق الاسم رتبة", full.talismans.nameWafqOrder, "| مضبوط:", full.talismans.nameWafqExact);

H("سرد الكشف الكامل (reveal) — ما الذي جرى فعليًا");
full.reveal.forEach((s) => P("  " + s));

H("تمّ. كل المحرّكات اشتغلت على مدخلاتك دون خطأ.");
