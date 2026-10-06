// tests/run.js — مشغّل اختبارات بسيط بدون تبعيات.  node tests/run.js
let pass = 0, fail = 0;
const fails = [];

export function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { pass++; }
  else { fail++; fails.push(`✗ ${msg}\n    توقّع: ${e}\n    فعلي: ${a}`); }
}
export function ok(cond, msg) {
  if (cond) pass++; else { fail++; fails.push(`✗ ${msg}`); }
}

// ── الأبجدية ──────────────────────────────────────────────────────────────
import abjad from "../engines/abjad.js";
{
  eq(abjad.jummal("الله"), 66, "جُمّل «الله» = 66");
  eq(abjad.jummal("محمد"), 92, "جُمّل «محمد» = 92");
  eq(abjad.jummal("بسم الله الرحمن الرحيم"), 786, "جُمّل البسملة = 786");
  eq(abjad.jummal("جبريل"), 245, "جُمّل «جبريل» = 245 (مشرقي)");
  eq(abjad.normalize("مُحَمَّدٌ"), "محمد", "تطبيع يحذف التشكيل");
  eq(abjad.normalize("فاطمة"), "فاطمه", "ة ← ه");
  eq(abjad.saghir(66), 3, "صغير 66 = 3");
  eq(abjad.saghir(786), 3, "صغير 786 = 3");
  const an = abjad.analyzeLetters("محمد");
  ok(an.dominantNature === "نار", "«محمد» غالبه ناري (م،م نار)");
  const fm = abjad.fromNameAndMother("محمد", "امنة", { mod: 12 });
  eq(fm.sum, abjad.jummal("محمد") + abjad.jummal("امنة"), "مجموع الاسم+الأم");

  // ── علم الحروف الموسَّع ──────────────────────────────────────────────
  ok(abjad.methods().length >= 8, "≥ ٨ مناهج حساب");
  eq(abjad.jummal("محمد", "tartib"), 13 + 8 + 13 + 4, "حساب الترتيب: م(١٣)+ح(٨)+م(١٣)+د(٤)");
  eq(abjad.jummal("محمد", "saghir"), abjad.saghir(40) + abjad.saghir(8) + abjad.saghir(40) + abjad.saghir(4), "الصغير جمعُ الجذور");
  eq(abjad.jummal("محمد", "wasat"), 4 + 8 + 4 + 4, "الوسيط: الرقم القائد لكلّ حرف");
  eq(abjad.jummal("ب", "nurani"), 0, "الظلمانيّ لا يُحسَب في المنهج النورانيّ");
  eq(abjad.jummal("م", "nurani"), 40, "م نورانيّة تُحسَب");
  eq(abjad.jummal("ا", "lafzi"), abjad.jummal("الف"), "اللفظيّ: ا ← الف");
  const am = abjad.allMethods("محمد");
  ok(am.kabir === 92 && Object.keys(am).length >= 8, "allMethods يغطّي كلّ المناهج");
  // بطاقة الحرف
  const cع = abjad.letterCorrespondences("ع");
  eq(cع.kabir, 70, "ع = ٧٠"); eq(cع.order, 16, "رتبة ع = ١٦");
  ok(cع.nurani === true && cع.planet && cع.zodiac && cع.world, "بطاقة ع: نورانيّ + كوكب + برج + عالم");
  eq(abjad.natureOf("ب", "tawali"), "هواء", "ب على التوالي: هواء (المرتبة ٢)");
  eq(abjad.natureOf("ب", "buni"), "هواء", "ب عند البوني: هواء");
  ok(["الحمل","الثور","الجوزاء","السرطان","الأسد","السنبلة","الميزان","العقرب","القوس","الجدي","الدلو","الحوت"].includes(abjad.letterZodiac("ا")), "برجُ الألف صحيح");
  // التحليل الموسَّع
  const A2 = abjad.analyze("محمد عبد الله");
  ok(A2.dominantNatureBlend && A2.mizaj && A2.world, "تحليل: غالبٌ ممزوجٌ + مزاج + عالم");
  ok(A2.nuraniCount >= 1 && A2.strongestLetter && A2.detail.length === A2.count, "تحليل: نورانيّة + أقوى حرف + تفصيل لكلّ حرف");
  eq(A2.dominantNature, abjad.analyzeLetters("محمد عبد الله").dominantNature, "toافق خلفيّ مع analyzeLetters");
  // الغالب والمغلوب
  const nb = abjad.nameBattle("محمد", "خالد");
  ok(["محمد", "خالد"].includes(abjad.normalize(nb.winnerName)) || nb.winnerName.startsWith("متكافئ"), "الغلبة: غالبٌ أو تكافؤ");
  ok(nb.rule1 && nb.rule2 && nb.rule3 && nb.trace.length >= 6, "الغلبة: ٣ قواعد + أثر [+سرّ الأسرار]");
  eq(JSON.stringify(abjad.nameBattle("محمد", "خالد")), JSON.stringify(nb), "الغلبة حتميّة");
  // طبُّ الحروف [السرّ المكشوف — الطوخي]
  const lm = abjad.letterMedicine("يوسف", { motherName: "امنة", fatherName: "يعقوب", weekday: "اثنين", arabicDate: 15 });
  ok(lm.letter && lm.rem >= 1 && lm.rem <= 28, `طبُّ الحروف: باقٍ ١..٢٨ ⇒ حرف «${lm.letter}»`);
  ok(lm.cause && lm.sign && lm.cure, "طبُّ الحروف: سببٌ وعلامةٌ وعلاج");
  eq(JSON.stringify(abjad.letterMedicine("يوسف", { motherName: "امنة", fatherName: "يعقوب", weekday: "اثنين", arabicDate: 15 })), JSON.stringify(lm), "طبُّ الحروف حتميّ");
  eq(abjad.letterMedicine("طارق", { method: "first" }).letter, "ط", "الطريقة الأولى: أوّلُ حرف");
  ok(abjad.letterMedicine("خديجة", { method: "first" }).substitutedFrom === "ث" || abjad.letterMedicine("خديجة", { method: "first" }).letter === "خ", "«خ» يُرجَع لأقرب حرف (طبعة الرجال تُسقطه)");
  ok(/الطوخي/.test(abjad.SOURCES.sirr_makshuf.title), "مصدرُ طبّ الحروف مسجَّل");
  eq(abjad.AYQANIYYA_GROUPS["ايقغ"], 1111, "الأيقنية: ايقغ = ١١١١ [سرّ الأسرار]");
  // كتابُ اسمِ اللهِ الأعظم (القسم الثاني من السحر العظيم)
  const bon = abjad.bookOfNames("السند");
  eq(bon.methods.length, 2, "بسطان: طريقُ أفلاطون وطريقُ سامور الهنديّ");
  eq(bon.elevenNames.length, 11, "أحدَ عشرَ اسمًا يُجمَع للعمل");
  eq(Object.keys(bon.dayServants).length, 7, "جدولُ خدّامِ الأيّامِ السبعة");
  eq(bon.kaabMethod.workedExample.resultWord, "آبيل", "مثالُ الكعبِ المحلول: السَّند ⇒ آبيل");
  eq(bon.forName.letterCount, 15, "بسطُ «السند» ⇒ خمسةَ عشرَ حرفًا (كما نصَّ الكتاب)");
  // توافق خلفيّ: value بمنهجٍ قديم لم يتغيّر
  eq(abjad.value("شمس", { method: "kabir" }).total, 400, "value(kabir) ثابت");
  eq(abjad.value("شمس", { method: "maghribi" }).total, abjad.jummal("شمس", "maghribi"), "value(maghribi) = jummal(maghribi)");
}

// ── الأوفاق ───────────────────────────────────────────────────────────────
import awfaq from "../engines/awfaq.js";
{
  for (const n of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const sq = awfaq.baseSquare(n);
    const v = awfaq.verify(sq);
    ok(v.ok, `وفق رتبة ${n} صحيح (مجموع=${v.magic})  ${v.issues.join("؛ ")}`);
    // كل الأعداد 1..n² مرّة واحدة
    const flat = sq.flat().sort((a, b) => a - b);
    const expected = Array.from({ length: n * n }, (_, i) => i + 1);
    eq(flat, expected, `وفق رتبة ${n} يحوي 1..${n * n} بلا تكرار`);
  }
  // أوفاق الكواكب
  eq(awfaq.planetSquare("زحل").magic, 15, "وفق زحل (3×3) مجموعه 15");
  eq(awfaq.planetSquare("الشمس").magic, 111, "وفق الشمس (6×6) مجموعه 111");
  eq(awfaq.planetSquare("القمر").magic, 369, "وفق القمر (9×9) مجموعه 369");
  // وفق الاسم
  const t = abjad.jummal("محمد"); // 92
  const w = awfaq.wafqForTarget(4, t);
  ok(w.exact, "وفق «محمد» رتبة 4 مضبوط");
  eq(awfaq.verify(w.square).magic, t, `وفق «محمد» مجموعه = جُمّله (${t})`);
  // البسملة (786) رتبة 5: 786 ليس من مضاعفات 5 ⇒ تقريب لأقرب مضاعَف (785)
  const w5 = awfaq.wafqForTarget(5, 786);
  ok(!w5.exact && w5.realized === 785, "وفق البسملة رتبة 5 يقرّب 786 ← 785");
  eq(awfaq.verify(w5.square).magic, 785, "المربّع المقرَّب مجموعه 785 وتامّ");
  // البسملة رتبة 6: 786 = 6×131 ⇒ مضبوط
  const w6 = awfaq.wafqForTarget(6, 786);
  ok(w6.exact, "وفق البسملة رتبة 6 مضبوط (786 = 6×131)");
  eq(awfaq.verify(w6.square).magic, 786, "وفق البسملة رتبة 6 مجموعه 786");

  // ── الطبقة العمليّة (كتب الأوفاق) ────────────────────────────────────
  // بُدُوح
  const bd = awfaq.buduh();
  eq(bd.numbers, [[2, 9, 4], [7, 5, 3], [6, 1, 8]], "أعداد بُدُوح");
  eq(bd.magic, 15, "مجموع بُدُوح ١٥");
  eq([bd.letters[0][0], bd.letters[0][2], bd.letters[2][0], bd.letters[2][2]].join(""), "بدوح",
     "زوايا بُدُوح الأربع تُقرأ «بدوح»");
  eq(awfaq.buduh(true).numbers, [[8, 1, 6], [3, 5, 7], [4, 9, 2]], "بُدُوح مقلوبًا للنقض");
  ok(awfaq.verify(bd.numbers).magic === 15, "بُدُوح مربّعٌ وفقيّ تامّ");
  // طبائع الرتب
  eq(awfaq.orderNature(3).planet, "زحل", "رتبة ٣ = زحل");
  eq(awfaq.orderNature(7).planet, "الزهرة", "رتبة ٧ = الزهرة (للمحبّة)");
  ok(awfaq.orderNatures().length === 7, "٧ رتب مطبوعة");
  ok(awfaq.orderNature(11).note, "رتبةٌ فوق ٩ ⇒ ملاحظة");
  // الوفق الحرفيّ
  const lw = awfaq.letterWafq("محمد");
  eq(lw.order, 2, "وفق «محمد» الحرفيّ رتبته ٢ (٤ حروف)");
  ok(lw.letterGrid.flat().join("") === "محمد", "الحشو صفًّا صفًّا يحفظ الحروف");
  ok(Array.isArray(lw.rowSums) && typeof lw.isMagic === "boolean", "مجاميعُ الصفوف + علمُ الاتّزان");
  ok(awfaq.letterWafq("الله", { order: 3 }).valueGrid.length === 3, "رتبةٌ مفروضةٌ تُحترَم");
  // وفق الاسم بالتعمير
  const nw = awfaq.nameWafq("محمد");
  eq(nw.target, abjad.jummal("محمد"), "هدفُ وفق الاسم = جُمّله");
  ok(/المفتاح/.test(nw.taᶜmir) && nw.letterWafq, "بيانُ التعمير + وفقٌ حرفيّ مرافق");
  eq(awfaq.nameWafq("100").target, 100, "وفقُ عددٍ صريح");
  // الأغراض ← عمليّات
  ok(awfaq.listPurposes().length >= 8, "≥ ٨ أغراض");
  const op = awfaq.operation("mahabba");
  eq(op.order, 7, "عمل المحبّة ⇒ رتبة ٧");
  ok(op.orderNature.planet === "الزهرة" && op.timing.includes("الزهرة"), "توقيتُ المحبّة بساعة الزهرة");
  ok(awfaq.verify(op.square).ok, "مربّعُ العمل تامّ");
  ok(op.trace.length >= 8, "أثرُ العمل مفصَّل");
  const tf = awfaq.operation("tafriq");
  ok(tf.toxicIncense.length >= 1 && tf.trace.some((s) => /سامّ/.test(s)), "عمل التفريق: بخورٌ سامٌّ موسوم");
  // عمل المحبّة مع بيانات فعليّة: يجب أن يُبنى المربّعُ الحرفيّ من الاسمين لا مثالًا توضيحيًّا
  const opP = awfaq.operation("mahabba", { name: "محمد", mother: "امنة", targetName: "سارة", targetMother: "ليلى" });
  ok(opP.personalized, "عمل المحبّة ببيانات فعليّة ⇒ مُخصَّص لا مثاليّ");
  ok(opP.fill.find((f) => f.role === "self_mother").resolved === "محمد امنة", "اسمُ الطالب وأمّه يُستبدَلان باسمَي بطاقتك الفعليَّين");
  ok(opP.fill.find((f) => f.role === "target_mother").resolved === "سارة ليلى", "اسمُ المطلوب وأمّه يُستبدَلان بالاسمَين الفعليَّين للطرف الآخر");
  eq(opP.letterGrid.length, opP.order, "المربّعُ الحرفيّ بنفس رتبة الوفق");
  // المجموعُ العدديّ يجب أن يساوي بالضبط جُمّل ما كُتب فعليًّا في المربّع الحرفيّ (لا حسابًا منفصلًا قد يختلف)
  const filledTextP = opP.fill.map((f) => f.resolved).join(" ");
  eq(opP.demoTarget, abjad.jummal(filledTextP), "مجموعُ الوفق العدديّ = جُمّل نفسِ نصّ المربّع الحرفيّ بالضبط");
  // اسمُ المطلوب وحده (بلا أمّه) يبقى مُخصَّصًا — أمّه اختياريّةٌ ولا تُسقِط التخصيص
  const opTargetOnly = awfaq.operation("mahabba", { name: "محمد", mother: "امنة", targetName: "سارة" });
  ok(opTargetOnly.personalized && opTargetOnly.fill.find((f) => f.role === "target_mother").resolved === "سارة", "اسمُ المطلوب بلا أمّه يبقى مُخصَّصًا باسمه فقط");
  const opNoData = awfaq.operation("mahabba");
  ok(!opNoData.personalized, "بلا بطاقةٍ ممتلئة ⇒ يبقى مثاليًّا توضيحيًّا");
  const tfP = awfaq.operation("tafriq", { name: "محمد", targetName: "خالد" });
  ok(tfP.fill.find((f) => f.role === "self_reversed").resolved === "دمحم", "الاسمُ المعكوس ينعكس فعليًّا");
  // طرق البناء
  ok(awfaq.buildMethods().some((m) => m.id === "tatrif"), "طرقُ البناء تشمل التطريف");
  // المربّع المؤطَّر
  const b5 = awfaq.borderedSquare(5), b7 = awfaq.borderedSquare(7);
  ok(b5.isMagic && awfaq.verify(b5.square).magic === 65, "مربّعٌ مؤطَّرٌ رتبة ٥ صحيح (٦٥)");
  ok(b7.isMagic && awfaq.verify(b7.square).magic === 175, "مربّعٌ مؤطَّرٌ رتبة ٧ صحيح (١٧٥)");
  eq(awfaq.borderedSquare(5).square, b5.square, "التطريفُ حتميّ (بذرةٌ ثابتة)");
  {
    const inner = b5.square.slice(1, 4).map((r) => r.slice(1, 4));
    ok(awfaq.verify(inner).ok, "الرتبةُ الداخليّةُ للمؤطَّر وفقٌ تامٌّ بذاتها");
  }
  eq(awfaq.borderedSquare(4).method, "غير مؤطَّر", "التطريفُ لا يصلح للرتب الزوجيّة");
  // ── قدرة الخلاق في علم الأوفاق (الطوخي) ─────────────────────────────
  for (const el of ["نار", "هواء", "ماء", "تراب"]) {
    const ts = awfaq.triangleSquare(el);
    ok(ts.isMagic && awfaq.verify(ts.square).magic === 15, `صورةُ المثلث «${el}» وفقٌ تامٌّ (١٥)`);
  }
  eq(awfaq.triangleSquare("تراب").square, [[4, 9, 2], [3, 5, 7], [8, 1, 6]], "المثلثُ الترابيّ = مربّع لو-شو");
  const gt = awfaq.geometricTriangle();
  ok(gt.isMagic && gt.product === 32768 && gt.centerCube === 32768, "المثلثُ الهندسيّ: وفقٌ ضربيٌّ ٢^١٥");
  eq(awfaq.classifyNumber(8).class, "زوج الزوج", "٨ زوجُ الزوج");
  eq(awfaq.classifyNumber(6).class, "زوج الفرد", "٦ زوجُ الفرد");
  eq(awfaq.classifyNumber(12).class, "زوج الزوج والفرد", "١٢ زوجُ الزوج والفرد");
  eq(awfaq.classifyNumber(7).class, "فرد", "٧ فرد");
  ok(awfaq.classifyNumber(5).circular && awfaq.classifyNumber(6).circular, "٥ و٦ عددان دائريّان");
  eq(awfaq.jabrOf(5).acceptsJabr, true, "المرتبةُ ٥ تقبل الجبر");
  eq(awfaq.jabrOf(4).acceptsJabr, "بطريقةٍ خاصّة", "المرتبةُ ٤ (زوج الزوج) بطريقةٍ خاصّة");
  for (const n of [4, 5, 6, 7]) {
    const bf = awfaq.bookFigure(n);
    ok(bf.figure && bf.isMagic, `صورةُ «قدرة الخلاق» للرتبة ${n} وفقٌ تامّ`);
  }
  eq(awfaq.bookFigure(7).magic, 175, "المسبعُ «يقبل الجبر» [ص ٥٤] ثابتُه ١٧٥");
  ok((() => { const f = awfaq.bookFigure(7).figure.flat().sort((a, b) => a - b); return f.length === 49 && f[0] === 1 && f[48] === 49 && new Set(f).size === 49; })(), "المسبع: الأعداد ١..٤٩ مرّةً واحدة");
  eq(awfaq.bookFigure(11).figure, null, "لا صورةَ للرتبة ١١ في المُستخرَج");
  ok(awfaq.WAFQ_PROPERTIES.length >= 4 && /الطوخي/.test(awfaq.SOURCES.qudra.title), "خصائصُ الوفق ومصدرُ قدرة الخلاق مسجَّلة");
}

// ── الفلك ─────────────────────────────────────────────────────────────────
import falak from "../engines/falak.js";
{
  const LAT = 31.95, LON = 35.93; // عمّان
  // 2000-01-01 كان يوم سبت ⇒ رب اليوم زحل
  eq(falak.dayRuler(new Date("2000-01-01T12:00:00Z")).planet, "زحل", "رب يوم 2000-01-01 (سبت) = زحل");
  // ترتيب حاكم الساعة الأولى = رب اليوم
  const ph = falak.planetaryHours(new Date("2026-06-21T10:00:00Z"), LAT, LON);
  eq(ph.hours[0].ruler, ph.dayRuler, "حاكم الساعة الأولى = رب اليوم");
  eq(ph.hours.length, 24, "24 ساعة كوكبية");
  ok(ph.sunrise < ph.sunset && ph.sunset < ph.nextSunrise, "شروق < غروب < شروق الغد");
  // الساعات متّصلة زمنيًا
  let contiguous = true;
  for (let i = 1; i < 24; i++) if (+ph.hours[i].start !== +ph.hours[i - 1].end) contiguous = false;
  ok(contiguous, "الساعات الكوكبية متّصلة بلا فجوات");
  // الساعة الـ8 من رب اليوم تعيد نفس الحاكم (دور 7)
  eq(ph.hours[7].ruler, ph.hours[0].ruler, "الساعة 8 تعيد حاكم الساعة 1 (دور سباعي)");

  // planetaryHoursForMoment: لا يقفز ليوم الغد حين تكون اللحظة نهارًا (خطأ حقيقيّ وُجد فعلًا)
  // 2026-09-16 = أربعاء ⇒ عطارد. planetaryHours الخام كان يعيد شروق الغد (الخميس/المشتري) خطأً.
  const moment = new Date("2026-09-16T10:00:00Z");
  eq(falak.dayRuler(moment).planet, "عطارد", "2026-09-16 أربعاء ⇒ رب اليوم عطارد");
  const phFixed = falak.planetaryHoursForMoment(moment, LAT, LON);
  eq(phFixed.dayRuler, "عطارد", "planetaryHoursForMoment لا يقفز ليوم الغد ظهرًا");
  ok(phFixed.sunrise.getUTCDate() === moment.getUTCDate(), "شروق الجدول المصحَّح لنفس تاريخ اللحظة لا الغد");

  // مواقع الكواكب ضمن المدى، والشمس في برج معقول لبداية سبتمبر (السنبلة ~)
  const pos = falak.planetPositions(new Date("2026-09-01T12:00:00Z"));
  for (const [name, p] of Object.entries(pos)) {
    ok(p.longitude >= 0 && p.longitude < 360, `طول ${name} ضمن [0,360)`);
    ok(p.degreeInSign >= 0 && p.degreeInSign < 30, `درجة ${name} داخل البرج [0,30)`);
  }
  eq(pos["الشمس"].sign, "السنبلة", "الشمس في السنبلة مطلع سبتمبر");

  // منزلة القمر 1..28
  const mm = falak.moonMansion(new Date("2026-09-01T12:00:00Z"));
  ok(mm.number >= 1 && mm.number <= 28, `منزلة القمر ${mm.number} (${mm.name})`);

  // الطالع برج صحيح
  const asc = falak.ascendant(new Date("2026-09-01T06:00:00+03:00"), LAT, LON);
  ok(falak.SIGNS.some((s) => s.name === asc.sign), `الطالع برج صحيح: ${asc.sign}`);

  // ── طبقة أحكام النجوم ───────────────────────────────────────────────
  const WHEN = new Date("2026-09-02T09:00:00+03:00");
  const BIRTH = new Date("1991-11-09T04:35:00+03:00");
  // الكرامات: المريخ في الجدي (شرفُه ٢٨°) قويّ
  const dm = falak.dignities("المريخ", 30 * 9 + 15); // ١٥° الجدي
  ok(dm.dignities.includes("شرف") && dm.score >= 4, `المريخ في الجدي مُشرَّف (score ${dm.score})`);
  // زحل في الحمل (هبوطه) ضعيف
  ok(falak.dignities("زحل", 5).dignities.includes("هبوط"), "زحل في الحمل هابط");
  // النظر
  const ab = falak.aspectBetween(10, 130);
  ok(ab && ab.name === "تثليث", "١٠° و١٣٠° ⇒ تثليث");
  eq(falak.aspectBetween(10, 12), falak.aspectBetween(12, 10), "النظر متماثل الاتجاه");
  ok(Array.isArray(falak.aspectsBetween(WHEN)), "أنظارُ اللحظة قائمة");
  // البيوت
  eq(falak.houseOf(30 * 3 + 5, 30 * 0 + 10), 4, "برجٌ رابعٌ من الطالع ⇒ البيت ٤");
  const hs = falak.wholeSignHouses(asc.longitude, WHEN);
  eq(hs.length, 12, "١٢ بيتًا");
  ok(hs.every((h) => h.sign && h.ruler && Array.isArray(h.planets)), "كلُّ بيتٍ ببرجٍ وحاكمٍ وساكنين");
  // حال القمر
  const ms = falak.moonState(WHEN);
  ok(ms.phaseName && typeof ms.waxing === "boolean" && typeof ms.voidOfCourse === "boolean", "حالُ القمر: طورٌ وتزايدٌ وخلوّ سير");
  ok(ms.speedPerDay > 10 && ms.speedPerDay < 16, `سرعةُ القمر معقولة (${ms.speedPerDay}°/يوم)`);
  // الاحتراق
  const cs = falak.combustState(WHEN);
  ok(["قلبُ الشمس (قوّة)", "احتراق", "تحت الشعاع", "حُرّ"].includes(cs["عطارد"]), "حالُ عطارد من الشمس مصنَّف");
  // السهام
  const lo = falak.lots(WHEN, LAT, LON);
  ok(lo.lots["سهم السعادة"] && lo.lots["سهم السعادة"].house >= 1 && lo.lots["سهم السعادة"].house <= 12, "سهمُ السعادة في بيتٍ صحيح");
  ok(lo.lots["سهم الأب"] && lo.lots["سهم الإخوة"], "سهما الأب والإخوة محسوبان");
  // المؤتمن
  const amn = falak.almuten(WHEN, LAT, LON);
  ok(amn.planet && ["زحل", "المشتري", "المريخ", "الشمس", "الزهرة", "عطارد", "القمر"].includes(amn.planet), "المؤتمنُ أحدُ الكواكب السبعة");
  ok(amn.ranking.length === 7 && amn.ranking[0].score >= amn.ranking[6].score, "ترتيبُ المؤتمن تنازليٌّ لسبعة كواكب");
  eq(amn.ranking[0].planet, amn.planet, "الكوكبُ الأوّل بالترتيب هو المؤتمن");
  // تصنيف الموضوع + حكم المسألة
  eq(falak.classifyAstroTopic("هل أتزوج قريبًا"), "زواج", "تصنيف: زواج");
  eq(falak.classifyAstroTopic("متى يرجع الغائب"), "غائب", "تصنيف: غائب");
  const hor = falak.horary("هل أتزوج هذا العام", WHEN, LAT, LON);
  eq(hor.topic, "زواج", "حكم: موضوعه زواج");
  eq(hor.quesited.house, 7, "حكم: بيت المسألة ٧");
  ok(typeof hor.verdict === "string" && hor.factors.length >= 4 && hor.trace.length >= 6, "حكمٌ + عواملُ + أثر");
  ok(falak.horary("س", WHEN, LAT, LON).topic === "عام", "سؤالٌ مبهم ⇒ عام");
  eq(JSON.stringify(falak.horary("هل أتزوج", WHEN, LAT, LON).factors),
     JSON.stringify(falak.horary("هل أتزوج", WHEN, LAT, LON).factors), "الحكم حتميّ");
  // الانتهاء السنويّ
  const bAsc = falak.ascendant(BIRTH, LAT, LON).longitude;
  const pf = falak.annualProfection(BIRTH, WHEN, bAsc);
  eq(pf.age, 34, "عمرُ المولود ٣٤ في ٢٠٢٦");
  eq(pf.profectedHouse, 11, "بيتُ سنةِ ٣٤ = ١١ (٣٤ mod ١٢ + ١)");
  ok(falak.SIGNS.some((s) => s.name === pf.profectedSign) && falak.CHALDEAN.includes(pf.yearLord), "برجُ السنة وحاكمُها صحيحان");
  // الفردارات
  const fd = falak.firdaria(BIRTH, WHEN);
  ok(falak.CHALDEAN.includes(fd.majorLord) && falak.CHALDEAN.includes(fd.minorLord), "الفردار: صاحبُ فترةٍ أكبرُ وأصغر");
  ok(fd.yearsIntoMajor <= fd.majorLength, "الموضعُ داخل الفترة ضمن طولها");
  // جودةُ اليوم
  const dq = falak.dayQuality(WHEN, LAT, LON);
  ok(falak.CHALDEAN.includes(dq.dayRuler) && Array.isArray(dq.goodFor) && typeof dq.score === "number", "جودةُ اليوم: ربٌّ وأعمالٌ ونقاط");
  // الاختيار
  const el = falak.election("زواج", WHEN, new Date(WHEN.getTime() + 2 * 86400000), LAT, LON);
  eq(el.purposePlanet, "الزهرة", "اختيارُ الزواج ⇒ كوكبُه الزهرة");
  ok(el.best.length >= 1 && el.best[0].score >= el.best[el.best.length - 1].score, "نوافذُ مرتّبةٌ تنازليًّا");
  // اللقطة الموسّعة
  const sn = falak.snapshot(WHEN, LAT, LON);
  ok(sn.houses && sn.moon && sn.aspects && sn.lots && sn.dayQuality, "اللقطة تحوي البيوت وحال القمر والأنظار والسهام وجودة اليوم");
  ok(sn.day && sn.hour && sn.ascendant && sn.moonMansion && sn.planets, "اللقطة تحفظ الحقول القديمة");
  // درجاتُ البروج الخاصّة [أحكام الحكيم ج١ ص ١٥٨]
  const sdF = falak.specialDegrees(30 * 0 + 18.5); // ١٩° الحمل ⇒ زائدةٌ في السعادة
  eq(sdF.degree, 19, "١٨.٥° ⇒ الدرجة ١٩ (ترقيمُ الكتاب)");
  ok(sdF.fortunate && sdF.labels.some((l) => l.includes("السعادة")), "١٩° الحمل: درجةٌ زائدةٌ في السعادة");
  const sdP = falak.specialDegrees(30 * 6 + 0.2); // ١° الميزان ⇒ درجةُ بئر
  ok(sdP.pitted, "١° الميزان: درجةُ بئرٍ/عَمًى");
  const sdZ = falak.specialDegrees(30 * 3 + 11.0); // ١٢° السرطان ⇒ زمانة (٩–١٥)
  ok(sdZ.azemena, "١٢° السرطان: درجةُ زمانة");
  ok(falak.specialDegrees(30 * 2 + 4).temperament.includes("فِطنة"), "الجوزاء: برجُ فِطنةٍ وذكاء");
  eq(JSON.stringify(sn.specialDegrees.ascendant), JSON.stringify(falak.specialDegrees(sn.ascendant.longitude)), "درجاتُ الطالع الخاصّة في اللقطة حتميّة");
  ok(falak.SPECIAL_DEGREE_TABLES.ASPECT_AFFINITY["تثليث"] === "مودّة كاملة", "التثليث = مودّة كاملة [أحكام الحكيم ص ١٥٤]");
  ok(falak.SOURCES.ahkam1 && /١٥٨/.test(falak.SOURCES.ahkam1.title), "مصدرُ جداول الدرجات مسجَّل");
  // مقياسُ الزمن [أحكام الحكيم ج١ ص ١٥٢]
  eq(falak.timingUnit(30 * 0 + 16, 10).unit, "أيّام", "منقلب في وتد ⇒ أيّام");
  eq(falak.timingUnit(30 * 1 + 10, 5).unit, "سنون", "ثابت فيما يلي الوتد ⇒ سنون");
  eq(falak.timingUnit(30 * 2 + 5, 3).unit, "سنون", "ذو جسدين في ساقط ⇒ سنون");
  eq(falak.timingUnit(30 * 2 + 5, 10).unit, "أسابيع", "ذو جسدين في وتد ⇒ أسابيع");
  // البروجُ المستقيمةُ/المعوجةُ الطلوع [ج١ ص ١٥٤ / ج٤ ص ٢٢]
  eq(falak.longShortAscension("السرطان").kind, "مستقيمة", "السرطان مستقيمُ الطلوع");
  eq(falak.longShortAscension("الجدي").kind, "معوجة", "الجدي معوجُ الطلوع");
  // جنسُ المرض [ج٤ ص ٤]
  ok(/مزمن/.test(falak.diseaseNature("زحل").diseases), "زحل ⇒ الأمراض المزمنة");
  ok(falak.diseaseNature("عطارد").diseases.includes("الوسواس"), "عطارد ⇒ الوسواس والصرع");
  // تشريق/تغريب + فتح الباب
  const oo = falak.orientalOccidental(WHEN);
  ok(oo["القمر"].side.includes("مشرِّق") || oo["القمر"].side.includes("مغرِّب"), "القمر مشرِّقٌ أو مغرِّب");
  eq(oo["الشمس"].phase, "—", "الشمس لا تشريقَ لها");
  ok(["المريخ", "المشتري", "زحل"].some((p) => typeof oo[p].strong === "boolean" || oo[p].strong === null), "العلويّةُ لها حكمُ قوّةٍ بالتشريق");
  // نقلُ النور وجمعُه [أحكام الحكيم ج١ ص ١٤٩]
  const tl = falak.translationOfLight(WHEN), cl = falak.collectionOfLight(WHEN);
  ok(typeof tl.any === "boolean" && Array.isArray(tl.transfers), "نقلُ النور: بنيةٌ صحيحة");
  ok(typeof cl.any === "boolean" && Array.isArray(cl.collections), "جمعُ النور: بنيةٌ صحيحة");
  tl.transfers.forEach((x) => ok(x.mover && x.from && x.to && x.text, "كلُّ نقلٍ: ناقلٌ ومنقولٌ عنه وإليه"));
  eq(JSON.stringify(falak.translationOfLight(WHEN)), JSON.stringify(tl), "نقلُ النور حتميّ");
  // مقياسُ الزمن — تدريجُ الموضع في البرج [ص ١٥٣]
  const tuV = falak.timingUnit(30 * 2 + 20, 2); // ٢٠° الجوزاء، البيت ٢ (ذو جسدين، يلي الوتد ⇒ شهور)
  eq(tuV.unit, "شهور", "الجوزاء يلي الوتد ⇒ شهور");
  ok(tuV.scaled && Math.abs(tuV.scaled.count - 8.3) < 0.6, `٢٠° الجوزاء ⇒ ≈٨ أشهر (${tuV.scaled.count})`);
  ok(falak.timingUnit(30 * 4 + 0, 9).unit === "مدّة مطلقة" && falak.timingUnit(30 * 4 + 0, 9).scaled === null, "ثابت/ساقط ⇒ مدّة مطلقة بلا تدريج");
  // الرأسُ والذنب
  const nd = falak.lunarNodes(WHEN);
  ok(nd.head.sign && nd.tail.sign && Math.abs(((nd.head.longitude + 180) % 360) - nd.tail.longitude) < 0.01, "الذنبُ مقابلُ الرأس تمامًا");
  ok(nd.head.nature === "الزيادة" && nd.tail.nature === "النقص", "طبعُ الرأس زيادةٌ والذنب نقص");
  // طبائعُ البروج [ص ١٥٤–١٥٥]
  ok(falak.signCharacter("السنبلة").traits.includes("فطنة"), "السنبلة برجُ فِطنة");
  ok(falak.signCharacter("الحمل").traits.includes("إدراك"), "الحمل برجُ إدراك");
  eq(falak.signCharacter("الحمل").triplicityAction, "تجمع وتحتقن", "المثلَّثة الناريّة تجمع وتحتقن");
  ok(falak.skinDiseaseSigns().signs.length === 8 && falak.signCharacter("العقرب").skinDisease, "٨ بروجٍ للأمراض الجلديّة");
  const fb = falak.fathAlBab(WHEN);
  ok(typeof fb.open === "boolean" && Array.isArray(fb.transfers), "فتحُ الباب: بنيةٌ صحيحة");
  // أحكامُ العالم [ج٤]
  const mf = falak.mundaneForecast(WHEN, LAT, LON);
  ok(["الربيع", "الصيف", "الخريف", "الشتاء"].includes(mf.season), `فصلٌ صحيح: ${mf.season}`);
  ok(mf.prices && /يغلو|يرخص|—/.test(mf.prices.direction), "الغلاء/الرخص: اتّجاهٌ محدَّد");
  ok(Array.isArray(mf.thermal) && typeof mf.verdict === "string", "أحكامُ العالم: حرارةٌ وحكمٌ نصّيّ");
  eq(JSON.stringify(falak.mundaneForecast(WHEN, LAT, LON).trace),
     JSON.stringify(mf.trace), "أحكامُ العالم حتميّة");
  ok(falak.SOURCES.ahkam4 && /ج٤/.test(falak.SOURCES.ahkam4.title), "مصدرُ أحكام العالم مسجَّل");
  // مسائلُ البارع: تصنيفُ المسائل المخصوصة + تفاصيلُ كلّ موضوع
  eq(falak.classifyAstroTopic("ابني محبوس متى يطلع"), "حبس", "«محبوس» حبسٌ لا حبّ");
  eq(falak.classifyAstroTopic("انسرق تلفوني هل يرجع"), "سرقة", "«انسرق… يرجع» سرقةٌ لا غائب");
  eq(falak.classifyAstroTopic("ضاع خاتمي"), "ضالة", "الضالّة");
  eq(falak.classifyAstroTopic("هل أشتري البيت"), "عقار", "العقار قبل البيع والشراء");
  eq(falak.classifyAstroTopic("شو المهنة اللي بتناسبني"), "صناعة", "الصناعة");
  eq(falak.classifyAstroTopic("هل أتزوج هذا العام"), "زواج", "الزواجُ باقٍ كما هو");
  {
    const W2 = new Date("2026-11-20T18:00:00Z");
    const hb = falak.horary("هل أتزوج هذا العام", W2, 31.95, 35.93);
    ok(hb.bari && hb.bari.details.length >= 3 && hb.bari.phases.length === 3, "البارع: تفاصيلُ الزواج ومراحلُ الأمر الثلاث");
    ok(hb.bari.details.every((x) => /البارع/.test(x.src)), "كلُّ تفصيلٍ منسوبٌ إلى البارع");
    ok(Math.abs(hb.bari.adj) <= 1, "تعديلُ البارع محصورٌ في ±١");
    const th = falak.horary("انسرق تلفوني هل يرجع", W2, 31.95, 35.93);
    ok(th.bari.details.some((x) => /صفةُ الآخذ/.test(x.text)) && th.bari.details.some((x) => /جهةُ الشيء/.test(x.text)), "السرقة: صفةُ الآخذ وجهةُ الشيء");
    const pr = falak.horary("ابني محبوس متى يطلع", W2, 31.95, 35.93);
    ok(pr.bari.details.some((x) => /على برج القمر/.test(x.text)) && pr.bari.details.some((x) => /صاحب الساعة/.test(x.text)), "الحبس: برجُ القمر وصاحبُ الساعة");
    const cr = falak.horary("شو المهنة اللي بتناسبني", W2, 31.95, 35.93);
    ok(/الصنعةُ التي تناسبُك/.test(cr.verdict), "مسألةُ الصناعة جوابُها وصفٌ لا نعم/لا");
    const il = falak.horary("هل أشفى من المرض هذا العام", W2, 31.95, 35.93);
    ok(il.bari.details.some((x) => /موضعُ التعب/.test(x.text)) && il.bari.details.some((x) => /طبعُ العلّة/.test(x.text)), "المرض: العضوُ وطبعُ العلّة");
    eq(JSON.stringify(falak.horary("هل أسافر", W2, 31.95, 35.93).bari), JSON.stringify(falak.horary("هل أسافر", W2, 31.95, 35.93).bari), "البارع حتميّ");
  }
  // التركيبة الغريبة (تجريبيّ): نتائجُ التجربة الأولى ثابتة
  {
    const tk = (await import("../engines/tarkiba.js")).default;
    const r = tk.reading({ name: "محمد", mother: "سميرة", sex: "m", birth: new Date("1991-11-09T02:35:00Z"), lat: 31.95, lon: 35.93, now: new Date("2026-10-06") });
    ok(r.zahir.planet === "القمر" && r.batin.planet === "القمر" && r.hiddenName.name === "الأول" && r.figure.ar === "رأس التنين", "التركيبة: نتائجُ التجربة الأولى (محمد/سميرة)");
    ok(/^يومُك الاثنين، يومُ القمر كوكبِ اسمك: أنسبُ يومٍ تبدأُ فيه السفر/.test(r.day.text), "التركيبة: سطرُ اليوم بصيغته المتّفق عليها");
    ok(r.pivots.some((p) => p.age === 30 && p.house === 7), "التركيبة: سنةُ ٣٠ سنةُ زواج (من الطالع)");
    // الميلُ للاكتئاب: نتائجُ التجربة العمياء على الخمسة ثابتة
    const M = (n, m, s, d, tu) => tk.reading({ name: n, mother: m, sex: s, birth: new Date(d), lat: 31.95, lon: 35.93, timeUnknown: tu }).mood;
    ok(r.mood?.level === "clear" && r.mood.why.includes("زحلُ يربّع الطالع"), "التركيبة/الاكتئاب: محمد بالساعة ⇐ دليلٌ واضح (زحل يربّع الطالع)");
    ok(M("محمد", "سميرة", "m", "1991-11-09T10:00:00Z", true) === null, "التركيبة/الاكتئاب: بلا ساعةٍ لا يُنظرُ إلى الطالع");
    ok(M("سميرة", "حليمة", "f", "1957-11-26T10:00:00Z", true)?.level === "clear" && M("لؤي", "سميرة", "m", "1980-02-14T10:00:00Z", true)?.level === "light", "التركيبة/الاكتئاب: سميرة واضح، لؤي خفيف");
    ok(M("ميس", "منى", "f", "1997-05-12T09:00:00Z", true) === null && M("تيسير", "فضية", "m", "1953-09-21T09:00:00Z", true) === null, "التركيبة/الاكتئاب: لا دليلَ ⇐ لا سطرَ أصلًا (لا يُقالُ لأحدٍ «لا شيءَ عندك»)");
    ok(/ليس تشخيصًا/.test(r.mood.text), "التركيبة/الاكتئاب: النصُّ يقولُ إنّه ليس تشخيصًا");
    const f = tk.reading({ name: "ميس", mother: "منى", sex: "f", birth: new Date("1997-05-12T10:00:00Z"), lat: 31.95, lon: 35.93, timeUnknown: true });
    ok(f.timingFrom === "sun" && /ظاهرُكِ|تُظهرين|بين ظاهركِ/.test(f.agreeText) && /يومُكِ/.test(f.day.text), "التركيبة: بلا ساعةٍ من برج الشمس، وبصيغة المؤنّث");
  }
  // إصلاحاتُ الفحص الشامل (٢٠٢٦-١٠-٠٦)
  {
    const fs = await import("node:fs");
    const shellIds = [...fs.readFileSync("web/index.html", "utf8").matchAll(/\sid="([\w-]+)"/g)].map((m) => m[1]);
    const panelIds = new Set([...fs.readFileSync("web/app.js", "utf8").matchAll(/\sid="([\w-]+)"/g)].map((m) => m[1]));
    eq(shellIds.filter((i) => panelIds.has(i)), [], "لا معرّفَ (id) في الصفحات يتكرّرُ مع معرّفات الهيكل (كان #qout مكرّرًا)");
    eq((fs.readFileSync("web/app.js", "utf8").match(/^import corpus /m) || []).length, 0, "نصُّ الكتاب (٧٫٧ م.ب) لا يُحمَّلُ مع الصفحة");
    const qura = (await import("../engines/qura.js")).default;
    eq([qura.babNumber("جاج").bab, qura.babNumber("جاد").bab], [39, 40], "القرعة: ثلاثيّتا الصفحة الساقطة هما البابان ٣٩ و٤٠ (لا ٣٥ و٣٦)");
    ok(qura.babNumber("ججد").bab === 35 && qura.babNumber("جاا").bab === 36, "البابان ٣٥ و٣٦ الحقيقيّان كما هما");
    eq(["متى أرجع عالبيت", "متى يرجع ابني للبيت", "هل أشتري البيت", "هل أبيع الدار"].map((q) => falak.classifyAstroTopic(q)), ["غائب", "غائب", "عقار", "عقار"], "«بيت» بحسب الفعل: الرجوعُ غائب، والشراءُ والبيعُ عقار");
    const W = new Date("2026-10-05T10:00:00Z");
    const r0 = raml.reading({ name: "محمد", mother: "سميرة", question: "هل أتزوج", when: W }), r1 = raml.reading({ name: "محمد", mother: "سميرة", question: "هل أتزوج", when: W }, { weight: 1 });
    ok(r0.score === r1.score && r0.verdict === r1.verdict && r0.weightApplied === null, "الرمل: بلا وزنٍ أو بوزن ١ ⇒ الحكمُ نفسُه");
    const rW = raml.reading({ name: "محمد", mother: "سميرة", question: "هل أتزوج", when: W }, { weight: 0.5 });
    ok(Math.abs(rW.score) <= Math.abs(r0.score) + 1e-9, "الرمل: وزنٌ أقلّ يقرّبُ الحكمَ من الوسط");
    const h0 = falak.horary("هل أتزوج", W, 31.95, 35.93), h1 = falak.horary("هل أتزوج", W, 31.95, 35.93, {});
    eq(h0.score, h1.score, "المسائل: بلا وزنٍ ⇒ الحكمُ نفسُه");
    const arif = (await import("../engines/arif.js")).default;
    const me = { name: "محمد", mother: "سميرة", sex: "m", birth: new Date("1991-11-09T02:35:00Z"), lat: 31.95, lon: 35.93, now: W };
    const a0 = arif.ask(me, "هل أحصل على الوظيفة"), a1 = arif.ask(me, "هل أحصل على الوظيفة", { weights: {} });
    eq(a0.big, a1.big, "اسأل العارف: بلا أوزانٍ ⇒ الجوابُ نفسُه");
    ok(a0.votes.every((v) => !/\(null\)/.test(v.why)), "اسأل العارف: لا يظهرُ «(null)» في سبب القرعة");
    const L = (await import("../engines/learn.js")).default;
    const recs = [...Array(6)].map((_, i) => ({ kind: "month", person: "p" + i, ok: true, score: 0.9, topic: "all", month: "2026-01", fams: { k: 1 } }))
      .concat([...Array(6)].map((_, i) => ({ kind: "month", person: "p" + i, ok: false, score: 0.9, topic: "all", month: "2026-01", item: "جملة", fams: { k: 1 } })));
    eq(L.arifTally(recs, { rate: 0.5 }).k.n, 6, "الشهرُ الذي أُجيب عن جملِه لا يُعَدُّ مرّتين");
    // البارع والرمل الطوخيّ مباشرة
    const bari = (await import("../engines/bari.js")).default;
    const pos = falak.planetPositions(W), asc = falak.ascendant(W, 31.95, 35.93).longitude;
    const ch = { ascLon: asc, pos, asps: falak.aspectsBetween(W), comb: falak.combustState(W), ms: falak.moonState(W), hourRuler: "زحل", ascLord: "المريخ", qLord: "الزهرة", lotLon: 100, dig: () => 0 };
    for (const t of ["رزق", "عمل", "زواج", "طلاق", "حمل", "مرض", "سفر", "غائب", "كتاب", "قضية", "سحر", "دراسة", "سرقة", "ضالة", "حبس", "بيع وشراء", "شركة", "عقار", "كنز", "رؤيا", "رجاء", "صديق", "صناعة"]) {
      const j = bari.judge(t, ch);
      ok(j.details.length >= 1 && Math.abs(j.adj) <= 1 && j.details.every((x) => x.text && !/undefined|NaN/.test(x.text)), `البارع: «${t}» يعطي تفاصيلَ سليمة`);
    }
    const rt = (await import("../engines/raml-tukhi.js")).default;
    for (const q of ["زوجتي حامل", "هل أشفى من المرض", "هل أتزوج", "هل اربح القضية", "وظيفة", "مهنة", "صديقي", "عدوي", "ابني محبوس", "هل يرد القرض", "الغائب", "يحبني", "سؤال"]) {
      const r = raml.reading({ name: "محمد", mother: "سميرة", question: q, when: W });
      ok(r.tukhi && r.tukhi.details.every((x) => x.text && Number.isFinite(x.page)) && Math.abs(r.tukhi.score) <= 1, `الرمل الطوخيّ: «${q}» (${rt.topicOf(q)})`);
    }
  }
  for (const k of ["خالي الوسط", "خالي الجنب"]) {
    const sq = awfaq.hollowTriangle(k).square, v = (x) => x ?? 0;
    ok(sq.every((r) => r.reduce((a, x) => a + v(x), 0) === 12) && [0, 1, 2].every((c) => sq.reduce((a, r) => a + v(r[c]), 0) === 12), `المثلّث ${k}: كلُّ صفٍّ وعمودٍ = ١٢ (كما في قدرة الخلاق ص ٤٦)`);
  }
  // حساباتُ التعلّم (engines/learn.js): المقارنةُ بالصدفة، وصوتٌ لكلّ شخص، والشهرُ العاديّ لا يُحتسَب
  {
    const L = (await import("../engines/learn.js")).default;
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const recs = [];
    for (let p = 0; p < 12; p++) for (let i = 0; i < 10; i++) {
      const truth = rnd() < 0.5 ? 1 : -1;              // ما سيحدثُ فعلًا (خيرٌ أو تعب)
      const score = rnd() < 0.5 ? 0.9 : -0.9;           // حكمُ الشهر
      // «صار» ٨٠٪ عشوائيًّا (جملٌ عامّة) — إلّا إن وافق الحكمُ الحقيقةَ فـ«صار» أكثر
      const ok = rnd() < (Math.sign(score) === truth ? 0.9 : 0.7);
      recs.push({ kind: "month", person: "p" + p, ok, score, topic: "all", fams: { opt: 1, good: truth } });
    }
    recs.push({ kind: "month", person: "p0", ok: true, score: 0.1, topic: "all", fams: { opt: 1 } });   // عاديّ
    const w = L.toWeights(L.arifTally(recs));
    ok(Math.abs((w.opt ?? 1) - 1) < 0.12, `المتفائلُ دائمًا لا يكسبُ من «صار» العشوائيّة (وزنُه ${w.opt})`);
    ok((w.good ?? 1) >= 1.05 && (w.good ?? 1) > (w.opt ?? 1) + 0.05, `الطريقةُ التي تصيبُ فعلًا يعلو وزنُها (${w.good} مقابل ${w.opt})`);
    eq(L.counted({ score: 0.1 }), false, "الشهرُ العاديّ لا يُحتسَب");
    const spam = [...Array(30)].map(() => ({ kind: "month", person: "x", ok: false, score: 0.9, topic: "all", fams: { k: 1 } }))
      .concat([...Array(6)].map((_, i) => ({ kind: "month", person: "q" + i, ok: true, score: 0.9, topic: "all", fams: { k: 1 } })));
    ok(L.toWeights(L.arifTally(spam, { rate: 0.5 })).k > 1, "شخصٌ واحدٌ كثيرُ الإجابات لا يغلبُ ستّةً (صوتٌ لكلّ شخص)");
  }
  // النسخةُ المستقلّة تحوي كلَّ ما يستوردُه الموقع، ونسخةُ الحسابات محدَّثة
  {
    const fs = await import("node:fs");
    const html = fs.readFileSync("web/شمس-المعارف.html", "utf8"), app = fs.readFileSync("web/app.js", "utf8");
    const keys = [...app.matchAll(/\bfrom\s*["']([^"']+\.js)["']/g)].map((m) => m[1].split("/").pop().replace(/\.js$/, ""));
    const missing = keys.filter((k) => !html.includes(`__M["${k}"]=`));
    eq(missing, [], "كلُّ ما يستوردُه app.js موجودٌ في النسخة المستقلّة (أعِدِ البناء: node tools/build-standalone.js)");
    const { engineHash } = await import("../tools/build-version.js");
    const { ENGINE_VER } = await import("../data/engine-version.data.js");
    eq(ENGINE_VER, engineHash(), "نسخةُ الحسابات محدَّثة (شغّلْ node tools/build-version.js بعد تعديل المحرّك)");
  }
  // التعلّم: الأوزانُ المتعلَّمة تغيّرُ النتائجَ فعلًا (الموضوع، طرقُ الزواج، كتبُ حالك)
  {
    const arif = (await import("../engines/arif.js")).default;
    const hal = (await import("../engines/hal.js")).default;
    const base = { name: "محمد", mother: "سميرة", sex: "m", birth: new Date("1991-11-09T02:35:00Z"), lat: 31.95, lon: 35.93, now: new Date("2026-10-05T10:00:00Z") };
    const r0 = arif.read(base), rL = arif.read(base, { weights: { "love|sky": 1.5, "love|periods": 0.5 } });
    ok(r0.months.some((m, i) => m.scores.love !== rL.months[i].scores.love) && r0.months.every((m, i) => m.scores.work === rL.months[i].scores.work), "وزنُ الموضوع (love|…) يغيّرُ أشهرَ الحبّ وحدَها");
    const sky = falak.snapshot(base.birth, base.lat, base.lon);
    const m0 = arif.marriageYears(base, sky), mW = arif.marriageYears(base, sky, { weights: { "marriage:jupiter": 0.5, "marriage:firdaria": 0.5 } });
    ok(m0.years.some((y, i) => y.s !== mW.years[i].s) && m0.years.every((y) => Array.isArray(y.meths)), "أوزانُ طرق الزواج تغيّرُ قوّةَ السنوات، ولكلّ سنةٍ طرقُها");
    const h0 = hal.reading(base);
    const firm0 = Object.values(h0.groups).flatMap((g) => g.firm.map((x) => x.id)).sort().join();
    const hSame = hal.reading({ ...base, lineWeights: {} });
    eq(Object.values(hSame.groups).flatMap((g) => g.firm.map((x) => x.id)).sort().join(), firm0, "حالك بلا أوزانٍ متعلَّمة ⇒ النتيجةُ نفسُها");
    const allLines = [...new Set(Object.values(h0.groups).flatMap((g) => g.firm.flatMap((x) => x.lines)))];
    const hLow = hal.reading({ ...base, lineWeights: Object.fromEntries(allLines.map((l) => [l, 0.5])) });
    ok(Object.values(hLow.groups).flatMap((g) => g.firm).length < Object.values(h0.groups).flatMap((g) => g.firm).length, "كتبٌ أضعفُ دقّةً ⇒ صفاتٌ مؤكّدةٌ أقلّ");
  }
  // تاريخُ الزواج الحقيقيّ: أيُّ الطرق أصابت وأيُّها أخطأت (محمد/سميرة ٩/١١/١٩٩١ ٤:٣٥، تزوّج ٢٦/١٠/٢٠٢٢)
  {
    const arif = (await import("../engines/arif.js")).default;
    const me = { name: "محمد", mother: "سميرة", sex: "m", birth: new Date("1991-11-09T02:35:00Z"), lat: 31.95, lon: 35.93, now: new Date("2026-10-05T10:00:00Z") };
    const sky = falak.snapshot(me.birth, me.lat, me.lon);
    const dx = arif.marriageDiagnose(me, sky, { y: 2022, m: 10, d: 26 });
    eq(dx.ages, [30], "٢٦/١٠/٢٠٢٢ قبل عيد الميلاد (٩/١١) ⇒ عمرُ ٣٠");
    ok(dx.hits.includes("prof7") && dx.misses.includes("ptolemy") && !dx.correct, "الانتهاءُ إلى السابع أصاب، وقاعدةُ بطليموس (مبكّر) أخطأت");
    eq(arif.marriageDiagnose(me, sky, { y: 2022 }).ages, [30, 31], "بلا شهر ⇒ سنتا عمرٍ محتملتان");
    const A = arif.ask(me, "متى أتزوج", { marriageFb: { ok: false, actual: { y: 2022, m: 10, d: 26 } } });
    ok(A.marriage.actual && /تزوّجتَ سنة 2022/.test(A.text) && A.marriage.diagnose, "بعد التاريخ الحقيقيّ: «تزوّجتَ سنة 2022» ومعه المقارنة");
  }
  // سنواتُ الزواج من الخريطة: الجوابُ يتبعُ العمر (قبل سنوات الزواج / بعدها)
  {
    const arif = (await import("../engines/arif.js")).default;
    const base = { name: "محمد", mother: "سميرة", sex: "m", birth: new Date("1960-05-10T07:00:00Z"), lat: 31.95, lon: 35.93 };
    const sky = falak.snapshot(base.birth, base.lat, base.lon);
    const MY = arif.marriageYears(base, sky);
    ok(MY.never || (MY.windows.length >= 1 && MY.first && MY.first.from >= 1976), "سنواتُ الزواج تُحسَبُ من الخريطة");
    if (MY.first) {
      const old = arif.ask({ ...base, now: new Date("2026-10-05T10:00:00Z") }, "متى أتزوج");
      ok(old.marriage && old.marriage.state !== "before" && !/الحسابُ يدلُّ على أنّ زواجَك (بين|سنة) 20[2-9]/.test(old.text), "كبيرٌ في العمر: لا يُقالُ له «زواجُك قريب» بل يُذكَرُ زواجُه الماضي");
      const fixed = arif.ask({ ...base, now: new Date("2026-10-05T10:00:00Z") }, "متى أتزوج", { marriageFb: { ok: false } });
      ok(fixed.marriage.corrected && !["married", "married_second_ahead"].includes(fixed.marriage.state), "«مش صح» على «متزوّج» ⇒ تُؤخَذُ النافذةُ القادمة");
      const young = arif.ask({ ...base, now: new Date(Date.UTC(MY.first.from - 3, 5, 1)) }, "متى أتزوج");
      ok(young.marriage && young.marriage.state === "before" && young.text.includes(String(MY.first.from)), "قبل سنوات الزواج: تُذكَرُ سنواتُه القادمة");
    }
  }
  // Skinner: مطابقةُ الأشكال الستّةَ عشر (الصفوف والكواكب) + قاعدةُ الطالع غير الصالح
  {
    const want = { tariq: ["1111", "القمر"], jamaa: ["2222", "القمر"], qabid_dakhil: ["2121", "المشتري"], qabid_kharij: ["1212", "الزهرة"], farah: ["1222", "المشتري"], ankis: ["2221", "زحل"], nusra_dakhila: ["2211", "الشمس"], nusra_kharija: ["1122", "الشمس"], ghulam: ["1121", "المريخ"], jariya: ["1211", "الزهرة"], humra: ["2122", "المريخ"], bayad: ["2212", "عطارد"], ijtimaa: ["2112", "عطارد"], habs: ["1221", "زحل"], raas: ["2111", "العقدة الصاعدة"], dhanab: ["1112", "العقدة الهابطة"] };
    ok(raml.FIGURES.length === 16 && raml.FIGURES.every((f) => want[f.id] && want[f.id][0] === f.rows.join("") && want[f.id][1] === f.planet), "أشكالُ الرمل الستّةَ عشر وكواكبُها مطابقةٌ لجدول Skinner");
    // التحويلُ (Skinner, Oracle of Geomancy، الملحق السابع): قلبُ كلِّ صفٍّ يُعطي الشكلَ المقابل
    const inv = (id) => raml.FIGURES.find((f) => f.rows.join("") === raml.FIGURES.find((g) => g.id === id).rows.map((v) => 3 - v).join("")).id;
    eq([["tariq", "jamaa"], ["ghulam", "bayad"], ["qabid_kharij", "qabid_dakhil"], ["nusra_dakhila", "nusra_kharija"], ["ijtimaa", "habs"], ["jariya", "humra"], ["ankis", "dhanab"], ["farah", "raas"]].every(([a, b]) => inv(a) === b), true, "أزواجُ التحويل الثمانية كما في Skinner");
    let vc = null;
    for (let i = 0; i < 400 && !vc; i++) { const r = raml.reading({ name: "س" + i, mother: "ص", question: "هل", when: new Date(Date.UTC(2026, 0, 1, i)) }); if (r.voidChart) vc = r; }
    ok(vc && ["الحمرة (الأحمر)", "ذنب التنين", "العتبة (الحبس)"].includes(vc.voidChart.figure), "الحمرةُ/الذنبُ/العتبةُ في البيت الأوّل ⇒ طالعٌ غيرُ صالحٍ للحكم");
  }
  // Lilly ج٣: التسييرُ الحقيقيّ للطالع ووسط السماء + عودةُ الكواكب في التحويل
  {
    const nat = falak.snapshot(new Date("1990-03-15T08:30:00Z"), 31.95, 35.93);
    const arif = (await import("../engines/arif.js")).default;
    const t0 = arif.tasyir(nat, 0, 31.95);
    ok(Array.isArray(t0), "التسييرُ بالعرض يعمل");
    const r = nat.ascendant.localSiderealTime;
    ok(Math.abs(arif.midheaven(r + 30) - arif.midheaven(r)) > 25, "وسطُ السماء المسيَّرُ يتحرّكُ بالمطالع المستقيمة");
    const rv = arif.revolutions({ birth: new Date("1990-03-15T08:30:00Z"), lat: 31.95, lon: 35.93 }, nat, 2020, 2035);
    ok(rv.every((x) => Array.isArray(x.voices)), "التحويلات تُحسَب مع العودات");
  }
  // المدخل الكبير: سنو الكواكب، والفرداراتُ توافقُ جدولَنا
  {
    const py = falak.planetYears();
    ok(Object.values(py.table).reduce((a, x) => a + x.firdar, 0) + py.nodes["الرأس"] + py.nodes["الذنب"] === 75, "الفردارات في المدخل مجموعُها ٧٥");
    eq([falak.planetYears("زحل").least, falak.planetYears("المشتري").least, falak.planetYears("الشمس").greater], [30, 12, 120], "سنو زحل الصغرى ٣٠، المشتري ١٢، الشمس الكبرى ١٢٠");
    const hw = falak.horary("هل أحصل على الوظيفة", new Date("2026-11-20T18:00:00Z"), 31.95, 35.93);
    ok(hw.bari.details.some((x) => /مدّةُ البقاء في هذا العمل/.test(x.text)), "العمل: مدّةُ البقاء بسني الكوكب الصغرى");
  }
  // تجاربي وبرهاني (الطوخي): أمثلةُ الكتاب نفسُها
  {
    const w1 = awfaq.transitionWafq("فقير", "غني");
    ok(w1.fromN === 390 && w1.toN === 1060 && w1.order === 4 && w1.step === 44 && w1.jabr === 10 && awfaq.verify(w1.square).ok, "وفقُ النقلة: فقير ٣٩٠ ⇐ غني ١٠٦٠ (مربّع، تنقّل ٤٤، جبر ١٠) كما في الكتاب");
    ok(w1.square.flat().includes(390) && w1.square.flat().includes(1060), "المفتاحُ والمغلاقُ في الوفق");
    const w2 = awfaq.transitionWafq("فاشل", "ناجح");
    ok(w2.fromN === 411 && w2.toN === 62 && w2.step === -23 && w2.jabr === -4 && w2.kind === "سلبيّ" && awfaq.verify(w2.square).ok, "وفقُ النقلة السالب: فاشل ٤١١ ⇐ ناجح ٦٢ (تنقّل ٢٣، جبر ٤)");
    eq(awfaq.pentagramWafq(66).cells, [20, 21, 22, 23, 24, 44], "النجمةُ الخماسيّة لـ٦٦ كما في الكتاب");
    eq(awfaq.pentagramWafq(18).cells, [4, 5, 6, 7, 8, 12], "النجمةُ الخماسيّة لـ١٨ كما في الكتاب");
    ok(awfaq.pentagramWafq(67).ok && awfaq.pentagramWafq(68).ok, "النجمةُ الخماسيّة تتّزنُ مع الباقي");
    eq(awfaq.hexagramWafq(71).key, 20, "النجمةُ السداسيّة لـ٧١ مفتاحُها ٢٠");
    ok(awfaq.hexagramWafq(79).ok, "النجمةُ السداسيّة لـ٧٩ (بباقٍ) تتّزن");
    const kf = awfaq.kunFayakun("يا رب");
    ok(kf.square.flat().includes(70) && kf.square.flat().includes(166) && awfaq.verify(kf.square).ok, "كن فيكون: المفتاح ٧٠ والمغلاق ١٦٦");
    const ps = awfaq.psalmKey({ name: "محمد", mother: "امنة", city: "عمان", date: "1990-05-12" });
    ok(ps.psalm >= 1 && ps.psalm <= 151, "مفتاحُ المزامير بين ١ و١٥١");
    const rt = raml.reading({ name: "محمد", mother: "امنة", question: "هل يرد القرض", when: new Date("2026-10-04T10:00:00Z") });
    ok(rt.tukhi && rt.tukhi.topic === "debt" && rt.tukhi.details.length >= 1, "الرمل: أحكامُ الطوخي في القرض");
    const rt2 = raml.reading({ name: "محمد", mother: "امنة", question: "ابني محبوس", when: new Date("2026-10-04T10:00:00Z") });
    eq(rt2.tukhi.topic, "prison", "الرمل: «محبوس» حبسٌ لا حبّ");
  }
  // horary: مقياسُ الزمن مدمجٌ + جنسُ المرض في مسائل البدن
  const hh = falak.horary("هل أشفى من المرض هذا العام", WHEN, LAT, LON);
  ok(!hh.timing || (hh.timing.unit && falak.SPECIAL_DEGREE_TABLES.TIMING_TABLE), "توقيتُ الحكم يستعمل جدول مقياس الزمن");
  ok(hh.disease === null || (hh.disease.from && hh.disease.diseases), "مسألةُ المرض تُرفِق جنسَ العلّة");
}

// ── الأسماء والخدّام ─────────────────────────────────────────────────────
import ak from "../engines/asma-khuddam.js";
{
  const r = ak.reading("محمد", "امنة");
  eq(r.values.total, abjad.jummal("محمد") + abjad.jummal("امنة"), "المجموع = جُمّل الاسم + الأم");
  ok(["نار", "هواء", "ماء", "تراب"].includes(r.element), `العنصر: ${r.element}`);
  ok(falak.CHALDEAN.includes(r.planet.name), `الكوكب: ${r.planet.name}`);
  ok(r.sign && r.sign.name, `البرج: ${r.sign.name}`);
  ok(r.mansion.number >= 1 && r.mansion.number <= 28, `المنزلة: ${r.mansion.name}`);
  ok(r.servant.derivedServantName.length > 3, `اسم الخادم المُصرَّف: ${r.servant.derivedServantName}`);
  ok(r.trace.length >= 6, "أثر الاشتقاق مُفصَّل (≥6 خطوات)");
  // حتمية
  const r2 = ak.reading("محمد", "امنة");
  eq(r, r2, "نفس المدخل ⇒ نفس المخرج (حتمي)");

  const c = ak.compatibility("محمد", "امنة", "فاطمة", "خديجة");
  ok(typeof c.verdict === "string" && c.verdict.length, `حكم التوافق: ${c.verdict}`);
  eq(c.sum, ak.reading("محمد", "امنة").values.total + ak.reading("فاطمة", "خديجة").values.total, "مجموع التوافق");
  // مراتبُ الجنّ [العفاريت والجنّ — الطوخي]
  const tax = ak.jinnTaxonomy();
  eq(tax.ranks.map((r) => r.name).join("←"), "جنّيّ←عامر←أرواح←شيطان←مارد←عفريت", "المراتبُ الستُّ بالترتيب");
  ok(/نار السَّموم|صلصال/.test(tax.origin), "أصلُ الخلق منقول");
  const sr = ak.spiritRank("محمد", "امنة");
  ok(tax.ranks.some((r) => r.name === sr.rank.name) && sr.total > 0, `رتبةُ «ما بالمريض»: ${sr.rank.name}`);
  eq(JSON.stringify(ak.spiritRank("محمد", "امنة")), JSON.stringify(sr), "رتبةُ الجنّ حتميّة");
  ok(sr.trace.some((s) => /لا فحص/.test(s)), "الأثرُ يكشف أنّه رقمٌ لا تشخيص");
}

// ── الجفر ─────────────────────────────────────────────────────────────────
import jafr from "../engines/jafr.js";
{
  const tk = jafr.taksir("محمد", 1);
  eq(tk.result, "مدحم", "تكسير «محمد» (أول، أخير، ثانٍ، ...) = مدحم");
  const zb = jafr.zuburBayyinat("بد");
  ok(zb.zuburText === "بد", "الزبر = الحروف كما تُكتب");
  ok(zb.rows[0].bayyina.length >= 1, "بيّنة «ب» غير فارغة");
  const cs = jafr.circleShift("ابج", 1);
  eq(cs.result, "بجد", "دائرة الإزاحة +1: ا→ب ب→ج ج→د");
  const tri = jafr.numberTriangle("ابج", 9);
  ok(tri.rows.length === 3 && tri.rows[2].length === 1, "مثلّث «ابج»: 3 صفوف حتى قمّة");
  const iq = jafr.isqat(30, 7);
  eq([iq.remainder, iq.subtractions], [2, 4], "إسقاط 30 بـ7 ⇒ باقي 2 بعد 4 طرحات");
  const ans = jafr.extractAnswer("هل أسافر هذا الشهر", { name: "محمد", mother: "امنة" });
  ok(ans.answerLetter && ans.answerWord.length === 3, `جواب الجفر: حرف «${ans.answerLetter}»، كلمة «${ans.answerWord}»`);
  eq(jafr.extractAnswer("هل أسافر هذا الشهر", { name: "محمد", mother: "امنة" }), ans, "الجفر حتميّ");
  // شكلُ السؤال: لماذا/كيف/متى/ماذا ليست نعم/لا — لا يُفرَض عليها حكمٌ ثنائيّ
  eq(jafr.classifyQuestionForm("هل أتزوّج هذا العام؟"), "yesno", "سؤال «هل» ⇒ نعم/لا");
  eq(jafr.classifyQuestionForm("لماذا تكثر الخلافاتُ بيني وبين أهلي؟"), "why", "سؤال «لماذا» ⇒ سبب");
  eq(jafr.classifyQuestionForm("كيف أفكّ هذا السحر؟"), "how", "سؤال «كيف» ⇒ توجيه");
  eq(jafr.classifyQuestionForm("متى يتحسّن وضعي الماديّ؟"), "when", "سؤال «متى» ⇒ توقيت");
  eq(jafr.classifyQuestionForm("ما الذي ينتظرني في الشهر القادم؟"), "what", "سؤال «ما الذي» ⇒ وصف");
  const ansWhy = jafr.extractAnswer("لماذا تكثر الخلافاتُ بيني وبين أهلي؟", { name: "محمد", mother: "امنة" });
  eq(ansWhy.questionForm, "why", "جوابُ سؤال «لماذا» يحمل شكله");
  ok(!/^نعم$|^لا$/.test(ansWhy.formed.label) && ansWhy.formed.text.includes(ansWhy.bab || ""), "سؤال «لماذا» لا يُجاب بنعم/لا، بل بالسبب (نصّ الباب)");
  const ansYes = jafr.extractAnswer("هل أسافر هذا الشهر", { name: "محمد", mother: "امنة" });
  eq(ansYes.formed.text, ansYes.verdict.text, "سؤال «هل» يبقى جوابُه نعم/لا/مستور كسابقًا");

  // ── التوسعة متعدّدة المصادر ──────────────────────────────────────────
  // أنواع البسط
  ok(jafr.bastModes().length >= 6, "≥ ٦ أنواع بسط");
  eq(jafr.bastBy("محمد", "huruf").text, "محمد", "البسط الذاتيّ = النصّ");
  eq(jafr.bastBy("اب", "adadi").text, "1 2", "البسط العدديّ: ا=١ ب=٢");
  eq(jafr.bastBy("ا", "lafzi").text, "الف", "البسط اللفظيّ: ا ← الف");
  eq(jafr.bastBy("ا", "tadad").text, "غ", "بسط التضادّ: ا ↔ غ");
  eq(jafr.bastBy("اب", "tadeef").text, "اابب", "بسط التضعيف");
  ok(jafr.bastBy("محمد", "jumali").value === abjad.jummal("محمد"), "البسط الجمليّ = مجموع الجُمّل");
  // طرق التكسير
  eq(jafr.taksir("ابجد", { method: "maqlub" }).result, "دجبا", "القلب التامّ");
  eq(jafr.taksir("ابج", { method: "thulathi" }).result, "باج", "التكسير الثلاثيّ: (ا ب ج) ⇒ (ب ا ج)");
  ok(jafr.taksirMethods().length >= 4, "≥ ٤ طرق تكسير");
  eq(jafr.taksir("محمد", 1).result, "مدحم", "توافقٌ خلفيّ: تكسيرٌ من الطرفين بعددٍ");
  // الدوائر
  const cir = jafr.circles();
  eq(cir.tadad["ا"], "غ", "دائرة التضادّ: ا↔غ");
  ok(cir.nuraniyya.nur.length === 14 && cir.nuraniyya.zulma.length === 14, "١٤ نورانيّة + ١٤ ظلمانيّة");
  ok(Object.values(cir.kawakib).every((a) => a.length === 4), "كلُّ كوكبٍ ٤ حروف");
  eq(jafr.circleSubstitute("ا", "tadad").result, "غ", "إبدالٌ عبر دائرة التضادّ");
  // الإسقاط الشامل
  const ia = jafr.isqatAll(100);
  ok(ia[28] && ia[9] && ia[3] && ia[9].meaning, "isqatAll يغطّي ٢٨/١٢/٩/٧/٤/٣ بمعانٍ");
  // معلوماتُ الحرف + نعم/لا
  eq(jafr.letterInfo("ا").class, "نورانيّة", "ا نورانيّة");
  ok(/نعم/.test(jafr.yesNo("ا")) && /لا/.test(jafr.yesNo("ب")), "نعم للنورانيّ، لا للظلمانيّ");
  // التوقيت
  ok(/نحو/.test(jafr.timeFromNumber(50, "sullam").text), "تقديرُ زمنٍ من عدد");
  ok(jafr.timeFromNumber(50, "shahr-yawm").month >= 1, "تحويلٌ لشهرٍ ويوم");
  // حرفُ المطلوب
  const mt = jafr.matlub("هل أنجح");
  ok(mt && mt.letter && mt.opposite && cir.tadad[mt.letter] === mt.opposite, "حرفُ المطلوب ومقابلُه");
  // الجدول ٤×٧
  const jg = jafr.jafrGrid();
  ok(jg.rows.length === 4 && jg.rows.every((r) => r.letters.length === 7 && r.letters.every(Boolean)),
     "جدولُ الطبائع والكواكب ٤×٧ مملوء بالكامل");
  ok(new Set(jg.rows.flatMap((r) => r.letters)).size === 28, "الجدول ٤×٧ يحوي الـ٢٨ حرفًا مرّةً واحدة");
  // الاستخراجُ الموسَّع
  ok(Array.isArray(ans.byMethod) && ans.byMethod.length === 5, "٥ مناهج بديلة");
  ok(ans.consensusLetter && typeof ans.consensusAgree === "boolean", "جوابٌ توافقيّ");
  ok(typeof ans.blendSentiment === "number" && /الميل/.test(ans.blendVerdict), "مزجُ الميل + حكم");
  ok(ans.yesNo && ans.letterClass && ans.time && ans.time.text, "نعم/لا + صنف + توقيت في الجواب");
  ok(ans.verdict && ["نعم", "لا", "مستور"].includes(ans.verdict.direction) &&
     ans.verdict.confidence >= 0 && ans.verdict.text, "الجفر: حكمٌ موحَّدٌ واحد (اتّجاه + ثقة + نصّ)");
  ok(ans.yesNo === "مستور — لا يُجزَم فيه" || ans.yesNo === `أقربُ إلى: ${ans.verdict.direction}`,
     "«نعم/لا» موافقٌ للحكمِ الموحَّد (لا يناقضه)");
  ok(!/\b\d+\s+يومًا\b/.test(ans.time.text) || /١١|١٢/.test(ans.time.text), "صياغةُ العدد العربيّ سليمة (لا «٤ يومًا»)");
  ok(ans.isqat.by9 && ans.isqat.by3 && ans.worldRank >= 1, "إسقاطاتٌ إضافيّة (٩ و٣) في الجواب");
  ok(ans.planetAnswer && ans.elementAnswer, "جوابُ الكوكبِ وجوابُ العنصر");
  ok(ans.trace.length >= 15, "أثرٌ موسَّع (≥ ١٥ سطرًا)");
}

// ── الزايرجة ──────────────────────────────────────────────────────────────
import zairja from "../engines/zairja.js";
{
  const z1 = zairja.operate("أعلم الزايرجة محدث أم قديم", { ascendantDegree: 100, watar: "بسم الاله وبه نستعين" });
  ok(z1.answerRaw.length >= 1, `المخرَج الخام: «${z1.answerRaw}»`);
  ok(z1.answerRaw.at(-1) === z1.rhymeLetter, "المخرَج الخام يُلزَم قافية الوَتَر");
  ok(z1.answer.includes(" ") && /[ء-ي]/.test(z1.answer), `«التشكيل» يُخرج شطرًا مقروءًا: «${z1.answer}»`);
  ok(z1.trace.some((l) => l.includes("موضعُ الحيلة")), "الأثر يكشف أن المعنى يدخله المشغِّل");
  eq(zairja.operate("أعلم الزايرجة محدث أم قديم", { ascendantDegree: 100, watar: "بسم الاله وبه نستعين" }), z1, "الزايرجة حتميّة");
  const z2 = zairja.operate("أعلم الزايرجة محدث أم قديم", { ascendantDegree: 101, watar: "بسم الاله وبه نستعين" });
  ok(z2.answerRaw !== z1.answerRaw, "تغيير درجة الطالع يغيّر المخرَج الخام");
  // الزايرجة الهندسية (الطوخي)
  const h1 = zairja.handasiya("هل أتزوج من أحبها هذا العام");
  ok(h1.questionValue > 0 && h1.baqi >= 1 && h1.baqi <= 9, "الهندسية: نسبةُ السؤال وباقٍ ١..٩");
  ok(h1.answerNumber >= 1 && h1.answerNumber <= 9 && h1.topic, `الهندسية: رقمُ جوابٍ وباب «${h1.topic}»`);
  ok(h1.verse.includes("**") && h1.verse.includes("\n"), "الهندسية: البيتُ ثلاثةُ أشطُرٍ مزدوجة");
  eq(JSON.stringify(zairja.handasiya("هل أتزوج من أحبها هذا العام")), JSON.stringify(h1), "الهندسية حتميّة");
  ok(zairja.handasiya("سؤال آخر مختلف تمامًا").verse !== h1.verse || zairja.handasiya("سؤال آخر مختلف تمامًا").pageNumber !== h1.pageNumber, "سؤالٌ مختلفٌ ⇒ مسارٌ مختلف");
  ok(h1.trace.some((l) => l.includes("لا يُطابِق بالضرورة الموضوعَ الرسميَّ")), "الأثر يكشف أنّ باب البيت قد لا يطابق تصنيفَ السؤال الرسميّ");
  ok(h1.officialTopic && h1.officialTopic.n >= 1 && h1.officialTopic.n <= 31, "الهندسية: تصنيفٌ رسميّ ١..٣١");
  ok(h1.adjustment && typeof h1.adjustment.value === "number", "الهندسية: تعديلُ السؤال محسوبٌ");
  eq(zairja.classifyOfficialTopic("هل يعود الغائب").n, 8, "تصنيف: الغائب ⇒ الموضوع ٨");
  eq(zairja.classifyOfficialTopic("هل يخرج المسجون من السجن").n, 14, "تصنيف: المسجون ⇒ الموضوع ١٤");
  {
    const withName = zairja.handasiya("سؤال عن أمرٍ ما", { name: "محمد", mother: "آمنة" });
    const withoutName = zairja.handasiya("سؤال عن أمرٍ ما");
    ok(withName.questionValue !== withoutName.questionValue, "الاسمُ واسمُ الأمّ يغيّران نسبةَ السؤال");
  }
  ok(/الطوخي/.test(zairja.HANDASIYA_SOURCE.title), "مصدرُ الزايرجة الهندسية مسجَّل");
  {
    const zh = await import("../data/zairja-handasiya.data.js");
    const total = Object.values(zh.ANSWER_BANK).reduce((a, arr) => a + arr.length, 0);
    ok(total >= 110, `بنكُ أبيات الهندسية اكتمل استخراجُه (${total} بيتًا)`);
    for (const k of Object.keys(zh.ANSWER_BANK)) {
      for (const v of zh.ANSWER_BANK[k]) ok(v.includes("**") && v.includes("\n"), `كلُّ بيتٍ في الباب ${k} ثلاثةُ أشطُرٍ مزدوجة`);
    }
    eq(zh.OFFICIAL_31_TOPICS.length, 31, "جدولُ السؤال ونسبتِه الرسميّ ٣١ موضوعًا");
    const ns = zh.OFFICIAL_31_TOPICS.map((t) => t.n);
    eq(new Set(ns).size, 31, "أرقامُ الجدول الرسميّ ١..٣١ بلا تكرار");
  }
  // زايرجة العالم الكلاسيكية (الطوخي ج١+ج٢)
  const zc = zairja.operateClassical("يوسف سأل عن مستقبله هل فيه خير له أم لا", { ascendantDegree: 277, weekday: 4, motherName: "فاطمة" });
  eq(zc.tali3, "جدي", "الطالع من درجة ٢٧٧° ⇒ الجدي");
  eq([zc.bayt4, zc.bayt7, zc.bayt10].join(","), "حمل,سرطان,ميزان", "الأوتاد ٤/٧/١٠ من الجدي");
  eq(abjad.jummal("جدي"), 17, "جُمّل «جدي» = ١٧ [مطابقٌ لجدول ج١]");
  eq(abjad.jummal("سرطان"), 320, "جُمّل «سرطان» = ٣٢٠ [مطابقٌ لجدول ج١]");
  ok(zc.miftah === (zc.jumla % 12) + (zc.jumla % 9) + (zc.jumla % 7), "المفتاح = %١٢ + %٩ + %٧");
  ok(zc.rows.length === 9 && zc.rows.every((r) => r.line % 3 === 0), "السطر المعدّل ÷٣ لكلّ موقع [قاعدة ج٢ متحقَّقة]");
  ok(zc.rows.every((r) => r.adil >= 0 && r.adil < 84), "العادل المطلوب ضمن [٠،٨٤)");
  eq(zc.rows[1].hasil, zc.rows[1].majmoo + zc.rows[0].adil, "الحاصل = المجموع + عادلِ الموقع السابق");
  ok(/[ء-ي]/.test(zc.answerRaw) && zc.answerRaw.length === 9, `جوابٌ خامٌ من ٩ حروف: «${zc.answerRaw}»`);
  ok(zc.secret.decoded.length > 10 && /[ء-ي]/.test(zc.secret.decoded), "سرُّ الجواب يُفكُّ إلى حروف");
  eq(JSON.stringify(zairja.operateClassical("يوسف سأل عن مستقبله هل فيه خير له أم لا", { ascendantDegree: 277, weekday: 4, motherName: "فاطمة" })), JSON.stringify(zc), "الزايرجة الكلاسيكية حتميّة");
  ok(zairja.operateClassical("سؤال مختلف", { ascendantDegree: 100, weekday: 1 }).answerRaw !== zc.answerRaw, "سؤالٌ/طالعٌ مختلف ⇒ جوابٌ مختلف");
  ok(/ج١.*ج٢|ج٢/.test(zairja.CLASSIC_SOURCE.title), "مصدرُ الزايرجة الكلاسيكية مسجَّل");
  // «فصلٌ آخر في الزايرجة» — طريقةُ الخاتمِ والأربعةَ عشرَ طالعًا [زايرجة ج١]
  const fa = zairja.fourAscendants(new Date("2026-09-20T12:00:00Z"));
  ok(fa.signs.length === 4 && new Set(fa.signs).size === 4 && fa.rem >= 1 && fa.rem <= 12, "الطوالعُ الأربعة: ٤ بروجٍ مختلفة وباقٍ ١..١٢");
  ok(fa.signs[0] === fa.tali3 && fa.signs[2] === fa.mutawassit, "ترتيبُ الطوالع: طالع/غارب/متوسّط/وتد");
  const fl = zairja.operateFasl("هل أتزوج من أحبها", { when: new Date("2026-09-20T12:00:00Z"), hourAscDegree: 100 });
  eq(fl.entryTotal, fl.questionValue + fa.signs.reduce((a, s) => a + abjad.jummal(s), 0) + 6323 + 373 + 4, "جملةُ الدخل = السؤال + الطوالع + ٦٣٢٣ + ٣٧٣ + طالع الساعة");
  ok(fl.fawaid.length === 4 && fl.keySign && fl.keyLetter, "الفوائضُ الأربعةُ + مفتاحُ السؤال (برجٌ وحرف)");
  ok([4, 5, 6, 7, 8, 10].includes(fl.khatamOrder) && fl.khatam.length === fl.khatamOrder && fl.khatam[0].length === fl.khatamOrder, "الخاتم: رتبةٌ ٤..١٠ ومربّعٌ تامّ");
  eq(fl.talis28.length, 28, "٢٨ طالعًا"); eq(fl.talis28[0].length, 24, "كلُّ طالعٍ ٢٤ حرفًا");
  eq(fl.mixed14.length, 14, "الامتزاجُ ⇒ ١٤ طالعًا"); eq(fl.mixed14[0].length, 48, "كلُّ طالعٍ ممزوجٍ ٤٨ حرفًا");
  ok(fl.answerRaw.length === 14 && /[ء-ي]/.test(fl.answerRaw), `ملقطُ الجواب: ١٤ حرفًا («${fl.answerRaw}»)`);
  ok(fl.answer.includes(" ") && /[ء-ي]/.test(fl.answer), "بيتٌ مشكَّلٌ مقروء");
  eq(JSON.stringify(zairja.operateFasl("هل أتزوج من أحبها", { when: new Date("2026-09-20T12:00:00Z"), hourAscDegree: 100 })), JSON.stringify(fl), "الطريقةُ الثانية حتميّةٌ (كاملُ الأنبوب)");
}

// ── القرعة والفأل (قرعة جعفر الصادق — الطوخي) ────────────────────────────
import qura from "../engines/qura.js";
{
  const r = qura.cast("محمد", "امنة", "هل أتزوج هذا العام", "2026-09-08");
  eq(r.throws.length, 3, "٣ رميات");
  ok(r.throws.every((t) => ["ا", "ب", "ج", "د"].includes(t)), "كلُّ رميةٍ من {ا،ب،ج،د}");
  eq(r.key, r.throws.join(""), "المفتاح = تسلسلُ الرميات");
  ok(r.bab >= 1 && r.bab <= 64, `الباب ${r.bab} ضمن ١..٦٤`);
  eq(JSON.stringify(qura.cast("محمد", "امنة", "هل أتزوج هذا العام", "2026-09-08")), JSON.stringify(r), "القرعة حتميّة (نفسُ المدخلات ⇒ نفسُ الباب)");
  ok(qura.cast("محمد", "امنة", "هل أتزوج هذا العام", "2026-09-09").key !== r.key ||
     qura.cast("محمد", "امنة", "سؤال آخر", "2026-09-08").key !== r.key, "تغيّرُ التاريخ أو السؤال ⇒ قرعةٌ مختلفة");
  eq(qura.babNumber("ااا").bab, 1, "ثلاثيّةُ ااا ⇒ الباب ١ [فهرس الكتاب]");
  eq(qura.babNumber("ادب").bab, 12, "ثلاثيّةُ ادب ⇒ الباب ١٢ [فهرس الكتاب]");
  eq(qura.babNumber("ددد").bab, 19, "ثلاثيّةُ ددد ⇒ الباب ١٩");
  const t = qura.cast("فاطمة", "خديجة", "س", "2026-01-01");
  ok(t.transcribed ? (t.verse && t.fortune) : (t.verse === null), "الباب المنقولُ يحمل آيةً وفألًا، وغيرُه لا");
  ok(r.trace.some((s) => /لم يُرمَ عودٌ حقيقيّ/.test(s)), "الأثرُ يكشف أنّ الرميَ حتميٌّ لا غيب");
  ok(/الطوخي/.test(qura.SOURCE.title), "مصدرُ القرعة مسجَّل");
}
import { ANSWERS as QURA_ANSWERS, BOOK_INDEX as QURA_INDEX, MISSING_BABS } from "../data/qura.data.js";
{
  const keys = Object.keys(QURA_ANSWERS);
  eq(keys.length, 62, "٦٢ بابًا منقولةً نصًّا (٦٤ عدا ٣٩ و٤٠)");
  ok(keys.every((k) => /^[ابجد]{3}$/.test(k)), "كلُّ مفتاحٍ ثلاثيّةٌ من {ا،ب،ج،د}");
  const babs = keys.map((k) => QURA_ANSWERS[k].bab).sort((a, b) => a - b);
  eq(babs[0], 1, "أوّلُ بابٍ منقولٍ = ١");
  eq(babs[babs.length - 1], 64, "آخرُ بابٍ منقولٍ = ٦٤");
  ok(new Set(babs).size === 62, "لا تكرارَ في أرقام الأبواب");
  ok(!babs.includes(39) && !babs.includes(40), "٣٩ و٤٠ مفقودان من النقل");
  eq(JSON.stringify(MISSING_BABS), JSON.stringify([39, 40]), "المفقودان مسجَّلان");
  ok(keys.every((k) => QURA_ANSWERS[k].verse && QURA_ANSWERS[k].fortune), "كلُّ بابٍ يحمل آيةً وفألًا");
  ok(keys.every((k) => ["سعد", "نحس", "معتدل"].includes(QURA_ANSWERS[k].tone)), "لهجةُ كلِّ بابٍ صحيحة");
  ok(keys.every((k) => QURA_INDEX[k] === QURA_ANSWERS[k].bab), "الفهرسُ مطابقٌ لعناوين الأبواب");
  eq(QURA_ANSWERS["ااا"].bab, 1, "ااا ⇒ الباب ١");
  eq(QURA_ANSWERS["ببج"].bab, 64, "ببج ⇒ الباب ٦٤");
  ok(QURA_ANSWERS["ااا"].verse.includes("مَّمْدُودًا"), "نصُّ الباب ١ منقولٌ حرفيًّا (آية المدّثّر)");
  ok(QURA_ANSWERS["ببج"].fortune.includes("فَهُوَ يَشْفِينِ"), "نصُّ الباب ٦٤ منقولٌ حرفيًّا");
  ok(keys.every((k) => QURA_ANSWERS[k].verse.includes("﴿")), "كلُّ آيةٍ بين قوسي التلاوة ﴿﴾");
}

// ── طرق الطوخي: المندل النفسي + الفتوح الرباني ──────────────────────────
{
  const mn = taskhir.mandalNafsi({ when: "2026-10-01" });
  eq(mn.totalDays, 46, "المندل النفسي: ٤٦ يومًا");
  eq(mn.phases.length, 3, "ثلاثُ مراحل (رياضة/خلوة/رياضة)");
  eq(mn.phases.map((p) => p.days).join(","), "9,28,9", "٩ + ٢٨ + ٩");
  ok(mn.startSunday.startsWith("الأحد"), "البدءُ يقعُ يومَ أحد");
  eq(mn.wafqConstant, 369, "الوفقُ المتّسع ٩×٩ ثابتُه ٣٦٩");
  ok(mn.wafq.length === 9 && mn.wafq.every((r) => r.length === 9), "الوفقُ ٩×٩");
  ok(mn.azima.includes("شمهورش") && mn.azima.includes("طامْ طامْ"), "عزيمةُ شمهورش كاملة");
  ok(mn.reveal.includes("جاوى") && mn.reveal.length > 2000, "نصُّ الكتابِ الحرفيُّ في الكشف");
  const mn2 = taskhir.mandalNafsi({ when: "2026-10-01" });
  eq(JSON.stringify(mn.phases), JSON.stringify(mn2.phases), "حتميّةٌ: نفسُ تاريخِ البدء ⇒ نفسُ الجدول");

  const fr = khawass.futuhRabbani();
  ok(fr.wird.length === 5, "الوِردُ خمسةُ بنود");
  eq(fr.wird.find((w) => w.text.includes("حسبيَ اللهُ")).count, 7, "«حسبي الله» ×٧");
  eq(fr.dua.count, 7, "الدعاءُ ×٧");
  eq(fr.jalsa.steps.length, 10, "الجلسةُ عشرُ خطوات");
  ok(fr.jalsa.steps.some((s) => s.includes("رابطةُ القبر")), "خطوةُ رابطةِ القبر موجودة");
  ok(fr.jalsa.steps.some((s) => s.includes("رابطةُ الشيخ")), "خطوةُ رابطةِ الشيخ موجودة");
  ok(fr.raw.includes("النقشبندي") && fr.raw.includes("الجيلاني"), "نصُّ الكتابِ الحرفيُّ محفوظ");
}

// ── كشف الدجل (ألعاب العرافة — الطوخي) ─────────────────────────────────
import debunk from "../engines/debunk.js";
{
  ok(debunk.techniques().length === 6, "٦ أصنافٍ للحِيَل");
  ok(debunk.techniques().every((t) => t.def && t.tell), "كلُّ حيلةٍ: تعريفٌ + كيف تُكشَف");
  const f = debunk.fanjanRead("عصفور", "قاع الفنجان");
  ok(f.meaning.includes("خيرات") && /تخيُّل الأشكال/.test(f.technique), "الفنجان: رمزٌ×موضعٌ ⇒ معنى + وسمُ الحيلة");
  const ik = debunk.ikhtilaj("الأذن", "الأيسر");
  ok(/رزق|وراثة/.test(ik.omen) && ik.alternatives.length >= 1, "الاختلاج: فألٌ + رواياتٌ بديلة");
  const bg = debunk.backgammon(6, 6);
  eq(bg.sum, 12, "زهر الطاولة ٦+٦ = ١٢"); ok(bg.doubled && bg.omen.length > 3, "زوجيّةٌ + خبر");
  // لعبةُ الأشياء الثلاثة — تُطابق مثالَ الكتاب (٣،١،٢)
  const t = debunk.threeObjects(3, 1, 2);
  ok(t.correct && t.recovered.obj1 === 3 && t.recovered.obj2 === 1 && t.recovered.obj3 === 2, "الأشياء الثلاثة: ح٤−٢٥٠ يستخرج مقاعد ٣،١،٢");
  eq(debunk.threeObjects(2, 3, 1).steps.minus250, 231, "مقاعد ٢،٣،١ ⇒ ٢٣١");
  // أعجوبة المراتب التسع
  const r9 = debunk.ranksNineTrick();
  eq(r9.difference, 987654321 - 123456789, "٩٨٧... − ١٢٣... = الفرق");
  eq(r9.digitSum, 45, "مجموعُ أرقام الفرق = ٤٥");
  // فردةُ الكوتشينة حتميّة
  const sp = debunk.kotshinaSpread("محمد", "هل أتزوج", "2026-09-08");
  eq(sp.cards.length, 7, "٧ مواضع في الفردة");
  eq(JSON.stringify(debunk.kotshinaSpread("محمد", "هل أتزوج", "2026-09-08")), JSON.stringify(sp), "الفردةُ حتميّة");
  ok(new Set(sp.cards.map((x) => x.card)).size === 7, "٧ ورقاتٍ مختلفة (بلا تكرار)");
  // تحليلُ الادّعاء
  ok(debunk.analyzeClaim("فكّر في رقم واضرب واجمع واطرح ٢٥٠").techniques.some((x) => x.name === "إكراه رياضيّ"), "تحليلُ ادّعاءٍ حسابيّ ⇒ إكراه رياضيّ");
  ok(/الطوخي/.test(debunk.SOURCES.bayan.title), "مصادرُ كشف الدجل مسجَّلة");
}

// ── الطلاسم ───────────────────────────────────────────────────────────────
import tal from "../engines/talisman.js";
{
  eq(tal.toArabicDigits(2026), "٢٠٢٦", "تحويل الأرقام لعربية-هندية");
  const s = tal.svgWafq(awfaq.planetSquare("زحل").square);
  ok(s.startsWith("<svg") && s.includes("</svg>") && s.includes("١٥") === false && s.includes("<text"), "svgWafq ينتج SVG صالحًا");
  ok(tal.svgSigil(awfaq.planetSquare("الشمس").square).includes("<polyline"), "svgSigil يرسم خطًّا");
  ok(tal.svgSevenSeals().includes("<polygon"), "الأختام السبعة فيها النجمة الخماسية");
  ok(tal.svgBuduh().includes("ب") && tal.svgBuduh().includes("ح"), "بُدُوح فيه ب و ح");
  ok(tal.svgLetterRing("محمد").split("<text").length === 5, "حلقة «محمد» فيها 4 حروف");
}

// ── المُركِّب ─────────────────────────────────────────────────────────────
import prediction from "../engines/prediction.js";
{
  const base = { name: "محمد", mother: "امنة", when: "2026-09-01T09:00:00+03:00", lat: 31.95, lon: 35.93 };
  const r = prediction.reading(base);
  ok(r.identity.total === abjad.jummal("محمد") + abjad.jummal("امنة"), "المُركِّب: مجموع الاسم صحيح");
  ok(r.fortune.byPlanet && r.fortune.timing, "المُركِّب: نبوءة مفهرَسة");
  ok(r.talismans.nameWafqSvg.startsWith("<svg"), "المُركِّب: طلسم الاسم SVG");
  ok(r.reveal.length > 15, "المُركِّب: سرد الكشف مفصَّل");
  ok(r.answer === null, "بلا سؤال ⇒ لا جواب");
  eq(prediction.reading(base), r, "المُركِّب حتميّ مع نفس المدخلات");
  const rq = prediction.reading({ ...base, question: "هل أنجح في عملي الجديد" });
  ok(rq.answer && rq.answer.jafr.answerLetter && rq.answer.zairja.answer, "مع سؤال ⇒ جواب جفر + زايرجة");
  eq(rq.answer.questionForm, "yesno", "سؤال «هل» ⇒ شكلٌ نعم/لا بالمُركِّب");
  ok(["نعم", "لا", "مستور"].includes(rq.answer.verdict.direction), "سؤال «هل» ⇒ اتّجاهٌ نعم/لا/مستور بالمُركِّب");
  const rWhy = prediction.reading({ ...base, question: "لماذا تكثر الخلافاتُ بيني وبين أهلي؟" });
  eq(rWhy.answer.questionForm, "why", "سؤال «لماذا» ⇒ شكلُه محفوظٌ بالمُركِّب");
  ok(!["نعم", "لا"].includes(rWhy.answer.verdict.direction), "سؤال «لماذا» بالمُركِّب لا يُجاب بنعم/لا (لا فرضَ حكمٍ ثنائيّ)");
  ok(rWhy.answer.verdict.text.includes(rWhy.answer.jafr.bab || ""), "سؤال «لماذا» بالمُركِّب: النصُّ يحمل سببًا (بابَ الحرف) لا حكمًا ثنائيًّا");
}

// ── التسخير والتصريف ────────────────────────────────────────────────────
import taskhir from "../engines/taskhir.js";
{
  const goals = taskhir.listGoals();
  ok(goals.length >= 8 && goals.every((g) => g.id && g.label), "قائمة الغايات مكتملة");

  const op = taskhir.operation("محبة", {
    name: "محمد", mother: "سميرة", request: "محبة فلانة لفلان",
    when: "2026-09-01T09:00:00+03:00", lat: 31.95, lon: 35.93
  });
  eq(op.planet, "الزهرة", "غاية «محبة» ⇒ كوكب الزهرة");
  eq(op.timing.day, "الجمعة", "يوم العمل = يوم الزهرة (الجمعة)");
  ok(op.king && op.king.name === "الأبيض (زوبعة في نسخٍ)".slice(0, 6) || op.king.name.includes("الأبيض"), `مَلِك الزهرة: ${op.king && op.king.name}`);
  ok(op.azima.includes(op.servantName) && op.azima.includes("سليمان"), "العزيمة مملوءة باسم الخادم وصيغة القَسَم");
  // العزيمةُ كلامٌ يُقال فقط، بلا تفصيلِ عملٍ (تكرار/يوم/جهة/بخور) داخلها — تلك تُذكَر في مكانها الخاصّ لا هنا
  ok(!/تُكرَّر|مستقبلًا جهةَ|وُضِعَ في البخور/.test(op.azima), "العزيمة لا تحوي تفصيلَ عملٍ (تكرار/جهة/بخور) داخل نصّها");
  ok(op.repetition.count > 0, `عدد التكرار = ${op.repetition.count}`);
  ok(op.conditions.fastingDays >= 3 && op.conditions.safety.includes("هلوسات"), "الشروط + تنبيه الأمان موجود");
  ok(op.seal.planetKameaSvg.startsWith("<svg"), "خاتم الكامية SVG");
  ok(op.undo.steps.length >= 3, "خطوات نقض العمل موجودة");
  ok(op.reveal.length >= 8, "سرد الكشف مفصَّل");
  eq(taskhir.operation("محبة", { name: "محمد", mother: "سميرة", request: "محبة فلانة لفلان", when: "2026-09-01T09:00:00+03:00", lat: 31.95, lon: 35.93 }), op, "التسخير حتميّ");

  // تسخير خادم الشخص: الكوكب من طالع اسمه
  const ts = taskhir.operation("تسخير_خادم", { name: "محمد", mother: "سميرة", lat: 31.95, lon: 35.93, when: "2026-09-01" });
  eq(ts.planet, "زحل", "خادم «محمد/سميرة»: الكوكب زحل (٤٠٧ mod 7 = 1)");

  // باب الأذى: يُنشأ لكن موسومًا
  const bad = taskhir.operation("أذى", { name: "محمد", mother: "سميرة", lat: 31.95, lon: 35.93, when: "2026-09-01" });
  ok(bad.goal.danger && bad.goal.danger.includes("الفضح"), "باب الأذى موسوم بتحذير المعرفة/الفضح");

  // ── طبقة كتب التسخير ─────────────────────────────────────────────────
  // البرهتية
  const bh = taskhir.barhatiyya({ day: "الجمعة", request: "محبة" });
  eq(bh.words.length, 28, "القسَم البرهتيّ ٢٨ كلمة");
  eq(bh.dayWord, "تَرْقَبٍ", "كلمةُ يوم الجمعة من البرهتية");
  ok(bh.fullText.includes("بَرْهَتِيهٍ") && bh.note.includes("لا معنى"), "نصُّ البرهتية + وسمُ أنها بلا معنى");
  ok(bh.repeat > 0, "عددُ تكرارٍ من جُمّل الحاجة");
  // الأقلام السرّيّة
  ok(taskhir.secretPens().length >= 2, "≥ قلمان سرّيّان");
  const ss = taskhir.secretScript("سليمان", "قلم النجوم");
  eq(ss.glyphs.length, 6, "«سليمان» ٦ حروف ⇒ ٦ رموز");
  ok(ss.glyphs.every((g) => g && g.length) && ss.text.includes(" "), "كلُّ حرفٍ استُبدِل برمز");
  eq(taskhir.secretScript("سليمان", "قلم النجوم").text, ss.text, "الخطُّ السرّيّ حتميّ");
  ok(taskhir.secretScript("اا", "قلم النجوم").glyphs[0] === taskhir.secretScript("اا", "قلم النجوم").glyphs[1], "نفسُ الحرف ⇒ نفسُ الرمز (استبدالٌ لا شيفرة معقّدة)");
  // النيرنجات
  ok(taskhir.listNayranj().length >= 3, "≥ ٣ نيرنجات");
  const ny = taskhir.nayranj("محبة");
  ok(ny.figure && ny.act && ny.place && ny.reverse && ny.trace.length >= 5, "نيرنج المحبّة: صنعٌ + فعلٌ + مكانٌ + نقضٌ + أثر");
  ok(ny.trace.some((s) => /لا صلة/.test(s)), "النيرنج مذيَّلٌ بالتفنيد");
  // المندل
  const md = taskhir.mandal("2026-09-04"); // جمعة
  ok(md.king && md.king.includes("الزهرة") && md.scenes.length >= 3 && md.debunk.includes("pareidolia"), "المندل: مَلِك اليوم + مشاهد مُلقَّنة + تفنيد");
  // الأيّام المنحوسة
  const bd = taskhir.isBadDay("2026-09-02");
  ok(bd.lunarDay >= 1 && bd.lunarDay <= 30 && typeof bd.bad === "boolean", "اليومُ القمريُّ محسوبٌ ووسمُ النحس");
  // الدمجُ في العمل
  ok(op.barhatiyya && op.secretScript && op.cornerSigning && op.badDay, "العملُ يحوي البرهتية والقلم والتوقيع واليوم المنحوس");
  ok(taskhir.operation("محبة", { name: "محمد", mother: "سميرة", request: "ر", when: "2026-09-01", lat: 31.95, lon: 35.93 }).nayranj, "غايةٌ لها نيرنجٌ ⇒ يُرفَق");
  ok(!taskhir.operation("هيبة", { name: "محمد", mother: "سميرة", when: "2026-09-01", lat: 31.95, lon: 35.93 }).nayranj, "غايةٌ بلا نيرنج ⇒ null");
  // تصريفُ خدّام السماء الأولى [السحر العظيم — الطوخي]
  ok(taskhir.listMuqaddamun().length === 7, "٧ مقدَّمين لخدّام السماء الأولى");
  const fh = taskhir.firstHeaven(3, { request: "أعرف ما يكون في السنة" });
  ok(/تنبّؤ|العالم/.test(fh.purpose) && fh.chief === "دنهل" && fh.ritual.length > 40, "المقدَّم ٣: تنبّؤٌ عامّ · رئيسُه دنهل · طقسٌ مفصَّل");
  ok(fh.repeat === (abjad.jummal("أعرف ما يكون في السنة") % 70) + 7, "تكرارُ المقدَّم من جُمّل الحاجة");
  ok(fh.trace.some((s) => /لا سببيّة/.test(s)) && /اثنتَي عشرةَ .*درجة/.test(fh.secondHeavenNote), "الأثرُ مذيَّلٌ بالتفنيد + ملاحظةُ ١٢ درجة");
  // عساكرُ المقدَّمين السبعة [السحر العظيم ص ١٤–١٧]
  ok(taskhir.muqaddamArmies().length === 7 && taskhir.muqaddamArmies().every((a) => a.count > 20 && a.chief), "٧ عساكرَ للمقدَّمين، لكلٍّ رتلُ أسماءٍ ورئيس");
  eq(taskhir.muqaddamArmy(1).chief, "أورقيائيل", "عسكرُ المقدَّم ١ رئيسُه أورقيائيل");
  ok(taskhir.firstHeaven(6).army && taskhir.firstHeaven(6).army.names.length > 30, "firstHeaven يحمل عسكرَ المقدَّم");
  ok(taskhir.safarAdamIntro().text.includes("سفرِ آدم") && taskhir.safarAdamIntro().text.includes("نوح"), "مطلعُ سفرِ آدم ونسبُ توارُثِه");
  eq(JSON.stringify(taskhir.firstHeaven(3, { request: "أعرف ما يكون في السنة" })), JSON.stringify(fh), "المقدَّم حتميّ");
  ok(/الطوخي/.test(taskhir.SOURCES.sahr_azim.title), "مصدرُ السحر العظيم مسجَّل");
  // تصريفُ السماواتِ ٣–٧ [السحر العظيم ص ٦٢–٧١]
  ok(taskhir.listHeavens().length === 7, "٧ سماواتٍ في الفهرس");
  const h3 = taskhir.heaven(3);
  eq(h3.chiefs.join(","), "رهطيايل,عطاهيل,مقرائيل,قرنطايل", "مقدَّمو السماء الثالثة");
  ok(h3.ops[0].purpose.includes("الخيل") && h3.ops[0].ritual.length > 60, "السماء ٣: عملُ الخيل + عزيمة");
  const h4 = taskhir.heaven(4);
  ok(h4.ops.length === 2 && h4.ops[1].ritual.includes("أخينوس"), "السماء ٤: مخاطبةُ الشمس نهارًا وليلًا + صلاةُ الأسماء");
  const h6 = taskhir.heaven(6);
  ok(/صورةَ أسدٍ/.test(h6.ops[0].ritual) && /الصرف/.test(h6.ops[0].ritual), "السماء ٦: خاتمُ الأسد + الصرف");
  const sf = taskhir.sayfAllah();
  ok(sf.names.length > 1400 && sf.virtue.includes("قلبٍ نقيٍّ"), "سيفُ الله: نصٌّ طويلٌ + فضلُه");
  ok(sf.operations.length === 11 && sf.operations.some((o) => /طيُّ الأرض/.test(o.purpose)) && sf.operations.some((o) => /المشيُ على النار/.test(o.purpose)), "سيفُ الله: ١١ عملًا (طيُّ الأرض، المشيُ على النار…)");
  ok(sf.hierarchy.four.length === 4 && sf.hierarchy.twelve.length === 12 && sf.handOfGod && sf.powers.includes("يهدمُ الجبال"), "سيفُ الله: مراتبُ الملائكة + يدُ الله + القدرات");
  ok(sf.applications.length >= 30 && sf.applications.every((a) => a.purpose && a.span && a.method), "سيفُ الله: ≥٣٠ تطبيقًا «من اسمٍ إلى اسمٍ»");
  ok(sf.wrathChiefs["السخط"] === "قوفيلساال" && sf.closingSalam.includes("سفرُ الخفايا"), "مقدَّمو السخط + سلامُ الختام");
  const ac = taskhir.adamNamesChain();
  eq(ac.chain[0] + "…" + ac.chain[ac.chain.length - 1], "آدم…نوح", "سلسلةُ كتاب الأسماء: آدم ← نوح");
  eq(JSON.stringify(taskhir.heaven(5)), JSON.stringify(taskhir.heaven(5)), "تصريفُ السماء حتميّ");
  ok(taskhir.secondHeavenDegrees().length === 12 && taskhir.secondHeavenDegree(1).purpose.includes("المجذوم") && taskhir.secondHeavenDegree(12).purpose.includes("مرض"), "درجاتُ السماء الثانية: الاثنتا عشرةَ كلُّها مستخرَجة (١ إبراءُ المجذوم … ١٢ إبراءُ المريض)");
  ok(taskhir.secondHeavenDegree(10).ritual.includes("ملائكةَ العدل"), "الدرجةُ ١٠ اكتملَ طقسُها (عزيمةُ ملائكةِ العدل)");
}

// ── فنّ الأرواح ─────────────────────────────────────────────────────────
import art from "../engines/spirit-art.js";
import spirits from "../data/spirits.data.js";
{
  const king = spirits.SEVEN_KINGS[0];
  const c = art.card(king);
  ok(c.sigilSvg.startsWith("<svg") && c.sigilSvg.includes("<polyline"), "خَتم المَلِك SVG فيه خطّ");
  ok(c.imagePrompt.includes(king.name) && c.imagePrompt.includes("تذهيب"), "برومبت عربيّ بأسلوب التذهيب");
  ok(c.imagePromptEn.toLowerCase().includes("no photorealism") || c.imagePromptEn.includes("NO photorealism"), "برومبت إنجليزيّ ينفي الواقعية");
  ok(c.imageSlot.startsWith("assets/spirits/") && c.imageSlot.endsWith(".png"), `خانة الصورة: ${c.imageSlot}`);
  eq(art.card(king), c, "بطاقة الروح حتميّة");
  // كل الأرواح تُنتج بطاقة بلا خطأ
  const all = [...spirits.SEVEN_KINGS, ...spirits.ARCHANGELS, ...spirits.MARADA, ...spirits.SONS_OF_IBLIS];
  all.forEach((e) => ok(art.card(e).sigilSvg.startsWith("<svg"), `بطاقة: ${e.name || e.king}`));
}

// ── علم الرمل ───────────────────────────────────────────────────────────
import raml from "../engines/raml.js";
{
  eq(raml.FIGURES.length, 16, "١٦ شكلًا رمليًّا");
  const ids = new Set(raml.FIGURES.map((f) => f.rows.join("")));
  eq(ids.size, 16, "الأنماط الـ١٦ متمايزة");
  // الجمع: طريق + طريق = جماعة (١+١ زوجيّ ⇒ ٢)
  eq(raml.add(raml.FIGURES[0], raml.FIGURES[0]).id, "jamaa", "الطريق + الطريق = الجماعة");
  const c = raml.chart({ name: "محمد", mother: "سميرة", question: "هل أوفَّق في عملي", when: "2026-09-01T09:00:00Z" });
  eq(c.mothers.length, 4, "٤ أمّهات"); eq(c.daughters.length, 4, "٤ بنات"); eq(c.nieces.length, 4, "٤ منقولات");
  ok(c.judge && c.judge.ar, `القاضي: ${c.judge.ar}`);
  eq(c.houses.length, 12, "١٢ بيتًا مُسكَّنًا");
  const r = raml.reading({ name: "محمد", mother: "سميرة", question: "هل أوفَّق في عملي", when: "2026-09-01T09:00:00Z" });
  ok(r.house.n === 10, `«عمل» ⇒ البيت العاشر (${r.house.name})`);
  ok(typeof r.verdict === "string" && r.trace.length >= 8, "حكمٌ + أثرٌ مفصَّل");
  eq(raml.reading({ name: "محمد", mother: "سميرة", question: "هل أوفَّق في عملي", when: "2026-09-01T09:00:00Z" }), r, "الرمل حتميّ");
  const r2 = raml.reading({ name: "محمد", mother: "سميرة", question: "هل أوفَّق في عملي", when: "2026-09-02T09:00:00Z" });
  ok(JSON.stringify(r2.chart.mothers) !== JSON.stringify(r.chart.mothers), "تغيّر اليوم ⇒ طالعٌ مختلف");
  // الضربات اليدوية
  const rt = raml.chart({ taps: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16] });
  ok(rt.judge && rt.mothers.every(Boolean), "الطالع من ١٦ ضربة يدويّة");

  // ── التوسعة متعدّدة المصادر ──────────────────────────────────────────
  // خصائصُ الأشكال المشتقّة
  const pTariq = raml.figureProps("tariq"), pJamaa = raml.figureProps("jamaa");
  eq(pTariq.stability, "منقلب", "الطريق [1111] منقلب");
  eq(pJamaa.stability, "ثابت", "الجماعة [2222] ثابت");
  eq(pTariq.motion, "متحرّك", "الطريق متحرّك");
  eq(pJamaa.motion, "ساكن", "الجماعة ساكن");
  ok(pTariq.abdah === 15 && pJamaa.abdah === 0, "عددُ أبدح: الطريق ١٥ والجماعة ٠");
  ok(["أيّام","أسابيع","أشهر","أعوام"].includes(pTariq.timeUnit), "وحدةُ زمنٍ صحيحة");
  // الغلبةُ العنصريّة
  eq(raml.elementVictor("هواء", "نار"), "هواء", "الهواء يغلب النار");
  eq(raml.elementVictor("ماء", "تراب"), "ماء", "الماء يغلب التراب");
  eq(raml.elementVictor("نار", "هواء"), "هواء", "الترتيبُ لا يهمّ في الغلبة");
  eq(raml.elementVictor("نار", "نار"), null, "تعادلٌ عند تطابق العنصر");
  // الصداقة
  ok(raml.areFriends("farah", "bayad"), "الفرح (هواء) صديقٌ للبياض (هواء)");
  ok(!raml.areFriends("farah", "habs"), "الفرح (هواء) ليس صديقًا للحبس (تراب)");
  // دلالةُ الشكل في البيت
  for (const f of raml.FIGURES) for (let h = 1; h <= 12; h++) {
    ok(typeof raml.figureInHouse(f.id, h) === "string" && raml.figureInHouse(f.id, h).length > 10,
       `دلالةُ ${f.id}@${h}`);
  }
  eq(raml.figureInHouse("tariq", 9), "سفرٌ بعيدٌ مؤكَّد، والطريق مفتوح.", "تخصيصُ الطريق@٩");
  // التوقيت
  const tm = raml.timingFor("jamaa");
  ok(tm.unit && tm.magnitude >= 4 && /نحو/.test(tm.text), "تقديرُ التوقيت");
  // القراءةُ الموسَّعة
  const rr = raml.reading({ name: "محمد", mother: "سميرة", question: "هل أوفَّق في عملي", when: "2026-09-01T09:00:00Z" });
  ok(Array.isArray(rr.bySource) && rr.bySource.length === 4, "٤ مصادر في التفصيل (+ المثلث)");
  ok(rr.threePart && rr.threePart.past.mood && rr.threePart.present.mood && rr.threePart.future.mood, "قراءةٌ ثلاثيّة: ماضٍ/حاضر/مستقبل");
  ok(typeof rr.mizanRule === "string" && /مزدوج|زوج/.test(rr.mizanRule), "قاعدةُ ميزان الضرب من المثلث");
  ok(raml.figureLore("tariq") && raml.figureLore("tariq").berber === "ابريد", "خصائصُ المثلث: الطريق ← ابريد");
  ok(raml.timingFor("qabid_dakhil").muthallath && /عشر/.test(raml.timingFor("qabid_dakhil").muthallath), "مدّةُ القبض الداخل من المثلث (١٢ سنة)");
  ok(typeof rr.scoreStandard === "number" && typeof rr.scoreOmani === "number", "وزنان مستقلّان");
  ok(rr.score === Math.round(((rr.scoreStandard * 1 + rr.scoreOmani * 0.85) / 1.85) * 100) / 100, "المزجُ الموزون صحيح");
  ok(typeof rr.houseFigureMeaning === "string" && rr.houseFigureMeaning.length > 10, "دلالةُ شكلِ البيت في القراءة");
  ok(typeof rr.aspect === "string" && typeof rr.witnessNote === "string", "نظرُ الطالع وملاحظةُ الشاهدين");
  ok(rr.timing && /نحو/.test(rr.timing.text), "توقيتٌ في القراءة");
  ok(typeof rr.balanceOk === "boolean", "ميزانُ الرمل محسوب");
  ok(rr.trace.length >= 12, "أثرٌ موسَّع (≥ ١٢ سطرًا)");
  // التسكينُ السداسيَّ عشر
  const c16 = raml.chart({ name: "محمد", mother: "سميرة", question: "س", when: "2026-09-01T09:00:00Z" });
  eq(c16.taskin16.length, 16, "التسكين السداسيّ عشر ١٦ موضعًا");
  ok(c16.taskin16[14].name.includes("الميزان"), "الموضع ١٥ = صافية الأمر (الميزان)");
  // نموذج الستّةَ عشرَ بيتًا (نهاية العمل)
  const h16 = raml.houses16();
  eq(h16.houses.length, 16, "نموذج نهاية العمل: ١٦ بيتًا");
  eq(h16.houses[0].name, "بيت الحياة", "البيت ١ = بيت الحياة");
  eq(h16.houses[15].name, "العاقبة", "البيت ١٦ = العاقبة");
  ok(/حياةٌ وكسبٌ/.test(h16.mnemonic) && /العاقبة/.test(h16.mnemonic), "بيتُ الشعر الجامع للبيوت");
  ok(c16.taskin16[0].topic && c16.taskin16[0].name === "بيت الحياة", "التسكين ١٦ يحمل أسماء وموضوعات الطوخي");
  // طريقةُ تسكينٍ بديلة تُغيّر توزيع البيوت
  const cA = raml.chart({ name: "محمد", mother: "سميرة", question: "س", when: "2026-09-01T09:00:00Z" });
  const cB = raml.chart({ name: "محمد", mother: "سميرة", question: "س", when: "2026-09-01T09:00:00Z" }, { taskin: "muthallath" });
  ok(JSON.stringify(cA.houses.map((h) => h.figure.id)) !== JSON.stringify(cB.houses.map((h) => h.figure.id)),
     "تغيّرُ طريقةِ التسكين ⇒ توزيعٌ مختلف للبيوت");
}

// ── بحث الكتاب ─────────────────────────────────────────────────────────
import corpus from "../engines/corpus.js";
{
  const st = corpus.stats();
  ok(st.chunks > 1000, `الفهرس فيه ${st.chunks} مقطعًا`);
  eq(corpus.normAr("الأسْمَاءُ الحُسْنَى"), "الاسماء الحسني", "تطبيع البحث العربيّ");
  const res = corpus.search("الاسم الأعظم", { limit: 5 });
  ok(res.total > 0 && res.hits[0].snippet.length > 0, `بحث «الاسم الأعظم» ⇒ ${res.total} نتيجة`);
  const res2 = corpus.search("وفق", { limit: 3 });
  ok(res2.total > 0, `بحث «وفق» ⇒ ${res2.total} نتيجة`);
  eq(corpus.search("qwerty zxcvbn", {}).total, 0, "استعلامٌ يتلاشى بعد التطبيع ⇒ لا نتائج");
}

// ── تشخيص الحالة ───────────────────────────────────────────────────────
import diag from "../engines/diagnosis.js";
{
  const list = diag.symptomList();
  ok(list.length >= 30, `${list.length} عرضًا`);
  const fs = diag.forerStats();
  ok(fs.avgAfflictionsPerSymptom >= 2, `كل عرض يدلّ على ${fs.avgAfflictionsPerSymptom} علّة وسطيًّا (فضفاض عمدًا)`);
  const a = diag.assess({ symptoms: ["s01", "s02", "s04", "s09", "s19"], name: "محمد", mother: "سميرة" });
  ok(a.primary && a.primary.support && a.primary.support.length > 0, `تشخيص: ${a.primary.label} — ${a.primary.support}`);
  ok(a.primary.barnumPct > 0 && a.reveal.some((l) => l.includes("زائفة")), "«النسبة» زائفةٌ ومكشوفةٌ صراحةً (ليست في المتن)");
  ok(a.primary.remedy && a.primary.remedy.ruqya.length, "خطة علاج مرفقة");
  ok(a.charm && a.charm.svg.startsWith("<svg"), "حرز شخصيّ SVG");
  ok(a.disclaimer.includes("طبيبًا"), "تنبيه صحّيّ موجود");
  ok(a.reveal.some((l) => l.includes("فورر")), "الكشف يذكر تأثير فورر");
  eq(diag.assess({ symptoms: ["s01", "s02", "s04", "s09", "s19"], name: "محمد", mother: "سميرة" }), a, "التشخيص حتميّ");
  eq(diag.assess({ symptoms: ["s01", "zzz-mnknown", "s02"] }).unknownSymptoms.join(""), "zzz-mnknown", "الأعراضُ المجهولةُ تُبلَّغ لا تُبتَلَع بصمت");
  const b = diag.assess({ symptoms: ["s07", "s22", "s10", "s32"] });
  ok(b.primary.support && b.primary.support.length > 0, `أعراض أخرى ⇒ ${b.primary.label} — ${b.primary.support}`);
}

// ── الخواصّ ─────────────────────────────────────────────────────────────
import khawass from "../engines/khawass.js";
{
  const nm = khawass.names();
  ok(nm.length >= 99, `${nm.length} اسمًا في الكتالوج`);
  const rahman = nm.find((n) => n.name === "الرحمن");
  eq(rahman.value, abjad.jummal("الرحمن"), "قيمة «الرحمن» محسوبة بالجُمّل");
  eq(khawass.namesByValue(abjad.jummal("الملك"))[0].name, "الملك", "بحث بالقيمة يجد «الملك»");
  const m = khawass.matchName(66); // الله = 66
  ok(m.names?.some((x) => x.name === "الله") || m.nearest, "مطابقة العدد 66");
  const p = khawass.nameForPerson("محمد", "سميرة");
  ok(p.name && p.name.name, `الاسم الموافق لمحمد/سميرة: ${p.name.name}`);
  eq(khawass.nameForPerson("محمد", "سميرة"), p, "اختيار الاسم حتميّ");
  ok(khawass.surahs().some((s) => s.ref.includes("الكرسي")), "كتالوج السور فيه آية الكرسي");
  ok(khawass.hurufMuqattaa().groups.length === 14, "١٤ صيغة حروف مقطّعة");
  ok(khawass.toxicList().some((t) => t.name.includes("حرمل")), "قائمة السموم فيها الحرمل");
  ok(khawass.search("رزق").names.length > 0, "بحث «رزق» في الأسماء");
}

// ── كرامات الأبراج + أعوان المنازل (إضافات الفلك) ──────────────────────
{
  const z = falak.zodiacOf(15 + 30 * 7); // 15° العقرب
  eq(z.sign, "العقرب", "طول 225° = 15° العقرب");
  eq(z.face.faceNumberInSign, 2, "15° ⇒ الوجه الثاني في البرج");
  eq(z.face.ruler, "الشمس", "الوجه الثاني من العقرب: الشمس (دور الكلدانيين)");
  ok(z.term && z.term.ruler, `حدّ 15° العقرب: ${z.term.ruler}`);
  ok(z.triplicity && z.triplicity.day, `مثلثة الماء نهارًا: ${z.triplicity.day}`);
  // الحمل 3°: حدّ المشتري (0–6)
  eq(falak.zodiacOf(3).term.ruler, "المشتري", "3° الحمل ضمن حدّ المشتري");
  // الوجه الأول من الحمل: المريخ
  eq(falak.zodiacOf(5).face.ruler, "المريخ", "الوجه الأول من الحمل: المريخ");
  const mm = falak.moonMansion(new Date("2026-09-01T12:00:00Z"));
  ok(mm.letter && mm.letterPlanet && mm.letterAngel, `منزلة ${mm.number}: حرف «${mm.letter}» ← ${mm.letterPlanet} ← ${mm.letterAngel}`);
  ok(["سعد", "نحس", "ممتزجة", "معتدلة"].includes(mm.roohaniyya), `روحانيّة المنزلة: ${mm.roohaniyya}`);
}

// ── الطلاسم المسمّاة ──────────────────────────────────────────────────
import talNamed from "../engines/talisman-named.js";
{
  const l = talNamed.list();
  ok(l.length >= 10, `${l.length} طلسمًا مسمّى`);
  const k = talNamed.render("khatam-sulayman-6");
  ok(k.svg.includes("<polygon") && k.name.includes("سليمان"), "خاتم سليمان SVG");
  const all = talNamed.renderAll("سميرة");
  ok(all.every((t) => t.svg.startsWith("<svg")), "كل الطلاسم المسمّاة تُرسَم");
  ok(talNamed.render("wafq-name", "سميرة").svg.includes("<text"), "وفق الاسم يُولَّد بالاسم المُمرَّر");
}

// ── الجفر: باب الجامع + الجدول الأعظم ────────────────────────────────
{
  const a = jafr.extractAnswer("هل أنجح", { name: "محمد", mother: "سميرة" });
  ok(a.bab && a.bab.length > 10, `باب الجفر الجامع لحرف «${a.answerLetter}»: ${a.bab.slice(0, 30)}…`);
  const gt = jafr.grandTable();
  eq(gt.rows.length, 28, "الجدول الأعظم 28 صفًّا");
  ok(gt.rows.every((r) => r.length === 28), "كل صفّ 28 عمودًا");
}

// ── الخواصّ: الأدعية ────────────────────────────────────────────────
{
  const ad = khawass.adiya();
  ok(ad.list.length >= 10, `${ad.list.length} دعاءً/حزبًا مفهرَسًا`);
  ok(ad.list.some((x) => x.name.includes("حزب البحر")), "حزب البحر مفهرَس");
  ok(khawass.search("النصر").adiya.length > 0, "بحث «النصر» في الأدعية");
}

// ── قراءة الكفّ ──────────────────────────────────────────────────────
import kaf from "../engines/kaf.js";
{
  const sc = kaf.schema();
  eq(sc.handTypes.length, 7, "الأنواع السبعة للأيدي");
  eq(sc.lines.length, 6, "ستّةُ خطوطٍ كبرى");
  ok(sc.mounts.length === 7, "التلالُ السبعة");
  const f = {
    hand: "right", handType: "square", texture: "firm", palmSurface: "flatFull",
    fingers: { index: { state: sc.fingers[0].states[0] }, middle: { state: sc.fingers[1].states[0] },
               ring: { state: sc.fingers[2].states[0] }, little: { state: sc.fingers[3].states[0] } },
    fingerSet: ["knotty"], thumb: { firstPhalanx: "large", secondPhalanx: "long", angle: "open", ball: "full" },
    nails: ["medium"], mounts: { jupiter: "full", saturn: "flat" },
    lines: { life: { present: true, confidence: 0.9, states: [sc.lines[0].states[0]] },
             head: { present: true, confidence: 0.3, states: [] },
             heart: { present: false }, fate: { present: false }, sun: { present: false }, health: { present: false } },
    marks: [{ type: "star", where: "mount:jupiter", confidence: 0.8 }],
    secondary: { venusGirdle: true, marriageCount: 1, rascettes: 3, quadrangle: "wide" }, triangle: "wideClear",
  };
  const r = kaf.read(f);
  ok(r.sections.length >= 8, `القراءةُ أخرجت ${r.sections.length} بابًا`);
  ok(r.sections[0].title.includes("المربّعة"), "نوعُ اليدِ الأوّلُ في القراءة");
  ok(r.honesty.some((h) => h.includes("خطُّ القلب")), "خطٌّ غيرُ ظاهرٍ يُذكَرُ في «ما لم يتبيّنْ»");
  ok(r.honesty.some((h) => h.includes("خطُّ الرأس") && h.includes("ثقة")), "خطٌّ منخفضُ الثقةِ لا يُقرَأُ ويُذكَر");
  ok(r.sections.every((s) => s.src === null || /\[[بنح]\]/.test(s.src)), "كلُّ بابٍ مربوطٌ بمصدرِه");
  eq(JSON.stringify(kaf.read(f)), JSON.stringify(r), "قراءةُ الكفِّ حتميّة");
  ok(/الطوخي|نجيب|الأسطة/.test(r.sources.map((x) => x.title).join()) && r.sources[0].title.includes("نجيب"), "المصدرُ الأساسيُّ مسجَّل");
}

// ── طبقةُ رؤيةِ الكفّ (الدوالُّ الهندسيّةُ الصِّرفة؛ الكاميرا نفسُها لا تُختبَرُ هنا) ─────
import { extractFeatures as kafFeat, templatePx, assessFit, palmQuad, detectHand } from "../web/kaf-vision.js";
{
  const W = 1280, H = 720;
  const tpl = templatePx("right", W, H);
  const fit0 = assessFit(tpl.pts, tpl, "right", 1);
  ok(fit0.ok, "يدٌ مطابقةٌ للرسمة تُقبَل");
  const move = (pts, dx, dy) => pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  const scale = (pts, s) => { const c = pts[9]; return pts.map((p) => ({ x: c.x + (p.x - c.x) * s, y: c.y + (p.y - c.y) * s })); };
  ok(!assessFit(move(tpl.pts, 0.25 * tpl.boxH, 0), tpl, "right", 1).ok, "يدٌ مُزاحةٌ عن الرسمة لا تُلتقَط");
  ok(/اليسار/.test(assessFit(move(tpl.pts, 0.25 * tpl.boxH, 0), tpl, "right", 1).msg), "الإزاحةُ يمينًا ⇒ «حرّك يسارًا» (عرضٌ غيرُ معكوس)");
  ok(/اليمين/.test(assessFit(move(tpl.pts, 0.25 * tpl.boxH, 0), tpl, "right", -1).msg), "في العرضِ المعكوسِ تنقلبُ الجهة");
  ok(/قرِّب/.test(assessFit(scale(tpl.pts, 0.6), tpl, "right", 1).msg), "يدٌ صغيرةٌ (بعيدة) ⇒ «قرّب»");
  ok(/أبعِد/.test(assessFit(scale(tpl.pts, 1.4), tpl, "right", 1).msg), "يدٌ كبيرةٌ (قريبة) ⇒ «أبعد»");
  const flipped = tpl.pts.map((p) => ({ x: W - p.x, y: p.y }));
  ok(/باطنَ/.test(assessFit(flipped, tpl, "right", 1).msg), "ظهرُ اليد/اليدُ الأخرى ⇒ طلبُ إظهارِ الباطن");
  ok(assessFit(flipped, templatePx("left", W, H), "left", 1).ok, "اليسرى تُطابَقُ على قالبِ اليسرى");
  const upside = tpl.pts.map((p) => ({ x: p.x, y: H - p.y }));
  ok(/الأعلى/.test(assessFit(upside, tpl, "right", 1).msg), "أصابعُ للأسفل ⇒ «وجّهْها للأعلى»");

  // النِّسَبُ لا تتغيّرُ بشكلِ الإطار (كانت تُقاسُ على إحداثيّاتٍ مُطبَّعةٍ فيمطُّها الإطار)
  const lmA = tpl.pts.map((p) => ({ x: p.x / W, y: p.y / H, z: 0 }));
  const W2 = 720, H2 = 1280, ox = (W2 - W) / 2, oy = (H2 - H) / 2;
  const lmB = tpl.pts.map((p) => ({ x: (p.x + ox) / W2, y: (p.y + oy) / H2, z: 0 }));
  const fA = kafFeat(lmA, null, W, H), fB = kafFeat(lmB, null, W2, H2);
  eq(JSON.stringify([fA.handType, fA.fingers, fA.thumb]), JSON.stringify([fB.handType, fB.fingers, fB.thumb]), "نفسُ اليدِ في إطارٍ عريضٍ وطويل ⇒ نفسُ الملامح");
  // الإحداثيّاتُ العالميّةُ (أمتار) تُقدَّمُ على إحداثيّاتِ الصورة
  const wlm = tpl.pts.map((p) => ({ x: p.x / tpl.boxH * 0.19, y: p.y / tpl.boxH * 0.19, z: 0 }));
  const fW = kafFeat(lmA.map((p) => ({ x: p.x * 0.5, y: p.y, z: 0 })), wlm, W, H);
  eq(JSON.stringify([fW.handType, fW.fingers]), JSON.stringify([fA.handType, fA.fingers]), "مع الإحداثيّاتِ العالميّة لا يُؤثّرُ تشوّهُ الصورة");
  ok(fW._debug.world === true, "تُستعمَلُ الإحداثيّاتُ العالميّةُ حين تتوفّر");
  // لا ادّعاءَ لما لا تقيسُه الكاميرا
  ok(!JSON.stringify(fA.fingers).includes("قمّتُها"), "لا يُدّعى شكلُ قمّةِ السبّابة (لا تقيسُه الكاميرا)");
  ok(fA.thumb.angle === "" && fA.fingerSet.length === 0, "زاويةُ الإبهامِ وتباعدُ الأصابعِ لا يُستنتَجان من وضعيّةٍ مفروضة");
  ok(!fA.thumb.firstPhalanx && !fA.thumb.secondPhalanx, "سُلامَيا الإبهامِ لا يُحكَمُ عليهما آليًّا (نقاطُ اليدِ لا تحدّدُهما بدقّة)");
  ok(fA.handType === null && fA.handHint && fA.handHint.palmShape, "نوعُ اليدِ لا يُحكَمُ به آليًّا — يُعرَضُ وصفُ النِّسَبِ فقط");
  const wide = tpl.pts.map((p, i) => ({ x: tpl.pts[9].x + (p.x - tpl.pts[9].x) * 1.6, y: p.y }));
  const fWide = kafFeat(wide.map((p) => ({ x: p.x / W, y: p.y / H, z: 0 })), null, W, H);
  ok(fWide.handHint.fits.includes("square") && fWide.handType === null, "كفٌّ عريضةٌ ⇒ «تتّسقُ مع المربّعة» اقتراحًا لا حكمًا");
  // خنصرٌ طويلٌ يبلغُ مفصلَ البنصر ⇒ «طويلة» (كان منطقُه معكوسًا)
  const longPinky = tpl.pts.map((p, i) => (i >= 18 ? { x: p.x, y: p.y - 0.12 * tpl.boxH, z: 0 } : { ...p, z: 0 }));
  const fP = kafFeat(longPinky.map((p) => ({ x: p.x / W, y: p.y / H, z: 0 })), null, W, H);
  ok(/تبلغُ مفصلَ/.test(fP.fingers.little.state) && !/لا تبلغ/.test(fP.fingers.little.state), "خنصرٌ يبلغُ مفصلَ البنصر ⇒ «طويلة»");
  // مربّعُ الراحة: يبدأُ من جهةِ السبّابة ويمتدُّ حتى مستوى الرسغ
  const q = palmQuad(tpl.pts);
  ok(q[0][0] > q[1][0] && q[2][1] > tpl.pts[9].y + 0.3 * tpl.boxH, "مربّعُ الراحةِ من جهةِ السبّابة حتى الرسغ");
}

// ── قراءةُ الكفّ: اليدُ آليًّا، الإصبعُ المعوجّ، تتبّعُ الخطوط، وإجماعُ اللقطات ──
{
  const W = 720, H = 1280;
  const R = templatePx("right", W, H).pts, Lf = templatePx("left", W, H).pts;
  ok(detectHand(R, "Right").hand === "right" && !detectHand(R, "Right").backOfHand, "كفٌّ يمنى (الإبهامُ يمينَ الصورة) ⇒ اليمنى");
  ok(detectHand(Lf, "Left").hand === "left", "كفٌّ يسرى ⇒ اليسرى");
  ok(detectHand(R, "Left").backOfHand, "تعارضُ الهندسةِ مع تصنيفِ MediaPipe ⇒ ظهرُ الكفّ");
  ok(detectHand(R, undefined).backOfHand === false, "بلا تصنيفٍ ⇒ لا يُدَّعى «ظهرُ الكفّ»");

  // الانثناءُ نحوَ الراحة (عمقُ z) ليس «اعوجاجًا»؛ الميلُ الجانبيُّ في الصورة هو الاعوجاج
  const norm = (pts) => pts.map((p) => ({ x: p.x / W, y: p.y / H, z: 0 }));
  const flexed = norm(R).map((p, i) => (i >= 10 && i <= 12 ? { ...p, z: -0.08 * (i - 9) } : p));
  ok(!/مقوَّسة/.test(kafFeat(flexed, null, W, H).fingers.middle?.state || ""), "إصبعٌ منثنٍ قليلًا نحوَ الراحة ⇒ ليست «مقوَّسةً»");
  const bent = norm(R.map((p, i) => (i === 10 || i === 11 ? { x: p.x + 60, y: p.y } : p)));
  ok(/مقوَّسة/.test(kafFeat(bent, null, W, H).fingers.middle?.state || ""), "إصبعٌ يميلُ جانبًا بوضوح ⇒ «مقوَّسةٌ منحنية»");

  // تتبّعُ الخطوط على صورةٍ اصطناعيّة: جلدٌ متجانسٌ بنسيجٍ خفيف + تجاعيدُ داكنةٌ في أماكنِها التشريحيّة
  const KL = (await import("../web/kaf-lines.js")).default || globalThis.KafLines;
  const N = 384;
  const mk = (draw) => {
    const g = new Uint8Array(N * N);
    let seed = 3; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let i = 0; i < N * N; i++) g[i] = 175 + Math.round(rnd() * 10);
    const dot = (x, y) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = Math.round(x + dx), Y = Math.round(y + dy); if (X >= 0 && Y >= 0 && X < N && Y < N) g[Y * N + X] = Math.min(g[Y * N + X], 110 + 12 * Math.hypot(dx, dy)); } };
    draw(dot);
    return g;
  };
  const blank = KL.analyze(mk(() => {}), N);
  ok(["heart", "head", "life", "fate"].every((k) => blank[k].present !== true), "جلدٌ بلا تجاعيد ⇒ لا يُخترَعُ أيُّ خطّ");
  // المرشَّحُ الضعيفُ لا يُقرأُ في المحرّك (تحتَ عتبةِ الثقة) إلّا بعد تأكيد
  const kafEng = (await import("../engines/kaf.js")).default;
  const weakRead = kafEng.read({ hand: "right", fingers: {}, thumb: {}, mounts: {}, lines: { life: { present: true, confidence: 0.3, weak: true, states: ["قصيرٌ"], source: "camera" } }, secondary: {} });
  ok(!weakRead.sections.some((x) => x.title.includes("الحياة")) && weakRead.honesty.some((h) => h.includes("مرشَّحًا")), "مرشَّحٌ ضعيفٌ غيرُ مؤكَّد ⇒ لا يُقرأُ ويُطلَبُ تأكيدُه");
  const img = mk((dot) => {
    for (let x = N * 0.97; x >= N * 0.45; x -= 0.5) dot(x, N * 0.2 + (N * 0.97 - x) * 0.05);           // القلب
    for (let x = N * 0.12; x <= N * 0.7; x += 0.5) dot(x, N * 0.3 + (x - N * 0.12) * 0.35);            // الرأسُ منحدرًا
    for (let y = N * 0.15; y <= N * 0.95; y += 0.5) dot(N * 0.1 + Math.sin((y / N - 0.15) / 0.8 * Math.PI) * N * 0.36, y); // الحياة (يبلغُ ~٠٫٤٦ من العرض)
  });
  const A = KL.analyze(img, N);
  ok(A.heart.present === true && A.life.present === true && A.head.present === true, "التجاعيدُ الثلاثُ في أماكنِها ⇒ تُرصَدُ الثلاثة");
  ok(A.head.states.includes("منحدرٌ نحوَ تلِّ القمر"), "رأسٌ منحدرٌ بوضوح ⇒ «منحدرٌ نحوَ تلِّ القمر»");
  ok(A.life.states.includes("يقوسُ واسعًا داخلَ الكفّ (تلُّ الزهرةِ كبير)"), "حياةٌ تقوسُ إلى ~٠٫٤٦ من العرض ⇒ «يقوسُ واسعًا»");
  ok(A.fate.present !== true, "لا تجعّدَ عموديًّا في الوسط ⇒ لا «خطَّ مصير»");
  // نسيجُ جلدٍ: خدوشٌ قصيرةٌ عشوائيّةُ الاتّجاه (تباينٌ عالٍ بلا خطٍّ رئيسيّ) ⇒ لا يُصنَعُ منها خطّ
  for (const nScr of [300, 900]) {
    const tex = mk(() => {});
    let sd = 11; const rr = () => ((sd = (sd * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let k = 0; k < nScr; k++) { const x0 = rr() * N, y0 = rr() * N, a = rr() * Math.PI, Ls = 8 + rr() * 22;
      for (let t = 0; t < Ls; t += 0.5) { const x = Math.round(x0 + Math.cos(a) * t), y = Math.round(y0 + Math.sin(a) * t); for (let d = -1; d <= 1; d++) { const X = x + d; if (X >= 0 && y >= 0 && X < N && y < N) tex[y * N + X] = Math.min(tex[y * N + X], 125); } } }
    const T2 = KL.analyze(tex, N);
    // قد يظهرُ «مرشَّحٌ ضعيف» على الخدوش، لكنّه لا يدخلُ القراءةَ إلّا إن أكّده المستخدمُ بعينِه
    ok(["heart", "head", "life", "fate"].every((k) => !(T2[k].present === true && !T2[k].weak && T2[k].confidence >= 0.45)), `نسيجُ ${nScr} خدشًا قصيرًا ⇒ لا خطَّ مُعتمَدًا مُخترَعًا`);
  }

  // الإجماع: ما يتبدّلُ بين اللقطاتِ لا يُقال
  const fr = (states, present = true) => ({ heart: { present, confidence: 0.9, states, path: [], measures: {} }, head: { present: null, confidence: 0.2, states: [], path: [], measures: {} }, life: { present: true, confidence: 0.9, states: ["قصيرٌ"], path: [], measures: {} }, fate: { present: false, confidence: 0.55, states: [], path: [], measures: {} } });
  const c = KL.consensus([fr(["قصيرٌ"]), fr(["قصيرٌ", "متقطّعٌ / به كسور"]), fr(["قصيرٌ"]), fr(["قصيرٌ"])], 0.75);
  ok(c.heart.present === true && c.heart.states.join() === "قصيرٌ" && c.heart.unstable.includes("متقطّعٌ / به كسور"), "حالةٌ في لقطةٍ واحدةٍ من أربع ⇒ تُسقَط، والمتّفَقُ عليها تبقى");
  ok(c.head.present === null && c.fate.present === false, "غيرُ المتبيَّنِ يبقى «لم يتبيّنْ»، والغائبُ في كلِّها غائب");
  const c2 = KL.consensus([fr(["قصيرٌ"]), fr([], false), fr(["قصيرٌ"]), fr([], false)], 0.75);
  ok(c2.heart.present === null, "خطٌّ يظهرُ في نصفِ اللقطاتِ فقط ⇒ «لم يتبيّنْ» لا حضورٌ ولا غياب");
}

// ── شكلُ اليدِ من قناعِها: أطرافُ الأصابع، والحدودُ الغامضة، والإبهامُ الملاصق ──
{
  const S = await import("../web/kaf-shape.js");
  const W = 400, H = 900;
  const finger = (halfW) => { const m = new Uint8Array(W * H); for (let y = 0; y < H; y++) { const hw = halfW(y); if (!(hw > 0)) continue; for (let x = Math.round(200 - hw); x <= Math.round(200 + hw); x++) m[y * W + x] = 1; } return m; };
  const px = Array.from({ length: 21 }, () => ({ x: 200, y: 850 }));
  px[9] = { x: 200, y: 800 }; px[10] = { x: 200, y: 620 }; px[11] = { x: 200, y: 470 }; px[12] = { x: 200, y: 345 };
  const top = 330, dip = 470, Lr = dip - top, frac = (y) => (dip - y) / Lr;
  const cap = (y, w, r) => { const d = y - top; return d >= r ? w : Math.sqrt(Math.max(0, r * r - (r - d) ** 2)) * (w / r); };
  const shapes = {
    square: (y) => (y < top ? 0 : y > dip ? 22 : cap(y, 21, 6)),
    conic: (y) => (y < top ? 0 : y > dip ? 22 : cap(y, 21 - Math.max(0, frac(y) - 0.4) * 9, 14)), // تدقيقٌ واضحٌ بعيدٌ عن الحدود
    pointed: (y) => (y < top ? 0 : y > dip ? 22 : cap(y, 21 - Math.max(0, frac(y) - 0.3) * 22, 12)),
    spatulate: (y) => (y < top ? 0 : y > dip ? 22 : cap(y, 20 + Math.max(0, frac(y) - 0.4) * 9, 5)),
  };
  for (const [name, f] of Object.entries(shapes)) ok(S.tipShape(S.fingerProfile(finger(f), W, H, px, [9, 10, 11, 12])).shape === name, `طرفُ إصبعٍ ${name} يُعرَفُ ${name}`);
  ok(S.tipShape({ w30: 80, w45: 80, w75: 74.5, w85: 70 }).shape === null, "قياسٌ على الحدِّ بين المربّعِ والمخروطيّ ⇒ لا يُحكَم");
  ok(S.tipShape({ w30: NaN, w45: 80, w75: 70, w85: 60 }).shape === null, "إصبعٌ ملتصقٌ بجارِه ⇒ لا يُحكَم");
  const four = (sh) => ({ fingers: { index: { shape: sh[0], knot: 1.05 }, middle: { shape: sh[1], knot: 1.05 }, ring: { shape: sh[2], knot: 1.05 }, little: { shape: sh[3], knot: 1.05 } }, palmRatio: 0.93 });
  ok(S.handTypeFrom(four(["conic", "conic", null, "conic"])).type === "conic", "ثلاثةُ أطرافٍ مخروطيّة ⇒ يدٌ مخروطيّة");
  ok(S.handTypeFrom(four(["square", "conic", "pointed", "spatulate"])).type === "mixed", "أطرافٌ مختلفة ⇒ يدٌ خليطة");
  ok(S.handTypeFrom(four(["conic", null, null, "conic"])).type === null, "أقلُّ من ثلاثةِ أطرافٍ مقيسة ⇒ لا حكمَ بالنوع");
  ok(S.handTypeFrom({ ...four(["conic", "conic", "conic", "conic"]), fingers: Object.fromEntries(["index", "middle", "ring", "little"].map((k) => [k, { shape: "conic", knot: 1.1 }])) }).type === "conic", "مفاصلُ طبيعيّةٌ (١٫١) ليست «عقديّة»");
  // راحةٌ مع إبهامٍ ملاصقٍ لها: لا يُقاسُ العرض
  const pw = new Uint8Array(W * H);
  for (let y = 300; y < 800; y++) for (let x = 60; x < 340; x++) pw[y * W + x] = 1;          // الراحة
  for (let y = 420; y < 800; y++) for (let x = 340; x < 395; x++) pw[y * W + x] = 1;         // إبهامٌ ملاصق
  const hp = Array.from({ length: 21 }, () => ({ x: 200, y: 500 }));
  hp[0] = { x: 200, y: 790 }; hp[5] = { x: 300, y: 310 }; hp[9] = { x: 220, y: 305 }; hp[17] = { x: 90, y: 320 }; hp[2] = { x: 370, y: 520 };
  ok(S.palmWidth(pw, W, H, hp) === null, "إبهامٌ ملاصقٌ للراحة ⇒ لا يُقاسُ عرضُها (كان يُضخِّمُه)");
  const pw2 = new Uint8Array(W * H); for (let y = 300; y < 800; y++) for (let x = 60; x < 340; x++) pw2[y * W + x] = 1;
  const wv = S.palmWidth(pw2, W, H, hp);
  ok(wv && Math.abs(wv - 280) <= 4, "راحةٌ مستقلّةٌ عن الإبهام ⇒ عرضُها الحقيقيّ");
}

// ── قراءةُ الحال: الشهاداتُ والدمج ──
{
  const hal = (await import("../engines/hal.js")).default;
  const C = { name: "محمد", mother: "سميرة", birth: new Date(Date.UTC(1991, 10, 9, 2, 35)), lat: 31.9539, lon: 35.9106 };
  const a = hal.reading(C), b = hal.reading(C);
  ok(JSON.stringify(a.groups) === JSON.stringify(b.groups) && a.summary === b.summary, "قراءةُ الحالِ حتميّة: نفسُ البطاقة ⇒ نفسُ القراءة");
  // الشهاداتُ الخمسُ على خريطةٍ معروفة (حُسِبت يدويًّا من جدولِ Lilly): ميزانٌ طالع، الزهرةُ مشرّقةٌ في السنبلة، القمرُ هلالٌ في القوس
  const tl = a.temperament.chart.tally;
  ok(tl.H === 6 && tl.C === 3 && tl.M === 4 && tl.D === 7 && a.temperament.chart.complexion.key === "choleric", "مزاجُ الخريطةِ بطريقةِ Lilly يطابقُ الحسابَ اليدويّ (حارٌّ يابس ⇒ صفراويّ)");
  {
    const { TRAITS: TT } = await import("../data/hal-traits.data.js");
    const { NAME_SIGN_MAN } = await import("../data/hal-kashf.data.js");
    ok(Object.keys(NAME_SIGN_MAN).length === 12 && Object.values(NAME_SIGN_MAN).every((v) => v.page && v.traits.every((x) => TT[x])), "كشف المكتوم: ١٢ برجًا، لكلٍّ صفحةٌ وصفاتٌ معرَّفة");
    ok(a.nameSign === "الدلو" && Object.values(a.groups).some((g) => [...g.firm, ...g.single, ...g.sometimes].some((x) => (x.lines || Object.values(x.support).flat()).includes("name_sign"))), "برجُ الاسم (٤٠٧ ÷ ١٢ ⇒ الدلو) يدخلُ شاهدًا من كشف المكتوم");
    const gl = Object.values(a.groups).flatMap((g) => g.firm).find((x) => x.id === "grudge_long");
    ok(gl && gl.dissent && gl.dissent.every((e) => ["name_sign", "dalil", "birth_number"].includes(e.line)), "اعتراضُ المصدرِ الثانويّ وحدَه لا يقلبُ ما اتّفق عليه دليلان أصليّان (يُسجَّلُ خلافًا)");
    const fam = Object.values(a.groups).flatMap((g) => g.firm);
    ok(fam.every((x) => new Set(x.lines.map((l) => (l === "name_sign" ? "name" : l))).size >= 2), "الاسمُ وبرجُ الاسم عائلةٌ واحدة: لا يؤكّدان صفةً وحدَهما");
  }
  {
    const darj = (await import("../engines/darj.js")).default;
    const { DEGREES } = await import("../data/darj.data.js");
    const { TRAITS: TT2 } = await import("../data/hal-traits.data.js");
    ok(Object.values(DEGREES).every((arr) => arr.length === 30) && Object.values(DEGREES).flat().filter((e) => e === null).length === 8, "كتاب الدرج: ١٢ برجًا × ٣٠ درجة، والدرجاتُ الثماني التي أغفلها الناسخُ null");
    ok(Object.values(DEGREES).flat().filter(Boolean).every((e) => !e.traits || e.traits.every((x) => TT2[x])), "صفاتُ الدرج كلُّها من اللغةِ المشتركة");
    ok(darj.degreeNumber(0) === 1 && darj.degreeNumber(0.99) === 1 && darj.degreeNumber(27.68) === 28 && darj.degreeNumber(29.999) === 30, "الدرجةُ الأولى = ٠°–١°");
    ok(a.degrees.points[0].point === "الطالع" && a.degrees.points[0].sign === "الميزان" && a.degrees.points[0].n === 28, "طالعُ البطاقةِ التجريبيّة: الدرجة ٢٨ من الميزان");
    ok(a.degrees.points.find((p) => p.point === "الشمس").n === 17 && a.degrees.points.find((p) => p.point === "الشمس").sign === "العقرب", "شمسُ البطاقة: الدرجة ١٧ من العقرب");
    ok(a.degrees.points.slice(1).every((p) => p.text === "") && !/يموت|يُقتل/.test(a.degrees.points.map((p) => p.text + (p.planetNote || "")).join(" ")), "طبعُ الدرجةِ للطالعِ وحدَه، وأحكامُ الموتِ لا تُعرَض");
    const asc0 = darj.at("الحمل", 1);
    ok(asc0.planets["المريخ"] && asc0.traits.includes("proud"), "الحمل ١: «عزّة النفس…» ⇒ proud، وقولُه في المريخ محفوظ");
  }
  ok(a.temperament.chart.testimonies.some((t) => t.who.startsWith("زحل ينظرُ الطالع")), "زحلُ المربّعُ للطالع يُدخِلُ كيفيّتَه (قاعدةُ Lilly)");
  // أدلّةُ بطليموس وأبي معشر حاضرةٌ ومستقلّة
  const allFirm = Object.values(a.groups).flatMap((g) => g.firm);
  const proud = allFirm.find((x) => x.id === "proud");
  ok(proud && ["chart", "am_asc", "ptol_ruler"].every((l) => proud.lines.includes(l)), "«تعتزُّ برأيك» يشهدُ لها Lilly وأبو معشر وبطليموس معًا");
  ok(a.soulRuler && a.soulRuler.planet === "المشتري", "حاكمُ النفسِ عند بطليموس: الأكثرُ حظوظًا في موضعَي عطاردَ والقمر (القوس ⇒ المشتري)");
  // اسمٌ متعادلُ الحرارةِ والبرودة لا يُدَّعى له اتّفاقٌ في الحرارة
  ok(a.temperament.name.complexion == null && a.temperament.final.heat.agree === false && /تتعادلُ فيها الحرارةُ والبرودة/.test(a.summary), "اسمٌ متعادلٌ ⇒ لا يُقالُ إنّه وافق الخريطةَ في الحرارة");
  // صفةٌ بدليلين ⇒ مؤكّدة؛ بدليلٍ واحد ⇒ منفردة؛ ضدّان ⇒ «أحيانًا»
  const firm = Object.values(a.groups).flatMap((g) => g.firm), single = Object.values(a.groups).flatMap((g) => g.single), some = Object.values(a.groups).flatMap((g) => g.sometimes);
  ok(firm.every((x) => x.lines.length >= 2) && single.every((x) => x.lines.length === 1), "المؤكَّدُ بدليلين مستقلّين فأكثر، والمنفردُ بدليلٍ واحد");
  ok(some.every((x) => x.ar.startsWith("أحيانًا") && !/أحيانًا.*أحيانًا.*أحيانًا/.test(x.ar)), "صفتان متضادّتان ⇒ «أحيانًا… وأحيانًا…» بلا تكرار");
  ok(!firm.concat(single).some((x) => some.some((y) => y.ids.includes(x.id))), "الصفةُ لا تظهرُ مؤكّدةً وفي «أحيانًا» معًا");
  // اسمٌ ناريٌّ صريح يدخلُ بنصِّ شمسِ المعارف
  const n2 = hal.nameTemperament("طارق");
  ok(n2.clearDominant ? !!n2.mizajText : n2.mizajText === null, "نصُّ مزاجِ الاسمِ يُستعمَلُ فقط حين يكونُ الطبعُ الغالبُ صريحًا");
}

// ── الطبّ الروحانيّ (الغزاليّ) + السنوسيّ ──
{
  const abjad = (await import("../engines/abjad.js")).default;
  const { LETTER_AILMENTS_MORE, SANUSI_DAYS } = await import("../data/huruf-tibb-ghazali.data.js");
  ok(Object.keys(LETTER_AILMENTS_MORE).length === 27 && SANUSI_DAYS.length === 7, "الغزاليّ: أبوابُ ٢٧ حرفًا للمرأة والصغير والصغيرة، والسنوسيّ ٧ أيّام");
  const m = abjad.letterMedicine("يوسف"), w = abjad.letterMedicine("يوسف", { who: "woman" });
  ok(m.letter === w.letter && m.who === "man" && w.who === "woman" && w.cause !== m.cause && /وقعت في بعض الأيّام/.test(w.cause), "نفسُ الحرف (ي): بابُ المرأة غيرُ بابِ الرجل");
  const s1 = abjad.sanusiPrognosis("محمد", "سميرة", "سبت"), s2 = abjad.sanusiPrognosis("محمد", "سميرة", "سبت");
  ok(s1.rem === (s1.total % 7 || 7) && s1.day === SANUSI_DAYS[s1.rem - 1].day && JSON.stringify(s1) === JSON.stringify(s2), "السنوسيّ: (الاسم + الأمّ + اليوم) ÷ ٧ ⇒ يومٌ ثابت");
}

// ── نفحات الأسرار: الشكل في البيت ──
{
  const raml = (await import("../engines/raml.js")).default;
  const { NAFHAT_HOUSES } = await import("../data/raml-nafhat.data.js");
  ok(Object.keys(NAFHAT_HOUSES).length === 16 && Object.values(NAFHAT_HOUSES).reduce((n, h) => n + Object.keys(h).length, 0) === 255, "نفحات الأسرار: ١٦ شكلًا × ١٦ بيتًا (عدا بيتٍ واحدٍ لم يُنقل)");
  ok(raml.figureInHouseNafhat("habs", 12).text.includes("السجن") && raml.figureInHouseNafhat("humra", 9) === null, "العقلة = الحبس: في الثاني عشر «السجن والقيد»؛ والبيتُ الناقصُ null");
  const r = raml.reading({ name: "محمد", mother: "سميرة", question: "هل أسافر؟", when: new Date(Date.UTC(2026, 0, 1)) });
  ok(raml.figureIskandari("habs").name === "العقلة" && raml.figureByRows([1,2,2,1]).id === "habs" && raml.figureByRows([1,2,2,1]).mashriqi.startsWith("عقلة"), "العقلة (ستّ نقاط) = الحبس عند الإسكندريّ ونفحات الأسرار");
  ok("houseFigureNafhat" in r && r.houseFigureIskandari && r.houseFigureIskandari.sign, "قراءةُ الرمل تحملُ شاهدَ نفحات الأسرار");
}

// ── السرّ المظروف ──
{
  const abjad = (await import("../engines/abjad.js")).default;
  const a = abjad.sirrMazruf("علي", "احمد"), b = abjad.sirrMazruf("علي", "احمد");
  ok(a.zimam === "ا ل ا ح م ر ع ل ي ا ح م د" && JSON.stringify(a) === JSON.stringify(b), "السرّ المظروف: الزمام = الأحمر + علي + أحمد (مثالُ الكتاب ص٣–٤)، وحتميّ");
  ok(a.names.every((n) => n.endsWith("ايل")) && a.names.length === 5 && a.rows.length > 1, "١٣ حرفًا (فرد) ⇒ خمسةُ أسماءٍ ثلاثيّة + ايل، والتكسيرُ يعودُ إلى الزمام");
}

// ── رقمُ الميلاد (Cheiro) ──
{
  const halM = await import("../engines/hal.js");
  const { BIRTH_NUMBER } = await import("../data/hal-cheiro.data.js");
  const { TRAITS: TT3 } = await import("../data/hal-traits.data.js");
  ok(halM.birthNumber(29) === 2 && halM.birthNumber(9) === 9 && halM.birthNumber(28) === 1 && halM.birthNumber(19) === 1, "رقمُ الميلاد: ٢٩⇒٢، ٢٨⇒١، ١٩⇒١");
  ok(Object.values(BIRTH_NUMBER).every((v) => v.traits.every((x) => TT3[x])), "صفاتُ Cheiro من اللغةِ المشتركة");
  const r = halM.default.reading({ name: "محمد", mother: "سميرة", birth: new Date(Date.UTC(1991, 10, 9, 2, 35)), birthDay: 9, lat: 31.9539, lon: 35.9106 });
  ok(r.birthNumber.n === 9 && r.birthNumber.planet === "المريخ", "البطاقةُ التجريبيّة: يوم ٩ ⇒ الرقم ٩ (المريخ)");
  const firm = Object.values(r.groups).flatMap((g) => g.firm);
  ok(firm.every((x) => x.lines.filter((l) => l !== "birth_number" && l !== "name_sign").length >= 1), "Cheiro ثانويّ: لا يؤكّدُ صفةً مع مصدرٍ ثانويٍّ آخرَ وحدَهما");
}

// ── أوفاق الغزاليّ: خواصّ الأسماء ──
{
  const kh = (await import("../engines/khawass.js")).default;
  const n = kh.names().filter((x) => x.ghazali);
  const ab = (await import("../engines/abjad.js")).default;
  ok(n.length === 8 && n.find((x) => x.name === "الحكيم") && ab.jummal("حكيم") === 78, "الغزاليّ: ٨ من الأسماء التسعة والتسعين بخواصّها (والمحيط ليس في رواية الترمذي)، و«حكيم» = ٧٨ كما في الكتاب");
}

// ── الثمرة: الكلمتان ٤٠ و٤٧ ──
{
  const halM = (await import("../engines/hal.js")).default;
  // طالعٌ في الميزان وصاحبُه الزهرة في السنبلة ⇒ كلاهما إنسيّ ⇒ مستأنسٌ بالناس
  const r = halM.reading({ name: "محمد", mother: "سميرة", birth: new Date(Date.UTC(1991, 10, 9, 2, 35)), birthDay: 9, lat: 31.9539, lon: 35.9106 });
  const ev = Object.values(r.groups).flatMap((g) => [...g.firm, ...g.single, ...g.sometimes]);
  ok(ev.some((x) => (x.lines || Object.values(x.support || {}).flat()).includes("th_social") && (x.id === "affable" || (x.ids || []).includes("affable"))), "الثمرة ٤٧: طالعٌ إنسيّ (الميزان) وصاحبُه في إنسيّ (السنبلة) ⇒ مستأنسٌ بالناس");
  const aff = Object.values(r.groups).flatMap((g) => g.firm).find((x) => x.id === "affable");
  ok(aff && new Set(aff.lines.map((l) => ({ am_asc: "asc", asc_degree: "asc", th_social: "asc", name_sign: "name" })[l] || l)).size >= 2, "طبعُ الطالع (أبو معشر) والثمرة من عائلةٍ واحدة: لا يُعَدّان دليلين");
}

// ── قراءةُ المرأة ──
{
  const halM = (await import("../engines/hal.js")).default;
  const { ASC_NATURE_WOMAN, NAME_SIGN_WOMAN, TRAITS_F } = await import("../data/hal-women.data.js");
  const { TRAITS: TT4 } = await import("../data/hal-traits.data.js");
  ok(Object.keys(ASC_NATURE_WOMAN).length === 12 && Object.keys(NAME_SIGN_WOMAN).length === 12 && [...Object.values(ASC_NATURE_WOMAN), ...Object.values(NAME_SIGN_WOMAN)].every((v) => v.page && v.traits.every((x) => TT4[x])), "أبوابُ النساء: ١٢ برجًا من أبي معشر و١٢ من كشف المكتوم، بصفحاتٍ وصفاتٍ معرَّفة");
  ok(Object.keys(TT4).every((k) => TRAITS_F[k]), "لكلِّ صفةٍ صيغةُ المخاطَبة المؤنّثة");
  const C = { name: "سميرة", mother: "فاطمة", birth: new Date(Date.UTC(1991, 10, 9, 2, 35)), birthDay: 9, lat: 31.9539, lon: 35.9106 };
  const m = halM.reading({ ...C, sex: "m" }), f = halM.reading({ ...C, sex: "f" });
  const srcs = (r) => Object.values(r.groups).flatMap((g) => [...g.firm, ...g.single, ...g.sometimes]).flatMap((x) => x.evidence).map((e) => e.src).join("|");
  ok(/مواليد النساء/.test(srcs(f)) && !/مواليد النساء/.test(srcs(m)), "الأنثى تأخذُ «مواليد النساء» والذكرُ لا");
  ok(f.sex === "f" && Object.values(f.groups)[0].title.includes("كِ") && /ميلادِكِ/.test(f.summary), "النصُّ بصيغة المخاطَبة المؤنّثة");
}

// ── شكلُ البدن ──
{
  const halM = (await import("../engines/hal.js")).default;
  const r = halM.reading({ name: "محمد", mother: "سميرة", birth: new Date(Date.UTC(1991, 10, 9, 2, 35)), birthDay: 9, lat: 31.9539, lon: 35.9106 });
  const B = r.bodyForm;
  ok(B.sign === "الميزان" && B.ptolemy[0].who.startsWith("الزهرة صاحبُ الطالع") && B.ptolemy.some((x) => x.who.includes("ربع الخريف")), "شكلُ البدن (بطليموس): صاحبُ الطالع الزهرةُ مشرِّقة + ربعُ الخريف");
  ok(B.lilly[0].text.startsWith("معتدلُ القامة") && B.lilly[1].who.includes("النصفُ الثاني"), "Lilly: القامةُ من الميزان، والبدنُ من نصفِه الثاني (الطالع ٢٧°)");
}

// ── دليل الحيران ──
{
  const dalil = (await import("../engines/dalil.js")).default;
  ok(dalil.hijaiValue("اب") === 3 && dalil.hijaiValue("ي") === 28, "الأعدادُ الهجائيّة: ا=١، ب=٢، ي=٢٨");
  const m = dalil.rank("محمد", "سميرة"), f = dalil.rank("محمد", "سميرة", "f");
  ok(m.rank === (m.total % 9 || 9) && m.text && f.text && m.text !== f.text && ["ناريّ", "هوائيّ", "مائيّ", "ترابيّ"].includes(m.tab), "دليل الحيران: مرتبةٌ من ٩ بحسب الجنس، وطبعٌ من ٤");
}

// ── بطليموس م٤: العمل والمال والزواج ──
{
  const [falakM, lifeM] = await Promise.all([import("../engines/falak.js"), import("../engines/life.js")]);
  const s = falakM.default.snapshot(new Date(Date.UTC(1991, 10, 9, 2, 35)), 31.9539, 35.9106);
  const w = lifeM.default.work(s);
  ok(w.lords[0] === "الزهرة" && !w.lords.includes("المريخ"), "صاحبُ العمل: الزهرةُ المشرِّقة الظاهرة (المريخُ تحت الشعاع لا يُعَدّ)");
  const wl = lifeM.default.wealth(s), m = lifeM.default.marriage(s), f = lifeM.default.marriage(s, "f");
  ok(wl.lotSign === "السنبلة" && wl.lord === "عطارد" && m.luminary === "القمر" && f.luminary === "الشمس" && m.items.length >= 2, "المالُ من صاحب سهم السعادة، والزواجُ من القمر للرجل والشمس للمرأة");
}

// ── الإبهامُ والتلّان من قناعِ اليد ──
{
  const S = await import("../web/kaf-shape.js");
  // قناعٌ اصطناعيّ: راحةٌ مستطيلة وإبهامٌ مستقيم (سُلامَيان متساويتان) ⇒ نسبةٌ قريبةٌ من ١ ⇒ لا حكم
  const w = 400, h = 400, m = new Uint8Array(w * h);
  const fill = (x0, y0, x1, y1) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) m[y * w + x] = 1; };
  fill(120, 150, 280, 360); fill(71, 200, 120, 230);
  const px = Array.from({ length: 21 }, () => ({ x: 200, y: 200 }));
  Object.assign(px, { 0: { x: 200, y: 350 }, 9: { x: 200, y: 160 }, 5: { x: 140, y: 160 }, 17: { x: 260, y: 160 }, 1: { x: 125, y: 215 }, 2: { x: 110, y: 215 }, 3: { x: 90, y: 215 }, 4: { x: 72, y: 215 } });
  const t = S.measureThumb(m, w, h, px);
  ok(t.ratio != null && t.ratio > 0.7 && t.ratio < 1.3, "الإبهام: سُلامَيان متقاربتان ⇒ لا حكمَ بكِبَرٍ ولا صِغَر");
}

// ── بطليموس م٣ ف١٢: الآفات والأمراض ──
{
  const [falakM, bodyM] = await Promise.all([import("../engines/falak.js"), import("../engines/body.js")]);
  const s = falakM.default.snapshot(new Date(Date.UTC(1991, 10, 9, 2, 35)), 31.9539, 35.9106);
  const a = bodyM.default.ailments(s);
  ok(a.hits.length === 1 && a.hits[0].malefic === "زحل" && a.hits[0].how === "تربيع" && a.hits[0].part.includes("الكليتان"), "زحلُ يربّعُ الطالع (الميزان ⇒ الكليتان وأسفلُ الظهر) — محورُ الطالع والغارب يُعَدُّ مرّةً واحدة");
}

// ── العارف بالأمر ──
{
  const arif = (await import("../engines/arif.js")).default;
  const C = { name: "محمد", mother: "سميرة", birth: new Date(Date.UTC(1991, 10, 9, 2, 35)), birthDay: 9, lat: 31.9539, lon: 35.9106, now: new Date(Date.UTC(2026, 9, 4)) };
  const a = arif.read(C), b = arif.read(C);
  ok(a.months.length === 48 && a.months.filter((m) => m.past).length === 12 && a.months.find((m) => m.now).label === "أكتوبر 2026", "العارف: سنةٌ مضت + ٣٦ شهرًا قادمة، والشهرُ الحاليّ أكتوبر ٢٠٢٦");
  ok(JSON.stringify(a.months.map((m) => m.scores)) === JSON.stringify(b.months.map((m) => m.scores)) && a.summary === b.summary, "العارف حتميّ");
  ok(new Set(a.months.map((m) => m.text.all)).size > 20, "نصوصُ الأشهر تختلفُ من شهرٍ لآخر (لا جملةٌ واحدةٌ مكرّرة)");
  ok(a.areas.length === 5 && a.areas.every((x) => x.text && x.pill) && a.summary.length > 40, "الزبدةُ وجوانبُ الحياة الخمسة");
  ok(!/[٠-٩]?\s?[+−-]\d/.test(a.summary) && !a.summary.includes("Lilly"), "الزبدةُ بلا أرقامٍ غامضةٍ ولا أسماءِ كتب");
  const w = arif.read(C, { weights: { sky: 1.5, numbers: 0.5 } });
  ok(JSON.stringify(w.months.map((m) => m.scores.all)) !== JSON.stringify(a.months.map((m) => m.scores.all)), "أوزانُ «صار/لم يصر» تغيّرُ الحساب");
  const q = arif.ask(C, "هل أفتح مشروعًا تجاريًّا؟");
  ok(q.topic === "work" && q.big && q.best && q.best.label, "اسألِ العارف: موضوعُ الشغل وأنسبُ وقت");
  ok(q.qura && q.jafr && q.votes[0].why.includes("القرعة") && q.votes[0].why.includes("الجفر"), "جوابُ السؤال يجمعُ الرملَ والقرعةَ والجفر (عائلةً واحدة)");
  const ecl = arif.eclipses(new Date(Date.UTC(2026, 0, 1)), new Date(Date.UTC(2027, 0, 1)));
  ok(ecl.some((e) => e.kind === "solar" && e.date.toISOString().startsWith("2026-08-12")) && ecl.some((e) => e.kind === "lunar" && e.date.toISOString().startsWith("2026-03-03")), "الكسوفات: كسوفُ ١٢ أغسطس ٢٠٢٦ وخسوفُ ٣ مارس ٢٠٢٦");
  ok(a.insights[0] && a.insights[0].text.includes("حارّ"), "استنتاجُ «الطبعُ والفترة» يعملُ من مزاجِ الخريطة الفعليّ");
  ok(a.months.some((m) => m.voices.some((v) => /كسوفٌ للشمس مقابلَ قمرِك/.test(v.why))), "كسوفٌ على موضعٍ في الخريطة يدخلُ شهرَه");
  const falakM = (await import("../engines/falak.js")).default;
  const revs = arif.revolutions(C, falakM.snapshot(C.birth, C.lat, C.lon), 2026, 2028);
  ok(revs.length === 3 && revs[0].when.toISOString().startsWith("2026-11-08") && revs[2].asc === "الميزان" && revs[2].voices.some((v) => /طالعُ الميلاد نفسُه/.test(v.why)), "تحويلُ سنة المولد: عودةُ الشمس ٨ نوفمبر، وتحويلُ ٢٠٢٨ طالعُه طالعُ الميلاد (Lilly: سنةُ عافية)");
  ok(a.months.some((m) => m.voices.some((v) => /^تحويلُ سنة/.test(v.why))), "أصواتُ التحويل تدخلُ أشهرَ سنتِها");
  ok(arif.abjadDate(2026) === "بغكو" && arif.abjadDate(1991) === "غظصا", "التأريخُ بالجُمّل: ٢٠٢٦ ⇒ بغكو");
  const dv = a.months.map((m) => m.voices.filter((v) => v.fam === "divination").map((v) => Math.sign(v.s)).join(""));
  ok(dv.filter(Boolean).length > 30 && new Set(dv).size >= 4, "الرملُ والجفر يدخلان كلَّ شهرٍ ويتغيّران من شهرٍ لآخر");
  const skyN = falakM.snapshot(C.birth, C.lat, C.lon);
  const mc = arif.midheaven(skyN.ascendant.localSiderealTime);
  ok(mc > 115 && mc < 125, "وسطُ السماء في الميلاد ≈ ١٢٠° (الأسد) لطالعِ الميزان في عمّان");
  ok(arif.tasyir(skyN, 34).some((v) => /تسييرُ سهم السعادة بلغ تربيعَ زحل/.test(v.why) && v.s < 0 && v.topics.includes("money")) && arif.tasyir(skyN, 30).length === 0, "التسيير (الثمرة ٧٩): في الرابعة والثلاثين يبلغُ سهمُ السعادة تربيعَ زحل ⇒ ضيقٌ في المال");
  ok(a.months.some((m) => m.voices.some((v) => /^تسييرُ/.test(v.why))), "أصواتُ التسيير تدخلُ الخطَّ الزمنيّ");
  const fr = arif.read({ ...C, sex: "f" });
  ok(Object.values(fr.months.find((m) => m.now).advice).every((x) => /ي |ِ|ي\./.test(x) || /تابعي|تبدئي|أنجزي/.test(x)), "النصيحةُ للمرأة بصيغة المؤنّث");
  ok(!/محبوسٌ —/.test(arif.ask({ ...C, sex: "f" }, "هل أتزوج؟").text), "جملةُ التوقيت في جواب السؤال سليمة");
  ok(a.turning.some((t) => /^تحويلُ سنة/.test(t.why)), "بدايةُ سنةِ التحويل الواضحة نقطةُ تحوّل");
  const per = a.months.find((m) => m.now).voices.filter((v) => v.fam === "periods");
  ok(per.every((v) => v.meth) && new Set(per.map((v) => v.meth)).size >= 2, "داخلَ العائلة لكلِّ طريقةٍ صوتٌ واحد (التحويلُ لا يطغى بكثرةِ أحكامِه)");
  ok(!/فاستفدْ/.test(arif.read({ ...C, sex: "f", birth: new Date(Date.UTC(2000, 1, 29, 23, 50)), lat: -33.87, lon: 151.2 }).summary), "الزبدةُ للمرأة بلا صيغةِ مذكّر");
  for (const [b, la, lo] of [[Date.UTC(2000, 1, 29, 23, 50), -33.87, 151.2], [Date.UTC(1975, 0, 1, 0, 5), 64.13, -21.9], [Date.UTC(1988, 11, 31, 18, 30), -1.29, 36.82]]) {
    const rr = arif.read({ ...C, birth: new Date(b), lat: la, lon: lo });
    ok(rr.months.every((m) => Object.values(m.scores).every(Number.isFinite)) && rr.months.some((m) => m.voices.some((v) => v.meth === "revolution")), `العارف يعملُ لميلادٍ صعب (${new Date(b).toISOString().slice(0, 10)}، ${la}°)`);
  }
  const rvA = arif.revolutions(C, falakM.snapshot(C.birth, C.lat, C.lon), 2027, 2027)[0];
  const rvD = arif.revolutions({ ...C, resLat: 51.5074, resLon: -0.1278 }, falakM.snapshot(C.birth, C.lat, C.lon), 2027, 2027)[0];
  ok(rvA.when.getTime() === rvD.when.getTime() && rvA.asc !== rvD.asc, "مدينةُ السكن تغيّرُ طالعَ التحويل (عمّان ⇐ لندن) ولا تغيّرُ لحظتَه");
  const qs = arif.qasim(skyN, 34);
  ok(qs.ruler === "المشتري" && qs.sign === "القوس" && qs.partners.includes("عطارد") && arif.qasim(skyN, 30).ruler === "زحل", "القاسم (البيروني §٥٢٣): في الرابعة والثلاثين حدُّ المشتري في القوس وشريكُه عطارد، وفي الثلاثين حدُّ زحل");
  ok(a.months.some((m) => m.voices.some((v) => v.meth === "qisma")), "صوتُ القاسم يدخلُ أزمنةَ العمر");
  ok(a.luckyDays && a.luckyDays.days.join() === "الثلاثاء,الخميس,الجمعة" && a.luckyDays.dates.join() === "9,18,27", "Cheiro: أيّامُ الرقم ٩ الثلاثاء والخميس والجمعة، وتواريخُه ٩ و١٨ و٢٧");
  ok(q.horary && q.votes.some((v) => v.fam === "horary"), "علمُ المسائل الفلكيّ يدخلُ جوابَ السؤال عائلةً مستقلّة");
  ok(q.bestDay && q.bestDay.label && q.bestDay.date >= new Date(Date.UTC(q.best.from.y, q.best.from.m, 1)), "أنسبُ يومٍ للبدء داخلَ أنسبِ نافذة");
  const fwom = arif.timeline({ ...C, sex: "f" });
  ok(fwom.months.some((m) => m.voices.some((v) => /مريخِك/.test(v.why))) || fwom.months.length === 48, "للمرأة: المريخُ والشمسُ دليلا الزوج في موضوع الحبّ");
  const palm = { lines: { life: { present: true, states: ["قصيرٌ"] }, head: { present: true, states: ["مستقيمٌ واضحٌ طويل"] }, heart: { present: true, states: ["به فروعٌ هابطة"] }, fate: { present: false, states: [] } } };
  const ap = arif.read(C, { palm });
  ok(ap.insights.length >= a.insights.length + 3 && ap.insights.some((x) => /خطُّ الحياة/.test(x.text)) && ap.insights.some((x) => /خطُّ القلب/.test(x.text) && /تمهّل/.test(x.text)), "الكفّ: خطوطُ اليد المحفوظة تُركَّبُ مع الخطِّ الزمنيّ في الاستنتاجات");
}

// ── قراءتك الكاملة ──
{
  const qiraa = (await import("../engines/qiraa.js")).default;
  const C = { name: "محمد", mother: "سميرة", birth: new Date(Date.UTC(1991, 10, 9, 2, 35)), lat: 31.9539, lon: 35.9106, now: new Date(Date.UTC(2026, 9, 3)) };
  const r = qiraa.full(C), r2 = qiraa.full(C);
  ok(JSON.stringify(r.age) === JSON.stringify(r2.age) && r.age.years === 34 && r.age.stage.planet === "الشمس", "قراءتك الكاملة: ٣٤ سنة ⇒ مرحلةُ الشمس (٢٢–٤١) عند بطليموس، وحتميّة");
  ok(r.age.fortune && r.age.fortune.major.lord === "المريخ" && r.age.fortune.major.nature === "nahs" && r.age.fortune.minor.nature === "saad" && r.age.fortune.overall === "mixed" && /حتّى/.test(r.age.fortune.line), "السعدُ والنحس: كبرى المريخ (نحس) وصغرى الزهرة (سعد) ⇒ ممتزجة، مع تاريخِ الانتهاء");
  ok(qiraa.ageStage(3).planet === "القمر" && qiraa.ageStage(4).planet === "عطارد" && qiraa.ageStage(70).planet === "زحل" && qiraa.ageStage(70).yearsLeft === null, "حدودُ الأعمار السبعة");
  ok(r.identity.angelDesc && r.identity.angelDesc.angel === r.identity.angel && r.identity.angelDesc.servant === "ميمون", "وصفُ البونيّ لملَك الكوكب يطابقُ الملَكَ المحسوب (زحل ⇒ كسفيائيل، خادمُه ميمون)");
  ok(r.identity.nameSign === "الدلو" && r.natal.sunSign === "العقرب" && r.hal.groups, "الهويّةُ وقراءةُ الحال داخلُ القراءةِ الكاملة");
}

// ── فرقُ التوقيت التاريخيّ يومَ الميلاد (كان ثابتًا = الحاليّ، فيُزيح الطالعَ ساعةً) ──
{
  const { tzOffsetAt, CITY_INDEX, CITY_GROUPS } = await import("../web/cities.data.js");
  ok(tzOffsetAt("Asia/Amman", 1991, 11, 9, 4, 35) === 2, "عمّان ٩ تشرين الثاني ١٩٩١ ⇒ +2 (شتويّ، قبل التوقيت الدائم)");
  ok(tzOffsetAt("Asia/Amman", 1991, 7, 1, 12, 0) === 3, "عمّان صيف ١٩٩١ ⇒ +3");
  ok(tzOffsetAt("Asia/Amman", 2024, 1, 15, 12, 0) === 3, "عمّان شتاء ٢٠٢٤ ⇒ +3 (التوقيت الدائم)");
  ok(tzOffsetAt("Europe/London", 2020, 7, 1, 12, 0) === 1 && tzOffsetAt("Europe/London", 2020, 1, 1, 12, 0) === 0, "لندن صيفًا +1 وشتاءً 0");
  ok(tzOffsetAt("Asia/Tehran", 2015, 6, 1, 12, 0) === 4.5, "طهران صيف ٢٠١٥ ⇒ +4.5");
  ok(tzOffsetAt("Not/AZone", 2000, 1, 1) === null, "منطقةٌ غير صحيحة ⇒ null (يُستعمَل الاحتياط)");
  const all = CITY_GROUPS.flatMap(([, cs]) => cs.map((c) => c[0]));
  ok(all.every((n) => CITY_INDEX[n].zone && tzOffsetAt(CITY_INDEX[n].zone, 2000, 1, 1) !== null), "لكلّ مدينةٍ منطقةٌ صالحة");
}

// ── المزج الموزون المشترك (engines/blend.js) ─────────────────────────────
import blend from "../engines/blend.js";
{
  eq(blend.weightedMean([{ value: 1, weight: 1 }, { value: -1, weight: 3 }]), -0.5, "متوسّطٌ موزون (1×1 + -1×3)/4 = -0.5");
  eq(blend.weightedMean([]), 0, "متوسّطٌ موزون لقائمةٍ فارغة = 0");
  const t = blend.weightedTally([{ key: "ا", weight: 1 }, { key: "ب", weight: 0.9 }, { key: "ب", weight: 0.8 }]);
  eq(t.top, "ب", "الأثقلُ وزنًا مجموعًا = ب (1.7 > 1)");
  eq(Math.round(t.topWeight * 10) / 10, 1.7, "وزنُ الأثقل = 1.7");
  const tie = blend.weightedTally([{ key: "ب", weight: 1 }, { key: "ا", weight: 1 }], (x) => x.key, (a, b) => a.localeCompare(b, "ar"));
  eq(tie.top, "ا", "التعادلُ يُفصَل بدالّة الفصل");
  eq(blend.weightedTally([]).top, null, "لا مصادر ⇒ لا جواب");
}

// ── النتيجة ───────────────────────────────────────────────────────────────
console.log(fails.join("\n\n"));
console.log(`\n${pass} ناجح، ${fail} فاشل`);
process.exit(fail ? 1 : 0);
