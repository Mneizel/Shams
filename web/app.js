// web/app.js — واجهة شمس المعارف · المحرّك
// تستورد كلّ المحرّكات وتبني لوحةً لكلّ واحدة. تشغيلها: node tools/serve.js
import abjad from "../engines/abjad.js";
import awfaq from "../engines/awfaq.js";
import falak from "../engines/falak.js";
import ak from "../engines/asma-khuddam.js";
import jafr from "../engines/jafr.js";
import zairja from "../engines/zairja.js";
import talisman from "../engines/talisman.js";
import talNamed from "../engines/talisman-named.js";
import prediction from "../engines/prediction.js";
import taskhir from "../engines/taskhir.js";
import raml from "../engines/raml.js";
import corpus from "../engines/corpus.js";
import diagnosis from "../engines/diagnosis.js";
import { SYMPTOMS } from "../data/diagnosis.data.js";
import { ADJUSTMENT_RULES } from "../data/zairja-handasiya.data.js";
import { PLANETS as PLANETS_INFO } from "../data/falak.data.js";
import khawass from "../engines/khawass.js";
import art from "../engines/spirit-art.js";
import qura from "../engines/qura.js";
import debunk from "../engines/debunk.js";
import kaf from "../engines/kaf.js";
import spirits from "../data/spirits.data.js";
import { MANUAL } from "./manual.data.js";
import { QUESTION_GROUPS, QUESTIONS_WITH_TARGET } from "./questions.data.js";
import { CITY_GROUPS, CITY_INDEX } from "./cities.data.js";

// ── أدوات مساعدة ──────────────────────────────────────────────────────
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const AR = (n) => talisman.toArabicDigits(n);
function elem(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; }

const AR_MONTHS = ["كانون الثاني", "شباط", "آذار", "نيسان", "أيّار", "حزيران", "تمّوز", "آب", "أيلول", "تشرين الأوّل", "تشرين الثاني", "كانون الأوّل"];
const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function fmtDate(d) { return `${AR(d.getDate())} ${AR_MONTHS[d.getMonth()]} ${AR(d.getFullYear())}`; }
function fmtDateTime(d) { return `${AR_DAYS[d.getDay()]} ${fmtDate(d)}، الساعة ${AR(String(d.getHours()).padStart(2, "0"))}:${AR(String(d.getMinutes()).padStart(2, "0"))}`; }

function ctx() {
  const g = (id) => ($("#" + id)?.value || "").trim();
  const name = g("ctx-name"), mother = g("ctx-mother"), date = g("ctx-date"), city = g("ctx-city");
  const time = g("ctx-time") || "12:00";
  // إحداثيّاتٌ يدويّة (لمدينةٍ غير مُدرَجة): تَغلِب على المدينة المختارة إن مُلئت.
  const manualLat = parseFloat(g("ctx-lat")), manualLon = parseFloat(g("ctx-lon")), manualTz = parseFloat(g("ctx-tz"));
  const hasManualCoords = Number.isFinite(manualLat) && Number.isFinite(manualLon);
  const loc = hasManualCoords
    ? { lat: manualLat, lon: manualLon, tz: Number.isFinite(manualTz) ? manualTz : (CITY_INDEX[city]?.tz ?? 3) }
    : (CITY_INDEX[city] || { lat: 31.9539, lon: 35.9106, tz: 3 });
  // حساب الجُمّل مبنيٌّ على الحروف العربية فقط؛ اسمٌ بلا حرفٍ عربيٍّ واحد (لاتينيّ/أرقام/
  // رموز) يُسقَط صامتًا إلى صفرٍ في الحساب، فتظهر «هويّة» وهميّة لا معنى لها — هذا بالضبط
  // التدليس الذي يُمنَع؛ فنرفض المتابعة ونطلب الاسم بحروفٍ عربية بدل تلفيق قراءة.
  const nameOk = !name || !!abjad.normalize(name).trim();
  const motherOk = !mother || !!abjad.normalize(mother).trim();
  const filled = !!(name && mother && date && (city || hasManualCoords));
  const ready = filled && nameOk && motherOk;
  const question = g("ctx-question");
  const needsTarget = QUESTIONS_WITH_TARGET.includes(question);
  const targetName = g("ctx-target"), targetMother = g("ctx-target-mother");
  let birth = null;
  if (date) {
    const [y, mo, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    birth = new Date(Date.UTC(y, mo - 1, d, hh - Math.trunc(loc.tz), mm - Math.round((loc.tz % 1) * 60)));
  }
  const now = new Date();
  const placeLabel = city || (hasManualCoords ? `إحداثيّات ${AR(loc.lat.toFixed(2))}، ${AR(loc.lon.toFixed(2))}` : "");
  const subject = ready
    ? `عن: ${name} (اسم الأمّ: ${mother})، مواليد ${fmtDate(new Date(date + "T00:00:00"))} الساعة ${AR(time)} في ${placeLabel}. القراءة أُجريت اليوم ${fmtDate(now)}.`
    : "";
  return { name, mother, question, needsTarget, targetName, targetMother, city, when: birth || now, birth, now, date, time, lat: loc.lat, lon: loc.lon, tz: loc.tz, ready, filled, nameOk, motherOk, subject };
}

// شريط «عن مَن ومتى» يتصدّر كلّ نتيجة
function subjectBar(c) {
  return `<div class="subject">${esc(c.subject)}</div>`;
}
// بوّابة: لا تحسب قبل اكتمال البطاقة، ولا تحسب على اسمٍ لا يحوي حرفًا عربيًّا واحدًا
function gate(main) {
  const c = ctx();
  if (c.ready) return true;
  if (c.filled && (!c.nameOk || !c.motherOk)) {
    main.insertAdjacentHTML("beforeend",
      `<div class="warn" style="margin-top:1rem">${!c.nameOk ? "الاسم" : "اسم الأمّ"} في «بطاقتي» لا يحوي حرفًا عربيًّا واحدًا (حساب الجُمّل حرفيٌّ عربيّ). اكتبه بحروفٍ عربية — وإلّا فستكون القيمة صفرًا والنتيجةُ بلا معنى.</div>`);
    return false;
  }
  main.insertAdjacentHTML("beforeend",
    `<div class="warn" style="margin-top:1rem">هذه الأداة تحتاج <b>الاسم</b> و<b>اسم الأمّ</b> و<b>تاريخ الميلاد</b> في «بطاقتي» فوق. املأها ثمّ ارجع.</div>`);
  return false;
}

// «متى» — تحويل عبارة التوقيت المبهمة إلى تاريخٍ فعليّ (أو كشفِ أنها غير قابلةٍ للتكذيب)
function resolveTiming(phrase, now = new Date()) {
  const add = (days) => { const d = new Date(now); d.setDate(d.getDate() + days); return d; };
  const map = {
    "خلال أيامٍ معدودة": () => `أي قبل ${fmtDate(add(7))} تقريبًا`,
    "بعد نحوِ أسبوعين": () => `أي نحو ${fmtDate(add(14))}`,
    "خلال شهر": () => `أي قبل ${fmtDate(add(30))}`,
    "عند تحوّل القمر": () => `أي عند أوّل هلالٍ قادم (~${fmtDate(add(15))}) — صياغةٌ فضفاضة`,
    "بعد نحوِ أربعين يومًا": () => `أي نحو ${fmtDate(add(40))}`,
    "عند دخول فصلٍ جديد": () => `أي عند أقرب انقلابٍ/اعتدالٍ فصليّ — صياغةٌ فضفاضة`,
    "خلال شهرين": () => `أي قبل ${fmtDate(add(60))}`,
    "بعد رفعِ مانعٍ قائم": () => `⚠ لا تاريخ — مشروطةٌ بـ«زوال مانع» غامض، فلا يمكن تكذيبها. وهذا مقصود.`,
    "عند سفرٍ أو قدومِ غائب": () => `⚠ لا تاريخ — مشروطةٌ بحدثٍ قد لا يقع، فلا يمكن تكذيبها.`,
    "بعد ثلاثة أشهر": () => `أي نحو ${fmtDate(add(90))}`,
    "عند اجتماعِ أهلِ الشأن": () => `⚠ لا تاريخ — مشروطةٌ بـ«اجتماع» غامض، فلا يمكن تكذيبها.`,
    "قُربَ نهاية العام": () => `أي أواخر سنة ${AR(now.getFullYear())} (كانون الأوّل ${AR(now.getFullYear())})`
  };
  return (map[phrase] || (() => "—"))();
}

// أقربُ يومٍ باسمه + أوّل ساعةٍ لكوكبٍ فيه، بتاريخٍ ووقتٍ فعليَّين
function nextDayHourText(dayName, planet, lat, lon, from = new Date()) {
  const target = AR_DAYS.indexOf(dayName);
  if (target < 0) return dayName;
  const d = new Date(from);
  for (let i = 0; i < 8; i++) {
    if (d.getDay() === target && d > from) break;
    d.setDate(d.getDate() + 1);
  }
  try {
    const ph = falak.planetaryHoursForMoment(d, lat, lon);
    const h = ph.hours.find((x) => x.ruler === planet);
    if (h) {
      const s = new Date(h.start), e = new Date(h.end);
      return `${dayName} ${fmtDate(d)}، وساعةُ ${planet} فيه من ${AR(s.toTimeString().slice(0, 5))} إلى ${AR(e.toTimeString().slice(0, 5))}`;
    }
  } catch {}
  return `${dayName} ${fmtDate(d)} (ساعة ${planet})`;
}
const CTX_IDS = ["ctx-name", "ctx-mother", "ctx-question", "ctx-target", "ctx-target-mother", "ctx-date", "ctx-time", "ctx-city", "ctx-lat", "ctx-lon", "ctx-tz"];
function saveCtx() {
  const o = {};
  CTX_IDS.forEach((id) => { const el = $("#" + id); if (el) o[id] = el.value; });
  try { localStorage.setItem("smk-ctx", JSON.stringify(o)); } catch {}
}
function loadCtx() {
  try {
    const o = JSON.parse(localStorage.getItem("smk-ctx") || "{}");
    for (const k in o) if ($("#" + k)) $("#" + k).value = o[k];
  } catch {}
}

// بطاقة عامّة
function card({ title, k = "", body, basis, reveal, vs, cls = "" }) {
  return `<div class="card ${cls}">
    <h3><span>${esc(title)}</span><span style="display:flex;gap:.5rem;align-items:center">
      <span class="k">${esc(k)}</span>${vs ? `<button class="btn sm sec" data-vs>وجهًا لوجه</button>` : ""}</span></h3>

    <div class="normal">${body}
      ${basis ? `<div class="basis">الطريقة — ${esc(basis)}</div>` : ""}
      ${reveal ? `<div class="reveal">${esc(reveal)}</div>` : ""}
      ${(basis || reveal) ? `<div class="reveal-hint">فعّل «وضع الكشف» فوق لرؤية الطريقة والتفنيد</div>` : ""}
    </div>
    ${vs ? `<div class="vs"><div class="claim"><span class="lbl">ما يُقال للسائل</span>${vs[0]}</div><div class="fact"><span class="lbl">ما يجري فعليًّا</span>${esc(vs[1])}</div></div>` : ""}
  </div>`;
}

// صندوق شرح الأداة (من الكُتيب) — يظهر أعلى كلّ لوحة
function head(id, title) {
  const m = MANUAL.find((x) => x.title.includes(title) || x.id === id);
  const intro = m ? `<details class="intro">
    <summary>ما هذا العلم؟ وكيف يُعمَل؟</summary>
    <div class="body">
      <div class="row"><span class="tag">ما هو</span> ${esc(m.what)}</div>
      <div class="row"><span class="tag">المدخلات</span> ${esc(m.inputs)}</div>
      <div class="row"><span class="tag">قراءة الناتج</span> ${esc(m.output)}</div>
      ${m.debunk ? `<div class="row reveal" style="margin:0"><span class="tag">ملاحظةٌ نقديّة</span> ${esc(m.debunk)}</div>` : ""}
    </div></details>` : "";
  const grp = NAV.find(([, items]) => items.some(([i]) => i === id))?.[0];
  return `${grp ? `<div class="crumb">${esc(grp)}</div>` : ""}<h1>${esc(title)}</h1>${intro}`;
}
function wireCards(root) {
  root.querySelectorAll("[data-vs]").forEach((b) => (b.onclick = () => b.closest(".card").classList.toggle("debate")));
}
const traceText = (arr) => (arr || []).join("\n");

// عمليّةُ تسخيرٍ كاملة (خاتم + قسَم + قلم سرّي + عزيمة + يوم قمريّ + نقض + شروط) —
// تُستعمَل أينما ذُكر خادمٌ أو ملَكٌ مرتبطٌ بالاسم، لا في لوحة «التسخير» وحدها.
function taskhirOpFullHTML(op) {
  const todayStr = new Date().toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `<div class="grid wide">${card({
    title: `خطواتُ العمل: ${op.goal.label}`, k: op.target ? `بينك وبين ${op.target.name}` : "خاصٌّ بك",
    body: `<div class="kv">الغايةُ: <b>${esc(op.goal.intent)}</b>${op.target ? ` — بينك وبين <b>${esc(op.target.name)}</b> (${esc(op.target.note)})` : ""}.</div>
      ${op.goal.danger ? `<div class="warn">${esc(op.goal.danger)}</div>` : ""}

      <div class="kv" style="margin-top:.7rem;padding-top:.5rem;border-top:1px solid var(--line)"><b>١) قبل ما تبلش — تأكّد من هذا:</b></div>
      <ul class="kv" style="margin:.3rem 0">
        <li>${esc(op.conditions.items[0])}</li>
        <li>${esc(op.conditions.items[1])}</li>
        <li>${esc(op.conditions.items[2])}</li>
        <li>${esc(op.conditions.items[3])}</li>
        <li>${esc(op.conditions.items[5])} (البخور المقصود: <b>${esc(op.incense.text)}</b>، المذكور بالخطوة ٣ — يبقى مشتعلًا طَوَالَ الجلسة ولا تلتفت أو تتكلّم أثناءها).</li>
        <li>${esc(op.conditions.items[4])} (لو كرّرت العملَ عدّة أيّام كما بالخطوة ٥، حافظ على نفس ساعة اليوم في كلّ مرّة، ولو لم تكن نفس يوم الأسبوع المذكور بالخطوة ٣).</li>
        <li>اليوم القمريّ (اليوم ${esc(todayStr)}): محسوبٌ رقمُه <b>${AR(op.badDay.lunarDay)}</b> من ١ إلى ٣٠ (تقريبُ عدد الأيّام منذ آخر محاقٍ للقمر، لا يوم السنة ولا تاريخًا) ⇒ ${op.badDay.bad ? "<b class='warn'>رقمٌ منحوسٌ بالجدول — أجِّل العملَ ليومٍ آخر</b>" : "<b>غير منحوس، تقدر تبلش اليوم</b>"}.</li>
      </ul>
      <div class="warn">${esc(op.conditions.safety)}</div>
      ${op.incense.toxic ? `<div class="warn">⚠ ${esc(op.incense.warning)}</div>` : ""}

      <div class="kv" style="margin-top:.7rem;padding-top:.5rem;border-top:1px solid var(--line)"><b>٢) جهّز الخاتم</b> (يُرسَم على ورقةٍ أو معدنٍ وتحمله معك أو يوضع أمامك وقت العمل):</div>
      <div class="kv">توقيعُ الزوايا والأضلاع — جاهزٌ للطباعة، ومحتواه ثابتٌ بحسب الكوكب واسم خادمك المُشتقّ من بطاقتك (${esc(op.servantName)}) — لا يتغيّر بتغيّر نصّ حاجتك أو غايتك المحدَّدة (هذا طبيعيٌّ: هذا التوقيع هويّةُ الكوكب والخادم لا الطلب نفسه؛ الطلبُ مذكورٌ بنصّه في العزيمة أدناه):</div>
      ${talisman.svgCornerSeal(op.cornerSigning.cornersShort, op.cornerSigning.awtadWords).replace("<svg", '<svg class="seal big printable"')}
      <button class="btn sm sec printbtn" type="button">🖨️ اطبع هذا الختم / احفظه PDF</button>
      <div class="gloss" style="margin-top:.2rem">${esc(op.cornerSigning.note)}</div>
      <div class="kv" style="margin-top:.3rem">وبداخل هذا التوقيع، وفقا الكواكب (كوكبك واسمك) بالأرقام:</div>
      ${op.seal.planetKameaSvg.replace("<svg", '<svg class="seal big printable"')} ${op.seal.nameWafqSvg.replace("<svg", '<svg class="seal big printable"')}
      <button class="btn sm sec printbtn" type="button">🖨️ اطبع هذين الوفقين / احفظهما PDF</button>
      <div class="kv" style="margin-top:.3rem">اسمُ خادمك بقلمٍ سرّيّ (اختياريّ، يُكتَب على الخاتم نفسه بدل الكتابة العاديّة إن أردت التمويه): «${esc(op.secretScript.source)}» ← <span class="mono" style="font-size:1.15rem">${esc(op.secretScript.text)}</span><br>
        <span class="gloss">${esc(op.secretScript.note)} اعتبره تمويهًا شكليًّا لا مزيدَ قوّةٍ فيه، ويمكنك تجاهله والاكتفاء بالخطّ العاديّ.</span></div>

      <div class="kv" style="margin-top:.7rem;padding-top:.5rem;border-top:1px solid var(--line)"><b>٣) وقتُ العمل ومكانه:</b></div>
      <div class="kv">${(() => {
        if (!op.timing.chosenDate || !op.timing.hourWindow?.start) return `يوم <b>${esc(op.timing.day)}</b> (أقربُ يومٍ كذلك من الآن — تعذّر حسابُ تاريخه الفعليّ هنا)`;
        const d = new Date(op.timing.chosenDate);
        const hs = new Date(op.timing.hourWindow.start), he = new Date(op.timing.hourWindow.end);
        const dateStr = d.toLocaleDateString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const hsStr = hs.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
        const heStr = he.toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" });
        return `أقربُ يوم <b>${esc(op.timing.day)}</b> من الآن: <b>${esc(dateStr)}</b>، وساعةُ <b>${esc(op.timing.hourRuler)}</b> فيه تحديدًا من <b>${esc(hsStr)}</b> إلى <b>${esc(heStr)}</b> (ساعةٌ كوكبيّةٌ لا ساعةٌ عاديّة — تختلف حدودُها كلَّ يوم؛ هذا حسابُها الفعليُّ لهذا التاريخ بموقعك المسجَّل، لا تقريبًا).`;
      })()}
      وأنت متّجهٌ ناحية <b>${esc(op.place.direction)}</b>، لابسًا أو واضعًا قماشًا لونُه <b>${esc(op.garb)}</b>، وأحرِق البخور التالي طَوَالَ العمل: <b>${esc(op.incense.text)}</b>.</div>

      <div class="kv" style="margin-top:.7rem;padding-top:.5rem;border-top:1px solid var(--line)"><b>٤) اقرأ بصوتٍ خافتٍ (أو همسًا)، وأنت جالسٌ بوضعيّةِ الخطوة ٣ (نفسُ اليوم/الساعة/الجهة/اللون/البخور)، بهذا الترتيب:</b></div>
      <div class="kv" style="margin-top:.3rem">أوّلًا كرّر القسَم التالي <b>${AR(op.barhatiyya.repeat)}</b> مرّة:</div>
      <div class="kv mono" style="line-height:1.9">${op.barhatiyya.words.map(esc).join("، ")}${op.barhatiyya.dayWord ? `، ${esc(op.barhatiyya.dayWord)}` : ""}</div>
      <div class="gloss" style="margin-top:.2rem">بصراحة: ${esc(op.barhatiyya.note)}</div>
      <div class="kv" style="margin-top:.4rem">ثمّ اقرأ نصَّ العزيمة التالي كما هو (كلُّه كلامٌ يُقال، لا تفصيلَ عملٍ داخله):</div>
      <pre class="recite-text">${esc(op.azima)}</pre>
      <div class="kv" style="margin-top:.4rem">وأخيرًا، كرِّر طلبك (اسمَ حاجتك) <b>${AR(op.repetition.count)}</b> مرّة (${esc(op.repetition.basis)}).</div>

      <div class="kv" style="margin-top:.7rem;padding-top:.5rem;border-top:1px solid var(--line)"><b>٥) كرِّر الخطوتَين ٣ و٤ كاملتَين، مرّةً كلّ يوم، لمدّة <b style="color:var(--warn)">${AR(op.conditions.fastingDays)} أيّامٍ متتالية</b> (صائمًا فيها إن استطعت) — نفسُ الساعة من اليوم في كلّ مرّة، ولو اختلف يومُ الأسبوع.</b> راقب هل تظهر معك هذه العلامات المذكورة في الكتب (لا يقين بها، مجرّد ما يُنسَب تقليديًّا لبدء الاستجابة): ${esc(op.claimedSigns)}.</div>

      <div class="kv" style="margin-top:.7rem;padding-top:.5rem;border-top:1px solid var(--line)"><b>٦) إذا انتهت حاجتُك أو بدك توقف العمل:</b></div>
      <div class="kv">${esc(op.dismissal)}</div>
      <ol class="kv">${op.undo.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
      <div class="kv" style="font-style:italic">${esc(op.undo.note)}</div>
      ${op.nayranj ? `<div class="kv" style="margin-top:.7rem;padding-top:.5rem;border-top:1px solid var(--line)"><b>طريقةٌ بديلة (نيرنج «${esc(op.nayranj.title)}»)</b> — لو أردتَ تجربةَ هذا العمل بدل ما سبق: اصنع ${esc(op.nayranj.figure)}، اكتب عليه ${esc(op.nayranj.inscribe)}، افعل ${esc(op.nayranj.act)}، بمكان ${esc(op.nayranj.place)}، بتوقيت ${esc(op.nayranj.timing)} ومدّة ${esc(op.nayranj.duration)}. نقضُه: ${esc(op.nayranj.reverse)}.</div>` : ""}`,
    reveal: traceText(op.reveal) + (op.nayranj ? "\n\n" + traceText(op.nayranj.trace) : "")
  })}</div>`;
}

// ── القوائم ──────────────────────────────────────────────────────────
const PANELS = {}; // id -> render(main)
let CURRENT = "session"; // اللوحة الحالية (لإعادة البناء عند تغيير البطاقة)
// تنظيفُ اللوحةِ السابقة قبل عرضِ غيرها (مثلًا: إطفاءُ الكاميرا وإيقافُ حلقةِ التحليل
// عند مغادرةِ قراءةِ الكفّ — وإلّا تبقى الكاميرا شغّالةً بالخلفيّةِ وتستهلكُ المعالج).
let panelCleanup = null;
// ترتيبُ القائمة يتّبع ترتيبَ جلسةِ الروحانيّ الفعليّة: استقبالٌ وقراءةٌ شاملة ⇐ قراءةٌ حسّيّةٌ
// وفألٌ ⇐ أدواتُ الحسابِ التي تُستنبَطُ منها القراءة ⇐ الفلك ⇐ التشخيص إن لزم ⇐ العملُ والعلاج
// (الطلسمُ والاستخدامُ والاستعانة) ⇐ كشفُ الدجل (طبقةٌ نقديّةٌ أخيرة) ⇐ المرجع.
const NAV = [
  ["الاستقبال والقراءة الشاملة", [["session", "🕯 الجلسة الكاملة"], ["reading", "🜍 القراءة الفلكيّة"], ["compat", "⚭ التوافق بين شخصين"], ["diagnosis", "🩺 تشخيص الحالة"]]],
  ["القراءة الحسّيّة والفأل", [["kaf", "🖐 قراءة الكفّ"], ["qura", "🎲 القرعة والفأل"]]],
  ["أدوات الحساب والحروف", [["jummal", "🔢 حساب الجُمّل"], ["jafr", "🜚 الجفر"], ["zairja", "◎ الزايرجة"], ["raml", "⚄ علم الرمل"], ["awfaq", "▦ الأوفاق"]]],
  ["الفلك والطالع", [["falak", "🪐 الفلك والساعات"], ["asma", "👤 الأسماء والخدّام"]]],
  ["العمل والعلاج", [["talismans", "✒️ الطلاسم"], ["spirits", "👁 الأرواح والملوك"], ["taskhir", "🔥 التسخير والتصريف"], ["khawass", "📿 الخواصّ"]]],
  ["كشف الدجل", [["debunk", "🃏 ألعاب العرافة وحِيَلها"]]],
  ["المرجع", [["corpus", "📖 نصّ الكتاب"], ["manual", "📘 الكُتيب — دليل الاستخدام"], ["infoOnly", "📚 معلوماتٌ فقط (لا تُستخدَم)"]]]
];

// ── هيكل الواجهة: أيقونات، وصفٌ موجز، صفحاتُ الهيكل (الرئيسية/الأدوات/بطاقتي) ──
const ICON = { home: "home", tools: "grid", card: "user", session: "candle", reading: "astro", compat: "rings", diagnosis: "pulse", kaf: "hand", qura: "dice", jummal: "hash", jafr: "letter", zairja: "dial", raml: "raml", awfaq: "square", falak: "planet", asma: "person-star", talismans: "pen", spirits: "wings", taskhir: "flame", khawass: "beads", debunk: "mask", corpus: "book", manual: "guide", infoOnly: "info" };
const BRIEF = {
  session: "الأداةُ الأولى لأيّ سؤال: إجماعُ الجفر والزايرجة والفلك، وشاهدٌ من الرمل، وتوصيةُ عمل، ودعمٌ من الخواصّ.",
  reading: "كلُّ المحرّكات في «طالعٍ» واحد: هويّةُ الاسم، والكوكب، والمنزلة، والحالُ الفلكيّة.",
  compat: "يقيس التوافقَ بين شخصين من اسمَيهما واسمَي أمّيهما.",
  diagnosis: "يحاكي جلسةَ الراقي: أعراضٌ تختارها، وتشخيصٌ يُذكَر معه التفسيرُ العاديّ.",
  kaf: "قراءةُ شكلِ اليد والأصابع وخطوطِ الراحة — بالكاميرا أو يدويًّا — من كتب الكفّ.",
  qura: "قرعةُ الإمام جعفر الصادق: ثلاثُ رمياتٍ تفتح بابًا من أبوابها.",
  jummal: "قيمةُ أيّ نصٍّ عربيّ بحساب الجُمّل وطرقِه، وطبائعُ حروفه وكواكبُها.",
  jafr: "استخراجُ جوابِ سؤالٍ من حروفه بالبسط والتكسير ودوائر الحروف.",
  zairja: "آلةُ ابن خلدون والزايرجةُ الهندسيّة: من حروف السؤال إلى بيتٍ من الشعر.",
  raml: "يبني الطالعَ الرمليّ: الأمّهات والبنات والشهود والقاضي، ويحكم على البيت المسؤول عنه.",
  awfaq: "المربّعاتُ العدديّة وأوفاقُ الكواكب، ووفقُ الاسم بالتعمير.",
  falak: "الحالُ الفلكيّة لحظةَ الميلاد والآن: الطالع، والكواكب، والساعات، والأسهم.",
  asma: "من اسمك واسم أمّك: الملَك والروحانيّ والخادم ورتبةُ ما بك.",
  talismans: "الطلاسمُ المسمّاة، كلٌّ بشكله ووقته ومادّته من الكتاب.",
  spirits: "فهرسُ الملوك ورؤساء الملائكة وملائكة الكواكب، مع وصفٍ وختمٍ لكلٍّ.",
  taskhir: "يركّب «عملًا» كاملًا لغايةٍ ما: الخادم والوقت والبخور والعزيمة.",
  khawass: "كتالوجُ الأسماء الحسنى والآيات والأدعية والموادّ وخواصِّها.",
  debunk: "شرحٌ صريحٌ لحيلٍ شائعةٍ عند بعض العرّافين — طبقةٌ توعويّةٌ منفصلة.",
  corpus: "بحثٌ داخل نصّ «شمس المعارف الكبرى».",
  manual: "دليلُ استخدامِ كلّ أداة: ما هي، وماذا تُدخِل، وكيف تقرأ الناتج.",
  infoOnly: "معلوماتٌ للاطّلاع فقط لا تدخل في الحساب.",
};
const SHELL_PAGES = ["home", "tools", "card"];
const svgI = (n, cls = "") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const plainLabel = (label) => String(label).replace(/^[^\u0600-\u06FF]+/, "").trim();
const toolLabel = (id) => { for (const [, items] of NAV) for (const [i, l] of items) if (i === id) return plainLabel(l); return ""; };
const isAppMode = () => (window.innerWidth || 1200) <= 1024;
const appEl = () => $("#app");

function buildNav() {
  const nav = $("#nav");
  nav.innerHTML = "";
  const add = (id, label) => {
    const b = elem(`<button type="button" data-id="${id}">${svgI(ICON[id] || "info")}<span>${esc(label)}</span></button>`);
    b.onclick = () => route(id);
    nav.appendChild(b);
  };
  add("home", "الرئيسية"); add("tools", "كلّ الأدوات"); add("card", "بطاقتي");
  for (const [group, items] of NAV) {
    nav.insertAdjacentHTML("beforeend", `<div class="nav-group">${group}</div>`);
    for (const [id, label] of items) add(id, plainLabel(label));
  }
}
// شاشةُ «أكمِلْ بطاقتك»: تظهر بدل أيّ أداةٍ تحسب قبل اكتمال «بطاقتي».
function renderWelcome(main) {
  const c = ctx();
  const missing = [!c.name && "الاسم", !c.mother && "اسم الأمّ", !c.date && "تاريخ الميلاد", !c.city && "مدينة الميلاد"].filter(Boolean);
  const badLetters = c.filled && (!c.nameOk || !c.motherOk);
  main.innerHTML = `<div class="welcome">
    <svg class="bigseal" style="width:84px;height:84px" aria-hidden="true"><use href="#i-seal"/></svg>
    <h1>أكمِلْ بطاقتك أوّلًا</h1>
    <p class="kv">هذه الأداة تحسب من بياناتك: الاسم، واسم الأمّ، وتاريخ الميلاد، ومدينة الميلاد — بحروفٍ عربيّة. املأها مرّةً واحدة، ثمّ تعمل كلُّ الأدوات.</p>
    ${missing.length ? `<div class="warn">لا يزال ناقصًا: ${missing.join("، ")}.</div>` : ""}
    ${badLetters ? `<div class="warn">اكتبِ الاسمَ واسمَ الأمّ بحروفٍ عربيّة — الحسابُ حرفيٌّ عربيّ.</div>` : ""}
    <button class="btn" id="welcome-go" type="button">${svgI("edit")}أكمِلْ بطاقتي</button>
  </div>`;
  $("#welcome-go", main).onclick = () => route("card");
}
function toolTile(id) {
  return `<button type="button" class="tile" data-go="${id}"><div class="ti"><span>${svgI(ICON[id] || "info")}</span><h3>${esc(toolLabel(id))}</h3></div>
    <p>${esc(BRIEF[id] || "")}</p><div class="go">افتح الأداة ${svgI("arrow")}</div></button>`;
}
function wireTiles(root) { root.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => route(b.dataset.go))); }
function drawStars(canvas) {
  if (!canvas || !canvas.getContext) return;
  const r = canvas.getBoundingClientRect(), d = window.devicePixelRatio || 1;
  if (!r.width) return;
  canvas.width = r.width * d; canvas.height = r.height * d;
  const g = canvas.getContext("2d"); if (!g) return; g.scale(d, d);
  let s = 7; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 110; i++) { const x = rnd() * r.width, y = rnd() * r.height, a = .15 + rnd() * .55, z = rnd() < .08 ? 1.4 : .7; g.fillStyle = `rgba(232,198,127,${a})`; g.beginPath(); g.arc(x, y, z, 0, 7); g.fill(); }
}
const SHELL = {
  home(main) {
    const c = ctx();
    const have = [c.name, c.mother, c.date, c.city || (c.filled ? "x" : "")].filter(Boolean).length;
    const missing = [!c.name && "الاسم", !c.mother && "اسم الأمّ", !c.date && "تاريخ الميلاد", !c.city && "مدينة الميلاد"].filter(Boolean);
    const d = c.date ? new Date(c.date + "T00:00:00") : null;
    main.innerHTML = `
    <section class="hero"><canvas></canvas>
      <svg class="heroseal" aria-hidden="true"><use href="#i-seal"/></svg>
      <div><h1>شمس المعارف الكبرى</h1><div class="tagline">معرفةٌ قديمة… بأدواتٍ عصريّة</div>
        <p class="lead">اكتبْ بياناتك مرّةً في «بطاقتي»، واخترْ سؤالك، ثمّ افتحْ أيَّ أداةٍ من أدوات الكتاب — كلُّها تقرأ من بطاقتك.</p></div>
    </section>
    ${c.ready ? `<section class="card">
      <h3><span>بطاقتي مكتملة</span><span class="k">كلُّ الأدوات تحسب لهذا الشخص</span></h3>
      <div class="sum"><div class="who">${esc(c.name)} <span class="kv" style="font-size:.95rem">ابن/ة ${esc(c.mother)}</span></div>
        <div class="meta"><span>${svgI("cal")}${d ? `${AR(d.getDate())} ${AR_MONTHS[d.getMonth()]} ${AR(d.getFullYear())}` : ""}</span><span>${svgI("clock")}${AR(c.time)}</span><span>${svgI("pin")}${esc(c.city || "إحداثيّاتٌ يدويّة")}</span>
        <span>${svgI("q")}${c.question ? esc(c.question) : "لم يُختَر سؤال"}</span></div></div>
      <div class="form-foot"><button class="btn" type="button" data-go="session">${svgI("candle")}ابدأ الجلسة الكاملة</button><button class="btn ghost" type="button" data-go="card">${svgI("edit")}تعديل البطاقة</button></div>
    </section>` : `<section class="card">
      <h3><span>الخطوة الأولى: أكمِلْ بطاقتك</span><span class="k">${AR(have)} من ${AR(4)}</span></h3>
      <div class="progress" aria-hidden="true"><i style="width:${(have / 4) * 100}%"></i></div>
      <p class="kv" style="margin:.8rem 0 0">ناقص: ${missing.join("، ") || "اكتبِ الأسماء بحروفٍ عربيّة"}. تقدر تتصفّح الأدوات قبلها، لكنّ الحساب يحتاجها.</p>
      <div class="form-foot"><button class="btn" type="button" data-go="card">${svgI("edit")}أكمِلْ بطاقتي</button><button class="btn ghost" type="button" data-go="tools">تصفّحِ الأدوات</button></div>
    </section>`}
    <div class="sec-h"><h2>أدواتٌ تبدأ بها</h2><button type="button" data-go="tools">كلُّ الأدوات ←</button></div>
    <div class="tiles">${["session", "reading", "kaf", "jummal", "raml", "khawass"].map(toolTile).join("")}</div>`;
    wireTiles(main);
    const cv = main.querySelector("canvas");
    if (window.requestAnimationFrame) requestAnimationFrame(() => drawStars(cv));
  },
  tools(main) {
    const count = NAV.reduce((n, [, items]) => n + items.length, 0);
    main.innerHTML = `<div class="ph"><h1>كلُّ الأدوات</h1><p class="lead">${AR(count)} أداةً في ${AR(NAV.length)} مجموعات، مرتّبةً كما تسير الجلسة.</p></div>
      <div class="filter">${svgI("search")}<input id="tools-filter" type="search" placeholder="صفِّ الأدوات… (رمل، اسم، طلسم)" aria-label="تصفية الأدوات" autocomplete="off"></div>
      <div id="tools-list">${NAV.map(([g, items]) => `<section class="tgroup"><h2>${esc(g)}</h2><div class="tiles">${items.map(([id]) => toolTile(id)).join("")}</div></section>`).join("")}</div>
      <div id="tools-empty" class="state" hidden><svg class="bigseal" aria-hidden="true"><use href="#i-seal"/></svg><h3>لا أداةَ بهذا الاسم</h3><p>جرّبْ كلمةً أقصر، أو تصفّحِ المجموعات.</p></div>`;
    wireTiles(main);
    const f = $("#tools-filter", main);
    if (f) f.oninput = () => {
      const v = f.value.trim(); let any = 0;
      main.querySelectorAll("#tools-list .tgroup").forEach((g) => {
        let n = 0;
        g.querySelectorAll(".tile").forEach((el) => { const ok = !v || el.textContent.includes(v); el.hidden = !ok; n += ok ? 1 : 0; });
        g.hidden = !n; any += n;
      });
      const e = $("#tools-empty", main); if (e) e.hidden = !!any;
    };
  },
};
function pageTitle(id) {
  if (id === "home") return "شمس المعارف الكبرى";
  if (id === "tools") return "كلُّ الأدوات";
  if (id === "card") return "بطاقتي";
  return toolLabel(id) || "شمس المعارف الكبرى";
}
function updateChrome(id) {
  const t = $("#apptitle"); if (t) t.textContent = pageTitle(id);
  const app = appEl(); if (app) app.classList.toggle("inner", !SHELL_PAGES.includes(id));
  const tab = id === "home" || id === "card" ? id : "tools";
  document.querySelectorAll("#bnav [data-tab]").forEach((b) => (b.dataset.tab === tab ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
}

// ── لوحةُ السياق (سطحُ المكتب العريض): تتبدّل حسب الأداة، وكلُّ ما فيها محسوبٌ من بطاقتك ──
let _readingCache = { key: null, r: null };
function cachedReading(c) {
  const key = [c.name, c.mother, c.question, c.date, c.time, c.lat, c.lon].join("|");
  if (_readingCache.key !== key) {
    let r = null;
    try { r = prediction.reading({ name: c.name, mother: c.mother, question: c.question, when: c.birth, now: c.now, lat: c.lat, lon: c.lon }); } catch {}
    _readingCache = { key, r };
  }
  return _readingCache.r;
}
function decoBlock({ eb, glyph, name, small, desc, rows = [], src }) {
  return `<div class="eb">${esc(eb)}</div>
    <div class="sealbox"><svg aria-hidden="true"><use href="#i-seal"/></svg>${glyph ? `<span class="glyph">${esc(glyph)}</span>` : ""}</div>
    <div class="nm${small ? " sm" : ""}">${esc(name)}</div>
    ${desc ? `<p class="ds">${esc(desc)}</p>` : ""}
    ${rows.length ? `<dl class="rows">${rows.filter(([, v]) => v).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>` : ""}
    ${src ? `<div class="src">${svgI("book")} ${esc(src)}</div>` : ""}`;
}
function renderDeco() {
  const box = $("#deco");
  if (!box || !window.matchMedia || !window.matchMedia("(min-width:1280px)").matches) return;
  const id = CURRENT, c = ctx();
  const generic = () => decoBlock({ eb: NAV.find(([, items]) => items.some(([i]) => i === id))?.[0] || "شمس المعارف الكبرى", name: pageTitle(id), small: 1, desc: BRIEF[id] || "اخترْ أداةً لتظهر هنا تفاصيلُها." });
  if (!c.ready) {
    box.innerHTML = ["tools", "manual", "debunk", "corpus", "infoOnly"].includes(id) ? generic()
      : decoBlock({ eb: "لوحة السياق", name: "تظهر هنا روحانيّتُك", small: 1, desc: "بعد أن تُكمل «بطاقتي» تعرض هذه اللوحة ملَكَك وروحانيَّك وخادمَك وكوكبَك — وتتبدّل حسب الأداة المفتوحة." });
    return;
  }
  const r = cachedReading(c), I = r?.identity;
  if (!I) { box.innerHTML = generic(); return; }
  const who = `${c.name} ابن/ة ${c.mother}`;
  const f = r.fortune || {};
  let h;
  if (["home", "card", "asma", "spirits", "taskhir"].includes(id)) {
    h = decoBlock({ eb: "روحانيّةُ الاسم", glyph: AR(I.total), name: I.angel, desc: `الملَكُ الموكَّل باسم ${who}.`, rows: [["الروحانيّ", I.spirit], ["الخادم", I.servantName], ["الكوكب", I.planet], ["العنصر", I.element]], src: "من جُمّل الاسم واسم الأمّ" });
  } else if (id === "session" || id === "compat" || id === "diagnosis") {
    h = decoBlock({ eb: "صاحبُ السؤال", glyph: AR(I.total), name: who, small: 1, rows: [["الملَك", I.angel], ["الكوكب", I.planet], ["البرج", I.sign], ["المنزلة", I.mansion?.name], ["يومُه", f.luckyDay], ["ساعتُه", f.luckyHourRuler && "ساعة " + f.luckyHourRuler]], src: "محسوبٌ من بطاقتك" });
  } else if (id === "falak" || id === "reading") {
    h = decoBlock({ eb: "الكوكبُ الحاكم", name: I.planet, desc: I.planetDisposition || "", rows: [["البرج", I.sign], ["المنزلة", I.mansion && `${I.mansion.name} (${AR(I.mansion.number)})`], ["طبعُ المنزلة", I.mansion?.nature], ["يصلح فيها", I.mansion?.work]], src: "من الاسم واسم الأمّ" });
  } else if (id === "khawass") {
    const gt = GOAL_BY_TOPIC[r.answer?.topic] || GOAL_BY_TOPIC["عام"];
    let names = [];
    try { names = khawass.search(gt?.search || "").names.slice(0, 3); } catch {}
    h = names.length
      ? decoBlock({ eb: "اسمٌ يناسب سؤالك", name: names[0].name, desc: names[0].khassa, rows: names.slice(1).map((n) => [n.name, n.khassa]), src: `من كتب الخواصّ — موضوعُ سؤالك: ${r.answer?.topic || "عامّ"}` })
      : generic();
  } else if (id === "jummal" || id === "jafr" || id === "awfaq") {
    h = decoBlock({ eb: "قيمةُ اسمك", glyph: AR(I.nameValue), name: c.name, rows: [["اسم الأمّ", AR(I.motherValue)], ["المجموع", AR(I.total)], ["الطبعُ الغالب", I.dominantLetterNature], ["الكوكب", I.planet]], src: "بالجُمّل الكبير" });
  } else {
    h = generic();
  }
  box.innerHTML = h;
}

// ── الدرج والبحث (وضع التطبيق) ──
function closeDrawer() { appEl()?.classList.remove("drawer"); }
function route(id) {
  try { panelCleanup && panelCleanup(); } catch {}
  panelCleanup = null;
  try { closeSearch(); closeDrawer(); } catch {}
  const changed = id !== CURRENT;
  const ready = ctx().ready;
  document.body.classList.toggle("pre-intake", !ready);
  CURRENT = id;
  $("#nav .on")?.classList.remove("on");
  $(`#nav [data-id="${id}"]`)?.classList.add("on");
  try { updateChrome(id); } catch {}
  const main = $("#main");
  const mc = $("#mecard");
  if (mc) mc.hidden = id !== "card";
  const done = () => {
    try { renderDeco(); } catch {}
    if (changed) window.scrollTo(0, 0);
  };
  if (id === "card") {
    main.innerHTML = "";
    refreshMeHint();
    try { localStorage.setItem("smk-panel", id); } catch {}
    return done();
  }
  if (!ready && !SHELL_PAGES.includes(id)) { renderWelcome(main); return done(); }
  main.innerHTML = "";
  // حمايةٌ عامّة: خطأٌ غيرُ متوقَّعٍ داخلَ أيِّ لوحةٍ (حالةُ إدخالٍ نادرة لم تُختبَر) لا يجوزُ أن
  // يُجمِّدَ التطبيقَ كلَّه بشاشةٍ فارغةٍ صامتة — تُعرَضُ رسالةٌ واضحةٌ وتبقى بقيّةُ اللوحاتِ قابلةً للفتح.
  try {
    (SHELL[id] || PANELS[id] || (() => (main.innerHTML = `<h1>${id}</h1><p class="kv">قيد الإنشاء.</p>`)))(main);
  } catch (e) {
    main.innerHTML = `<div class="warn">تعذّر عرضُ هذا القسم بسبب خطأٍ غيرِ متوقَّع: ${esc(e.message || String(e))}<br>جرّبِ التبديلَ لقسمٍ آخرَ ثمّ العودةَ، أو أعِدْ تحميلَ الصفحة.</div>`;
  }
  try { wireCards(main); } catch {}
  try { localStorage.setItem("smk-panel", id); } catch {}
  done();
}
// رابطٌ فعليٌّ ينقلك للوحةٍ أخرى (بدل جملة "افتح كذا" النصّيّة التي لا تُكبَس) —
// id من مفاتيح NAV (session, taskhir, diagnosis...)، label النصّ الظاهر.
function navLink(id, label) {
  return `<a href="#" class="navref" data-nav="${esc(id)}">${esc(label)}</a>`;
}

// ═══════════════════════════ اللوحات ═══════════════════════════════════

// موضوعُ السؤال (زايرجة) ⇒ أنسبُ غايةٍ من قائمة التسخير + كلمةُ بحثٍ في الخواصّ
const GOAL_BY_TOPIC = {
  سحر: { goal: "شفاء", search: "سحر" },
  محبة: { goal: "محبة", search: "محبة" },
  صحة: { goal: "شفاء", search: "شفاء" },
  رزق: { goal: "رزق", search: "رزق" },
  سفر: { goal: "ردّ_غائب", search: "سفر" },
  قضية: { goal: "حجب", search: "نصر" },
  دراسة: { goal: "رزق", search: "فهم" },
  عام: { goal: "تسخير_خادم", search: "حاجة" },
};

// 0) الجلسة الكاملة — تُجمَع فيها كلُّ المحرّكات في قراءةٍ واحدةٍ متكاملة ──
PANELS.session = (main) => {
  main.innerHTML = `${head('session', 'الجلسة الكاملة')}`;
  if (!gate(main)) return;
  main.innerHTML += `<div id="sout"></div>`;
  const out = $("#sout", main);
  const run = () => {
    const c = ctx();
    let r;
    try { r = prediction.reading({ name: c.name, mother: c.mother, question: c.question, when: c.birth, now: c.now, lat: c.lat, lon: c.lon }); }
    catch (e) { out.innerHTML = `<div class="warn">تعذّر الحساب: ${esc(e.message)}</div>`; return; }
    const id = r.identity;

    // احسب كلَّ شيءٍ أوّلًا (بصمتٍ) لنضع «الخلاصة» في صدر الجلسة — القارئ المستعجل
    // يريد الجوابَ فورًا، والتفصيلُ بعده لمن أراد أن يعرف «لماذا».
    let topic = "عام", ramlR = null, agree = null;
    if (r.answer) {
      topic = r.answer.topic || "عام";
      try {
        ramlR = raml.reading({ name: c.name, mother: c.mother, question: c.question, when: c.now });
        const ramlPositive = /يتمّ|خيرٍ|سعيٍ/.test(ramlR.verdict) && !/لا يتمّ|محبوسٌ|متعسّرٌ/.test(ramlR.verdict);
        // المقارنةُ بنعم/لا لا تصحّ إلا لسؤالٍ بصيغة «هل» — غيرُها (لماذا/كيف/متى/ماذا) لا نعم/لا فيه أصلًا.
        const jzfPositive = r.answer.questionForm === "yesno" && r.answer.verdict.direction === "نعم";
        agree = (r.answer.questionForm !== "yesno" || r.answer.verdict.direction === "مستور") ? null : (ramlPositive === jzfPositive);
      } catch { /* لا سؤال أو خطأ في الرمل */ }
    }
    const gt = GOAL_BY_TOPIC[topic] || GOAL_BY_TOPIC["عام"];
    const GOALS_NEED_TARGET = ["محبة", "تفريق", "تهييج", "حجب", "أذى", "ردّ_غائب"];
    let op = null;
    try {
      op = taskhir.operation(gt.goal, {
        name: c.name, mother: c.mother, request: c.question || "قضاء الحاجة وتيسير الأمر", when: c.now, lat: c.lat, lon: c.lon,
        ...(GOALS_NEED_TARGET.includes(gt.goal) && c.targetName ? { targetName: c.targetName, targetMother: c.targetMother } : {})
      });
    } catch {}
    // شاهدُ توافقٍ حقيقيّ: إن كتب المستخدم اسم الطرف الآخر فعلًا نحسب توافقًا مبنيًّا على الاسمين معًا،
    // بدل أن يبقى جوابُ «هل هذا الشخص مناسبٌ لي» معتمدًا على اسمك وسؤالك وحدهما.
    let targetCompat = null;
    if (c.needsTarget && c.targetName) {
      try { targetCompat = ak.compatibility(c.name, c.mother, c.targetName, c.targetMother || ""); } catch {}
    }

    // ٠) الخلاصة أوّلًا — بطاقةٌ بارزةٌ مستقلّة، لا تضيع بين البطاقات
    let out1 = subjectBar(c);
    out1 += `<div class="card closing"><h3><span>الخلاصة</span></h3>
      <div class="normal"><div class="kv" style="font-size:1.05rem">${r.answer
        ? `مسألتُك «${esc(c.question)}»: الحكمُ <b>${esc(r.answer.verdict.direction)}</b> بإجماعٍ ${esc(r.answer.verdict.consensus)} بين الجفر والزايرجة وأحكام المسائل${agree === true ? "، ووافقه الرمل" : agree === false ? "، لكن خالفه الرملُ (فصّلنا الخلافَ أدناه)" : ""}.
          ${op ? ` والعملُ الأنسبُ: ${esc(op.goal.label)} يومَ ${esc(op.timing.day)}.` : ""}
          والتوقيتُ العامُّ اليومَ: ${esc(r.timing.todayVerdict)}.`
        : `أدخِل سؤالًا في «بطاقتي» لتحصل على جوابِ مسألةٍ وتوصيةِ عملٍ محدَّدة؛ هويّتُك وتوقيتُك اليوم أدناه على أيّ حال.`}</div></div>
      </div>`;

    // البطاقاتُ تُقسَم عمودَين: «main» الجوابُ وما يُبنى عليه مباشرةً، و«side»
    // هويّتُك ومرجعٌ داعم — ثمّ خطواتُ التسخير الكاملة (طويلةٌ) بعرضٍ كاملٍ أسفل الكلّ.
    let mainCards = "", sideCards = "", stepBlocks = "";

    // ١) الهويّة الروحانيّة الموجزة (عمود جانبي)
    sideCards += card({
      title: "مَن يُقرَأ له", k: `${esc(id.planet)} · ${esc(id.element)}`,
      body: `<div class="kv">كوكبُك <b>${esc(id.planet)}</b>، طبعُك <b>${esc(id.element)}</b>، خادمُك <b>${esc(id.servantName)}</b>.
        اليوم (${esc(fmtDate(c.now))}) ربُّه <b>${esc(r.skyNow.day.planet)}</b>، وحكمُه على طالعك: <b>${esc(r.timing.todayVerdict)}</b>.</div>`,
    });
    stepBlocks += `<h2>كيف تسخّر خادمَك العامّ هذا — العملُ كاملًا</h2>
      ${(() => { try { return taskhirOpFullHTML(taskhir.operation("تسخير_خادم", { name: c.name, mother: c.mother, when: c.now, lat: c.lat, lon: c.lon })); } catch (e) { return `<div class="warn">${esc(e.message)}</div>`; } })()}`;

    // ٢) جوابُ المسألة — إجماعُ ثلاث طرق (جفر + زايرجة + فلك المسائل) — عمود رئيسيّ
    if (r.answer) {
      mainCards += card({
        title: "جوابُ المسألة", k: `${esc(r.answer.verdict.direction)} · ${esc(r.answer.verdict.consensus)}`,
        body: `<div class="qline">مسألتُك: <b>«${esc(c.question)}»</b> (بابُها: ${esc(topic)})</div>
          <div class="big" style="font-size:1.1rem">${esc(r.answer.verdict.text)}</div>
          ${r.answer.timing ? `<div class="kv" style="margin-top:.3rem"><b>التوقيت:</b> ${esc(r.answer.timing)}.</div>` : ""}
          ${c.needsTarget ? (c.targetName
            ? `<div class="kv" style="margin-top:.4rem">هذا حكمٌ عامٌّ من اسمك وصياغة سؤالك (طريقةٌ في الاختيارات تعتمد لحظةَ السؤال)؛ وبطاقة «شاهدُ التوافق» أسفل هي الجزءُ المبنيُّ فعليًّا على اسمِ <b>${esc(c.targetName)}</b>.</div>`
            : `<div class="kv" style="margin-top:.4rem"><b>بصراحة:</b> هذا الحكمُ مبنيٌّ على اسمك وصياغة سؤالك فقط — ما دخل فيه اسمُ الشخص الآخر إطلاقًا لأنّك لم تكتبه. اكتب اسمه في «بطاقتي» ليظهر شاهدُ توافقٍ حقيقيّ مبنيٌّ على الاسمين معًا.</div>`) : ""}`,
      });
      if (targetCompat) {
        mainCards += card({
          title: `شاهدُ التوافق: أنت و${esc(targetCompat.b.name)}`, k: esc(targetCompat.verdict),
          body: `<div class="kv">طبعُك <b>${esc(targetCompat.a.element)}</b> (${esc(targetCompat.a.planet)}) وطبعُ <b>${esc(targetCompat.b.name)}</b> <b>${esc(targetCompat.b.element)}</b> (${esc(targetCompat.b.planet)}).</div>
            <div class="big" style="font-size:1.05rem;margin-top:.3rem">${esc(targetCompat.verdict)}</div>
            <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> هذا هو الجزءُ الوحيدُ بالجلسة المبنيّ فعليًّا على اسمَيكما معًا. لتفصيلٍ أوسع (نِسَب، طرقٌ متعدّدة) ${navLink("compat", "افتح «التوافق بين شخصين»")}.</div>`,
          basis: `(جُمّل «${esc(c.name)}» + جُمّل «${esc(c.targetName)}») mod 12 ⇒ الحكم؛ طريقةٌ متداولةٌ في تصاريف الأسماء.`,
        });
      }
      // ٣) شاهدٌ مستقلّ من علم الرمل (بذرةٌ مختلفةٌ كليًّا) — مقارنةٌ صادقة لا دمج
      if (ramlR) {
        sideCards += card({
          title: "شاهدٌ مستقلّ: علمُ الرمل", k: agree === null ? "—" : agree ? "يوافق" : "يخالف",
          body: `<div class="kv">شكلُ بيت المسألة (${esc(ramlR.house.name)}): <b>${esc(ramlR.house.figure.ar)}</b> — ${esc(ramlR.houseFigureMeaning)}<br>
            حكمُ الرمل: <b>${esc(ramlR.verdict)}</b><br>
            ${agree === null ? "الجفر/الزايرجة/الفلك أعطوا حكمًا مستورًا فلا مقارنةَ حاسمة." :
              agree ? "وهذا يوافقُ ما أعطته الطرقُ الثلاث آنفًا — توافُقٌ يقوّي الحكم." :
              "وهذا يخالفُ ما أعطته الطرقُ الثلاث آنفًا — تعارُضٌ بين الطرق، فالحيطةُ أولى من الجزم؛ والعاملُ الصادقُ يُقرّ بالاختلاف ولا يُخفيه."}</div>`,
          basis: "طريقةٌ مستقلّةٌ تمامًا (أمّهاتٌ من بذرةٍ مختلفة) — إن اتّفقت مع الجفر والزايرجة والفلك فتوافقُ صدفةٍ حسابيّة يُطمئنُّ إليه العُرفُ الروحانيّ؛ وإن خالفت فالصدقُ في ذكر الخلاف.",
        });
        // بيت المدفون (٤) إلى جانب بيت السحر (١٢) — إن كان السؤال عن شيءٍ مدفونٍ أو الدار
        if (ramlR.buriedHouse) {
          sideCards += card({
            title: "بيتُ المدفون والدار (الرمل)", k: esc(ramlR.buriedHouse.figure.ar),
            body: `<div class="kv">${esc(ramlR.buriedHouse.meaning)}</div>`,
            basis: ramlR.buriedHouse.note,
          });
        }
      }
      // بابُ السحر/العين/الجنّ لا يُجاب عليه باسمٍ وسؤالٍ فقط بصدق — الجوابُ الصادقُ
      // هنا هو: لا حسابَ يكشف حقيقةً ماديّة؛ الطريقةُ السليمةُ علاماتٌ فعليّةٌ تُلاحَظ.
      if (topic === "سحر") {
        const signs = SYMPTOMS.filter((s) => s.indicates.some((x) => x.startsWith("سحر") || ["مس", "عين", "حسد", "قرين"].includes(x))).slice(0, 6);
        mainCards += card({
          title: "بصراحة: كيف يُعرَف هذا فعلًا؟", k: "لا حسابَ يكشف حقيقةً ماديّة",
          body: `<div class="kv">حسابُ الاسم والسؤال أعلاه رمزيٌّ كسائر أبواب هذا البرنامج — لا يرى بيتك ولا يعرف هل دُفن فيه شيءٌ فعلًا. الطريقةُ التي تعتمدها كتب هذا العلم نفسِه للتحقّق هي <b>ملاحظةُ علاماتٍ فعليّة</b>، لا حسابُ حروف.</div>
            <div class="kv" style="margin-top:.5rem"><b>من العلامات التي يذكرها أهل هذا العلم</b> (ولكلٍّ منها تفسيرٌ آخر محتملٌ أيضًا — لا يقين إلا باجتماع عدّةٍ منها مع غيرها):</div>
            <ul class="kv" style="margin:.3rem 0">${signs.map((s) => `<li>${esc(s.text)} <span class="gloss">(وقد يكون سببُه: ${esc(s.mundane)})</span></li>`).join("")}</ul>
            <div class="kv" style="margin-top:.4rem">لتقييمٍ أدقّ بناءً على علاماتك أنت تحديدًا: ${navLink("diagnosis", "افتح لوحة «تشخيص الحالة»")}.</div>`,
        });
      }
    } else {
      mainCards += `<div class="card"><div class="kv">لم تُدخِل سؤالًا في «بطاقتي»، فلا جواب مسألةٍ ولا توصيةَ عملٍ محدَّدة — لكن هويّتَك وتوقيتَك أعلاه ثابتان.</div></div>`;
    }

    // ٤) التوصية — عملٌ روحانيٌّ مناسبٌ للموضوع، مبنيٌّ على اسمك وسؤالك
    if (op) {
      mainCards += card({
        title: `التوصية: ${esc(op.goal.label)}`, k: `يوم ${esc(op.timing.day)}`,
        body: `<div class="kv">أنسبُ عملٍ لموضوعِك: <b>${esc(op.goal.intent)}</b>${op.target ? ` — بينك وبين <b>${esc(op.target.name)}</b>` : ""}.<br>
          يُقصَدُ الخادمُ <b>${esc(op.servantName)}</b> بإذنِ المَلِك <b>${esc(op.king?.name || "—")}</b> يومَ <b>${esc(op.timing.day)}</b> في ساعة <b>${esc(op.timing.hourRuler)}</b>، والجهةُ <b>${esc(op.place.direction)}</b> واللون <b>${esc(op.garb)}</b>.<br>
          التكرارُ <b>${AR(op.repetition.count)}</b> مرّة (${esc(op.repetition.basis)}).</div>
          ${op.incense.toxic ? `<div class="warn">⚠ ${esc(op.incense.warning)}</div>` : ""}
          ${GOALS_NEED_TARGET.includes(gt.goal) && !op.target ? `<div class="kv" style="margin-top:.4rem"><b>بصراحة:</b> هذا العملُ نوعُه يُقصَد به عادةً طرفٌ آخر معيَّن، وأنت لم تكتب اسمَه — فالخاتمُ والعزيمةُ أدناه باسمك وحدَك، لا بينك وبين أحد. اكتب اسمه في «بطاقتي» ليُدمَج فعليًّا.</div>` : ""}`,
        reveal: `اختيرت الغايةُ "${gt.goal}" من موضوع السؤال ("${topic}" ⇒ جدول GOAL_BY_TOPIC) لا من تفصيل السؤال نفسه.`,
      });
      stepBlocks += `<h2>عملُ التوصية كاملًا: ${esc(op.goal.label)}</h2>${taskhirOpFullHTML(op)}`;
    }

    // ٥) دعمٌ من كتب الخواصّ — آيةٌ أو اسمٌ أو دعاءٌ يوافق الموضوع (عمود جانبي)
    let kh = khawass.search(gt.search);
    if (!kh.ayat.length && !kh.adiya.length && !kh.names.length) kh = khawass.search("حاجة");
    const bestAyah = kh.ayat[0], bestDua = kh.adiya[0], bestName = kh.names[0];
    if (bestAyah || bestDua || bestName) {
      sideCards += card({
        title: "دعمٌ من كتب الخواصّ", k: esc(gt.search),
        body: `<div class="kv">
          ${bestAyah ? `<b>آية:</b> ﴿آية من ${esc(bestAyah.ref)}﴾ — تُستعمَل في: ${esc(bestAyah.uses)}. <span class="gloss">اقرأها بذاتها (راجع مصحفًا لنصّها) عند حاجتك، أو ضمن ورد.</span><br>` : ""}
          ${bestDua ? `<b>دعاء «${esc(bestDua.name)}»</b> (نسبتُه: ${esc(bestDua.attrib)}) — غرضُه: ${esc(bestDua.purpose)}.<br>
            <span class="gloss">شو هو بالضبط: ${esc(bestDua.structure)}</span><br>` : ""}
          ${bestName ? `<b>اسمٌ من أسماء الله:</b> «${esc(bestName.name)}» — لجلب: ${esc(bestName.khassa)}. <span class="gloss">يُذكَر مفردًا عددًا معيّنًا (${navLink("khawass", "راجع «الخواصّ»")} للعدد التقليديّ) أو يُدمَج بخاتمٍ.</span>` : ""}
          </div>`,
      });
    }

    // ٦) قراءةُ الكفّ وتشخيصُ الحالة — اختياريّان تمامًا (عمود جانبي): تُعرَضان فقط إن كان
    // المستخدم قد أجراهما بنفسه من قبل في لوحتيهما؛ لا طلبَ ولا إلزامَ هنا.
    try {
      const savedKaf = JSON.parse(localStorage.getItem("smk-last-kaf") || "null");
      if (savedKaf) {
        sideCards += card({
          title: "من قراءة كفّك المحفوظة", k: esc(savedKaf.hand || ""),
          body: `<div class="kv">آخر قراءةٍ سجّلتَها: <b>${esc(savedKaf.firstTitle || "—")}</b> (${AR(savedKaf.sectionsCount || 0)} بابًا بالمجمل).<br>
            <button class="btn sm sec" id="session-open-kaf">افتحِ التفصيلَ الكامل</button></div>`,
        });
      }
    } catch {}
    try {
      const savedDiag = JSON.parse(localStorage.getItem("smk-last-diagnosis") || "null");
      if (savedDiag) {
        sideCards += card({
          title: "من تشخيصك المحفوظ", k: esc(savedDiag.label || ""),
          body: `<div class="kv">${esc(savedDiag.support || "")}<br>
            <button class="btn sm sec" id="session-open-diag">افتحِ التفصيلَ الكامل</button></div>`,
        });
      }
    } catch {}

    const cards = `<div class="split">
      <div class="main"><div class="col-head">الجوابُ والعمل</div>${mainCards}</div>
      <div class="side"><div class="col-head">هويّتُك ومرجعٌ داعم</div>${sideCards}</div>
    </div>
    ${stepBlocks}`;
    out.innerHTML = out1 + cards;
    wireCards(main);
    $("#session-open-kaf", main)?.addEventListener("click", () => route("kaf"));
    $("#session-open-diag", main)?.addEventListener("click", () => route("diagnosis"));
  };
  run();
};

// 1) القراءة الفلكيّة ───────────────────────────────────────────────────
PANELS.reading = (main) => {
  main.innerHTML = `${head('reading', 'القراءة الفلكيّة')}`;
  if (!gate(main)) return;
  main.innerHTML += `<div class="form"><button class="btn" id="go">حلِّل الطالع كاملًا</button>
      <button class="btn sec" id="go2">اعرض «وجهًا لوجه» للكلّ</button></div>
    <div id="out"></div>`;
  const out = $("#out", main);
  const run = () => {
    const c = ctx();
    let r;
    try { r = prediction.reading({ name: c.name, mother: c.mother, question: c.question, when: c.birth, now: c.now, lat: c.lat, lon: c.lon }); }
    catch (e) { out.innerHTML = `<div class="warn">تعذّر الحساب: ${esc(e.message)}</div>`; return; }
    const id = r.identity, sky = r.sky;
    const timingResolved = resolveTiming(r.fortune.timing, c.now);
    const bestDayText = nextDayHourText(r.timing.bestDay, r.timing.bestHourRuler, c.lat, c.lon, c.now);
    const mansionName = id.mansion.name;
    out.innerHTML = subjectBar(c) + `
      <div class="grid wide">
      ${card({
        title: "هويّةُ الاسم", k: `${esc(id.planet)} · ${esc(id.element)}`,
        body: `<div class="big">${esc(id.planet)}</div>
          <div class="kv">اسمُك واسمُ أمّك يقعان تحت حُكمِ <b>${esc(id.planet)}</b>، وطبعُك <b>${esc(id.element)}</b>، وبرجُك <b>${esc(id.sign)}</b>، ومنزلتُك من منازل القمر <b>${esc(mansionName)}</b>.<br>
          مَلَكُ اسمِك <b>${esc(id.angel || "—")}</b>، وخادمُك المُوكَّل <b>${esc(id.servantName)}</b>.</div>
          <div class="kv" style="margin-top:.4rem"><b>ما فائدة هذا؟</b> هذه هويّتُك التي تُبنى عليها بقيّةُ البطاقاتِ أدناه (التوقيتُ المناسب، النبوءة، طلسمُ اسمك).</div>`,
        basis: `جُمّل «${esc(c.name)}» + جُمّل «${esc(c.mother)}» = ${AR(id.total)}؛ ثمّ إسقاطٌ بـ٧ (الكوكب) و٤ (العنصر) و١٢ (البرج) و٢٨ (المنزلة).`,
        reveal: traceText(r.reveal.slice(0, 11)) + "\n\nالكوكبُ والطبعُ والمنزلةُ اختِيرت من رقمٍ واحد (٤٥٦…)؛ أيُّ اسمٍ مجموعُه نفسُه يُخرِج النتيجةَ نفسَها. لا صلةَ لها بك.",
        vs: [`«اسمُك يحكمه ${esc(id.planet)}، وطبعُك ${esc(id.element)}، وخادمُك ${esc(id.servantName)}.»`,
          `${AR(id.total)} = جُمّل الاسم + جُمّل الأمّ\n${AR(id.total)} mod 7 → جدول الكواكب → «${id.planet}»\nأيّ شخصٍ مجموع اسمه ${AR(id.total)} يخرج له نفس الشيء.`]
      })}
      </div>
      <h2>كيف تسخّر مَلَكَك وخادمَك — العملُ كاملًا</h2>
      ${(() => { try { return taskhirOpFullHTML(taskhir.operation("تسخير_خادم", { name: c.name, mother: c.mother, when: c.now, lat: c.lat, lon: c.lon })); } catch (e) { return `<div class="warn">${esc(e.message)}</div>`; } })()}
      <div class="grid wide">
      ${card({
        title: "التوقيتُ المختار", k: esc(r.timing.todayVerdict),
        body: `<div class="kv">حكمُ اليوم على طالعك: <b>${esc(r.timing.todayVerdict)}</b>.<br>
          وأفضلُ وقتٍ لمهمّاتك ومطالبك:<br><b>${esc(bestDayText)}</b><br>
          وهو أقربُ ${esc(r.timing.bestDay)} من اليوم (${fmtDate(c.now)})، وفيه أوّلُ ساعةٍ يحكمها ${esc(r.timing.bestHourRuler)} كوكبُ اسمك.</div>`,
        basis: `كوكبُ الاسم «${esc(id.planet)}» (من الرقم ${AR(id.total)}) ويومُه «${esc(r.timing.bestDay)}»، ثمّ حسابُ ساعاته الكوكبيّة لأقرب تاريخ.`,
        reveal: `planetMatch("${id.planet}", رب اليوم) ⇒ نفس/موافق/مخالف\nيوم الكوكب وساعته من جداول ثابتة. لا أثرَ للوقت في الحدث؛ الأثرُ في اعتقاد العامل.`
      })}
      ${card({
        title: "النبوءة", k: `${esc(id.planet)} · ${esc(id.element)}`,
        body: `<div class="kv" style="font-size:1.03rem">«${esc(r.fortune.byPlanet)}»</div>
          <div class="kv" style="margin-top:.6rem;font-size:1.03rem">«${esc(r.fortune.byElement)}»</div>
          <div class="kv" style="margin-top:.6rem"><b>الوقت:</b> «${esc(r.fortune.timing)}» — أي نحوَ ${esc(timingResolved)}.</div>
          <div class="kv" style="margin-top:.6rem"><b>ما يُوافق منزلتَك «${esc(mansionName)}» من الأعمال:</b> ${esc(r.fortune.suitableWorks)}</div>`,
        basis: `الرقم ${AR(id.total)}: إسقاطٌ بـ٧ (نصّ الكوكب)، بـ٤ (نصّ العنصر)، بـ١٢ = ${AR(id.total % 12 || 12)} (عبارة التوقيت رقم ${AR(id.total % 12 || 12)} من ١٢).`,
        reveal: `BY_PLANET["${id.planet}"] + BY_ELEMENT["${id.element}"] + TIMING_BY_SIGN[${AR(id.total % 12)}]\nثلاثةُ انتقاءاتٍ من جداولَ ثابتة، عامّةٌ تنطبق على أيّ أحد. نفسُ الاسم ⇒ نفسُ النبوءة حرفيًّا أبدًا.`,
        vs: [`«الغيبُ يقول لك: ${esc(r.fortune.timing)}…»`, `TIMING_BY_SIGN[ ${AR(id.total)} mod 12 = ${AR(id.total % 12)} ] = هذه العبارة.\nالمحلولة: ${esc(timingResolved)}`]
      })}
      ${r.answer ? card({
        title: "جوابُ المسألة", k: `${esc(r.answer.verdict.direction)} · ثقة ${AR(r.answer.verdict.confidence)}٪`,
        body: `<div class="qline">مسألتُك: <b>«${esc(c.question)}»</b> (${esc(r.answer.topic)})</div>
          <div class="big" style="font-size:1.12rem">${esc(r.answer.verdict.text)}</div>
          ${r.answer.timing ? `<div class="kv" style="margin-top:.4rem"><b>التوقيت:</b> ${esc(r.answer.timing)}.</div>` : ""}
          <div class="kv" style="margin-top:.6rem"><b>ما قالته كلُّ طريقة</b> (توافُقُها: <b>${esc(r.answer.verdict.consensus)}</b>):</div>
          <ul class="kv" style="margin:.3rem 0">${r.answer.methods.map((m) => `<li><b>${esc(m.name)}</b> — يميلُ إلى «${esc(m.lean)}»: ${esc(m.say)}</li>`).join("")}</ul>
          ${r.answer.verdict.dissent && r.answer.verdict.dissent.length ? `<div class="kv" style="margin-top:.3rem">المخالِف: ${r.answer.verdict.dissent.map(esc).join("، ")}.</div>` : ""}
          <div class="kv" style="margin-top:.5rem"><b>ماذا تفعل بهذا؟</b> اعتمِد الحكمَ الكبيرَ أعلاه جوابًا؛ لتوصيةِ عملٍ فعليّةٍ مبنيّةٍ على موضوع سؤالك، ${navLink("session", "افتح «الجلسة الكاملة»")}.</div>`,
        basis: `ثلاثُ طرقٍ مستقلّة: الجفر (إسقاطُ جُمّلِ السؤال ٢٨/٤ ⇒ حرف ⇒ باب)، الزايرجة (مخرَجٌ حرفيّ + شطرٌ من قائمة)، وأحكامُ المسائل الفلكيّة على طالعِ لحظةِ السؤال. تُجمَع أصواتُها ⇒ حكمٌ واحدٌ وثقة.`,
        reveal: traceText((r.reveal || []).filter((l) => l.startsWith("جفر:") || l.startsWith("زايرجة:") || l.startsWith("فلك:") || l.startsWith("موضوع") || l.startsWith("التوفيق") || l.startsWith("لا رابط")))
          + "\n\nلا رابطَ سببيًّا بين الطرق؛ توافقُها (أو تعارُضُها) صدفةٌ لا دليل.",
        vs: [`«الحكمُ: ${esc(r.answer.verdict.text)}»`,
          `ثلاثُ دوالَّ حتميّةٍ منفصلة أُدخِل فيها اسمُك وسؤالُك ⇒ ${esc(r.answer.verdict.consensus)} ⇒ «${esc(r.answer.verdict.direction)}». غيّرْ حرفًا من السؤال يتغيّرْ كلُّ شيء.`]
      }) : `<div class="card"><div class="kv">اختر سؤالًا من «بطاقتي» ليظهر جوابُ المسألة.</div></div>`}
      ${card({
        title: "طلسمُ الاسم", k: `وفق رتبة ${AR(r.talismans.nameWafqOrder)}`,
        body: r.talismans.nameWafqSvg.replace("<svg", '<svg class="seal big printable"') +
          `<button class="btn sm sec printbtn" type="button">🖨️ اطبع هذا الطلسم / احفظه PDF</button>
          <div class="kv" style="margin-top:.4rem"><b>ما هو:</b> مربّعٌ عدديٌّ مبنيٌّ من اسمك تحديدًا — مجموعُ كلِّ صفٍّ وعمودٍ فيه يساوي جُمّل اسمك (${AR(id.total)})${r.talismans.nameWafqExact ? "" : "، مقرَّبًا"}، فلا يتكرّر نفسُ الشكل إلّا لاسمٍ آخر مجموعُه نفسُ الرقم.</div>
          <div class="kv" style="margin-top:.3rem"><b>ما فائدتُه لك تحديدًا:</b> في العُرف نفسِه هو حرزٌ شخصيٌّ عامّ — يُقصَد به ربطُ الحاملِ برقمِه واسمِه (توازنٌ/حمايةٌ عامّة)، لا علاجُ مشكلةٍ بعينها. فائدتُه إذًا عامّةٌ لا نوعيّة: لا تتوقّع منه جلبَ رزقٍ أو دفعَ عينٍ بذاته.</div>
          <div class="kv" style="margin-top:.3rem"><b>كيف تستعمله:</b> يُكتَب على ورقةٍ كما يظهر بالضبط، ويُحمَل معك أو يُحفَظ بمكانٍ قريب، بلا توقيتٍ خاصّ. إذا احتجتَ وفقًا لغرضٍ معيّن (محبّة، رزق، حفظ...) فهذا غيرُه — ${navLink("taskhir", "افتح «التسخير والتصريف»")} أو ${navLink("awfaq", "«الأوفاق ← الأغراض»")}.</div>`,
        reveal: "مربّع سيام/ستراتشي (1..n²) ثمّ x → a + (x−1)·d بحيث ∑الصفّ = المطلوب. أيُّ اسمٍ مجموعُه " + AR(id.total) + " يُعطي المربّعَ نفسَه."
      })}
    </div>`;
    wireCards(main);
  };
  $("#go", main).onclick = run;
  $("#go2", main).onclick = () => { run(); main.querySelectorAll(".card").forEach((c) => c.classList.add("debate")); };
  run();
};

// 2) التوافق ─────────────────────────────────────────────────────────
PANELS.compat = (main) => {
  main.innerHTML = `${head('compat', 'التوافق بين شخصين')}`;
  if (!gate(main)) return;
  const c0 = ctx();
  main.innerHTML += `<div class="form">
      <div class="fld"><label>أنت (من البطاقة)</label><input id="ca" value="${esc(c0.name)}"></div>
      <div class="fld"><label>اسم أمّك</label><input id="cam" value="${esc(c0.mother)}"></div>
      <div class="fld"><label>الشخص الآخر</label><input id="cb" placeholder="اكتب اسمه"></div>
      <div class="fld"><label>اسم أمّه</label><input id="cbm" placeholder="اكتب اسم أمّه"></div>
      <button class="btn" id="go">قِس التوافق</button>
    </div><div id="out"><p class="kv">اكتب اسم الشخص الآخر واسم أمّه، ثمّ «قِس».</p></div>`;
  const run = () => {
    const g = (id) => $("#" + id, main).value.trim();
    if (!g("cb")) { $("#out", main).innerHTML = `<p class="kv">أدخِل اسم الشخص الآخر أوّلًا.</p>`; return; }
    let c;
    try { c = ak.compatibility(g("ca"), g("cam") || "—", g("cb"), g("cbm") || "—"); }
    catch (e) { $("#out", main).innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    $("#out", main).innerHTML = `<div class="grid">${card({
      title: `«${esc(c.a.name)}» و«${esc(c.b.name)}»`, k: "÷ ١٢ و ٤",
      body: `<div class="big">${esc(c.verdict)}</div>
        <div class="kv">${esc(c.a.name)}: مجموع <b>${AR(c.a.total)}</b> · عنصر <b>${esc(c.a.element)}</b> · كوكب <b>${esc(c.a.planet)}</b><br>
        ${esc(c.b.name)}: مجموع <b>${AR(c.b.total)}</b> · عنصر <b>${esc(c.b.element)}</b> · كوكب <b>${esc(c.b.planet)}</b><br>
        المجموع <b>${AR(c.sum)}</b> · العناصر <b>${c.elementsHarmonize ? "متوافقة" : "متنافرة"}</b></div>`,
      reveal: traceText(c.trace),
      vs: [`«بينهما ${esc(c.verdict)}${c.elementsHarmonize ? "، وعنصراهما متوافقان" : "، لكنّ عنصريهما متنافران"}.»`,
        `(${AR(c.a.total)} + ${AR(c.b.total)}) mod 12 = ${AR(c.remainder12)} → قائمة أحكام ثابتة\nاقلبْ لقبًا أو اسمًا ⇒ رقمٌ آخر ⇒ حكمٌ آخر.`]
    })}</div>`;
    wireCards(main);
  };
  $("#go", main).onclick = run;
};

// 3) تشخيص الحالة ────────────────────────────────────────────────────
PANELS.diagnosis = (main) => {
  const list = diagnosis.symptomList();
  main.innerHTML = `${head('diagnosis', 'تشخيص الحالة')}
    <p class="kv">أشّر ما ينطبق عليك، واضغط «شخّص». هذه محاكاةٌ لما يفعله الراقي — والكشف يبيّن أنّها أداةُ «فورر» تُطابق الجميع.</p>
    <div class="warn">تنبيه صحّيّ حقيقيّ: هذه الأعراض تُفسَّر غالبًا بالقلق/الاكتئاب/اضطراب النوم/فقر الدم/نقص فيتامين د/خمول الغدّة — راجِع طبيبًا مختصًّا قبل أيّ تفسير غيبيّ.</div>
    <div id="syms" style="columns:2;column-gap:1.4rem;margin:1rem 0;font-size:.9rem"></div>
    <div class="form"><button class="btn" id="go">شخّص</button><label class="kv"><input type="checkbox" id="charm" checked> أضِف حرزًا شخصيًّا</label></div>
    <div id="out"></div>`;
  $("#syms", main).innerHTML = list.map((s) =>
    `<label style="display:block;margin:.25rem 0;break-inside:avoid"><input type="checkbox" value="${s.id}"> ${esc(s.text)}</label>`).join("");
  $("#go", main).onclick = () => {
    const picked = [...main.querySelectorAll("#syms input:checked")].map((i) => i.value);
    if (!picked.length) { $("#out", main).innerHTML = `<div class="kv">أشّر عرضًا واحدًا على الأقلّ.</div>`; return; }
    const c = ctx();
    const a = diagnosis.assess({ symptoms: picked, name: ($("#charm", main).checked && c.ready) ? c.name : undefined, mother: c.mother });
    try { localStorage.setItem("smk-last-diagnosis", JSON.stringify({ label: a.primary.label, support: a.primary.support, savedAt: Date.now() })); } catch {}
    $("#out", main).innerHTML = `<div class="grid wide">
      ${card({
        title: "التشخيص", k: "تأثير فورر",
        body: `<div class="kv" style="font-style:italic;margin-bottom:.5rem">${esc(a.opener)}</div>
          <div class="big">${esc(a.primary.label)}</div>
          <div class="kv">${esc(a.primary.support)}.<br>${esc(a.primary.blurb)}<br>احتمالاتٌ أخرى: ${a.secondary.map((s) => esc(s.label)).join("، ") || "—"}</div>
          ${a.unknownSymptoms.length ? `<div class="warn">أعراضٌ غيرُ معروفةٍ أُسقِطت: ${a.unknownSymptoms.map(esc).join("، ")}.</div>` : ""}`,
        reveal: traceText(a.reveal) + `\n\n«النسبة» الزائفة (لو أصررتَ عليها): ${a.primary.barnumPct}٪ — وعرضٌ واحدٌ يعطي القيمةَ نفسَها.`,
        vs: [`«حالتك: ${esc(a.primary.label)} بنسبةٍ عالية، والعلاج كذا…»`,
          `أشّرتَ ${AR(a.picked.length)} عرضًا. كلٌّ يدلّ على عدّة عللٍ عمدًا.\n«${a.primary.label}» = ${AR(a.primary.hits)} إشارة ⇒ نسبةٌ = hits/الإجمالي +12 (سقف ٩٧).\nأعراضٌ أخرى ⇒ علّةٌ أخرى بنفس «الثقة».`]
      })}
      ${a.primary.remedy ? card({
        title: "خطة العلاج (كما تُوصَف)",
        body: `<div class="kv"><b>رقية:</b> ${a.primary.remedy.ruqya.map(esc).join(" · ")}<br>
          <b>نظام:</b> ${(a.primary.remedy.regimen || []).map(esc).join(" · ") || "—"}<br>
          <b>سلوك:</b> ${(a.primary.remedy.behavior || []).map(esc).join(" · ") || "—"}</div>
          ${a.primary.remedy.warning ? `<div class="warn">${esc(a.primary.remedy.warning)}</div>` : ""}`,
      }) : ""}
      ${a.charm ? card({ title: "حرزك الشخصيّ", k: `رتبة ${AR(a.charm.order)}`,
        body: a.charm.svg.replace("<svg", '<svg class="seal big printable"') +
          `<button class="btn sm sec printbtn" type="button">🖨️ اطبع هذا الحرز / احفظه PDF</button>
          <div class="kv" style="margin-top:.4rem"><b>ما هو:</b> مربّعٌ مبنيٌّ من جُمّل اسمك واسم أمّك معًا (${AR(a.charm.total)})، لا من أعراضك — حرزُ توازنٍ عامّ لا علاجٌ نوعيٌّ لِما اخترته أعلاه.</div>
          <div class="kv" style="margin-top:.3rem"><b>كيف تستعمله:</b> يُكتَب على ورقةٍ كما يظهر بالضبط، ويُحمَل معك أو يُحفَظ قريبًا منك، بلا توقيتٍ خاصّ.</div>` }) : ""}
    </div>
    <div class="warn" style="margin-top:1rem">${esc(a.disclaimer)}</div>`;
    wireCards(main);
  };
};

// 3b) القرعة والفأل ─────────────────────────────────────────────────
PANELS.qura = (main) => {
  main.innerHTML = `${head('qura', 'القرعة والفأل')}`;
  if (!gate(main)) return;
  const c0 = ctx();
  main.innerHTML += subjectBar(c0) +
    `<div class="qline">السؤال (من البطاقة): <b>${c0.question ? "«" + esc(c0.question) + "»" : "لم تختر سؤالًا"}</b></div>
     <div class="form"><button class="btn" id="qcast">اضرب القرعة</button></div>
     <div id="qout"></div>`;
  $("#qcast", main).onclick = () => {
    const c = ctx();
    if (!c.question) { $("#qout", main).innerHTML = `<div class="warn">اختر سؤالًا من «بطاقتي» أوّلًا.</div>`; return; }
    const r = qura.cast(c.name, c.mother, c.question, c.now); // رميةٌ جديدةٌ كلَّ يومِ استشارة، لا للأبد
    $("#qout", main).innerHTML = `<div class="grid wide">${card({
      title: `قرعةُ جعفر الصادق`, k: `الباب ${AR(r.bab)}`,
      body: `<div class="kv"><b>الدعاء قبل الضرب:</b> ${esc(r.prayer)}</div>
        <div class="big" style="letter-spacing:.4rem;margin:.6rem 0">${r.throws.map((t) => `<span class="mono">${esc(t)}</span>`).join(" ")}</div>
        <div class="kv">خرجت الثلاثيّة «<b>${esc(r.key)}</b>» ⇒ <b>الباب ${AR(r.bab)}</b>.</div>
        ${r.verse ? `<div class="kv" style="margin-top:.5rem"><b>قال اللهُ تعالى:</b> ${esc(r.verse)}</div>` : ""}
        <div class="big" style="font-size:1.04rem;margin-top:.4rem">${esc(r.fortune || `بابُك الباب ${AR(r.bab)} من أبواب القرعة؛ فتأمّلْ فألَك فيه.`)}</div>
        <div class="kv" style="margin-top:.5rem"><b>بصراحة:</b> نصّ هذا البابِ عامٌّ بطبيعته — الكتابُ نفسُه يضع ٦٤ بابًا ثابتًا، كلٌّ منها حكمةٌ عامّةٌ تصلح تفسيرًا لأيّ سؤال («اترك الأمر»، «تمهّل»، «امضِ فيه»...)، لا جوابًا حرفيًّا مصمَّمًا لسؤالك بالذات. فسّرِ البابَ على ضوء سؤالك أنت (كما يفعل قارئُ أيّ كتابِ فألٍ)، ولا تتوقّع أن يذكر البابُ تفاصيل سؤالك.</div>`,
      basis: "عودٌ رُباعيٌّ (ا/ب/ج/د) يُرمى ٣ مرّات ⇒ ثلاثيّة ⇒ بابٌ من ٦٤ فيه آيةٌ وفأل. الرميُ هنا حتميٌّ من (اسمك + أمّك + سؤالك + تاريخ اليوم).",
      reveal: traceText(r.trace) + "\n\n" + r.note,
      vs: [`«ضربتُ لك القرعةَ فخرج الباب ${AR(r.bab)}: ${esc(r.tone || "—")}»`,
        `الرمي = دالّةٌ حتميّةٌ في اسمك وأمّك وسؤالك وتاريخ اليوم (${esc(r.input.day)}). بدّل أيَّها ⇒ بابٌ آخر. والأبوابُ عباراتٌ تصدُقُ على الجميع.`]
    })}</div>`;
    wireCards(main);
  };
  if (c0.question) $("#qcast", main).click();
};

// 3c) كشف الدجل — ألعاب العرافة ─────────────────────────────────────
PANELS.debunk = (main) => {
  main.innerHTML = `${head('debunk', 'ألعاب العرافة وحِيَلها')}
    <p class="kv">${esc(debunk.NOTE)}</p>
    <h2>أصناف الحِيَل الستّة</h2><div class="grid" id="dtech"></div>
    <h2>قراءة الفنجان</h2>
    <div class="form">
      <div class="fld"><label>الرمز</label><select id="dfs">${debunk.listFanjanSymbols().map((s) => `<option>${esc(s)}</option>`).join("")}</select></div>
      <div class="fld"><label>الموضع</label><select id="dfp"><option>الجهة الرائقة</option><option>الجهة المتكاثفة</option><option>قاع الفنجان</option></select></div>
    </div><div id="dfout"></div>
    <h2>علم الاختلاج (رفّة الأعضاء)</h2>
    <div class="form"><div class="fld"><label>العضو</label><select id="dis">${debunk.listIkhtilaj().map((s) => `<option>${esc(s)}</option>`).join("")}</select></div>
      <div class="fld"><label>الجهة</label><select id="disd"><option>—</option><option>الأيمن</option><option>الأيسر</option><option>العليا</option><option>السفلى</option></select></div></div><div id="diout"></div>
    <h2>زهر الطاولة</h2>
    <div class="form"><div class="fld"><label>الفصّان</label><select id="dd1">${[1,2,3,4,5,6].map((n)=>`<option>${n}</option>`).join("")}</select> <select id="dd2">${[1,2,3,4,5,6].map((n)=>`<option>${n}</option>`).join("")}</select></div></div><div id="ddout"></div>
    <h2>الكوتشينة — فردةُ سبع ورقات (حتميّة من اسمك وسؤالك)</h2><div id="dkout"></div>
    <h2>ألعاب الحساب (إكراه رياضيّ)</h2><div class="grid" id="dpout"></div>`;

  $("#dtech", main).innerHTML = debunk.techniques().map((t) =>
    card({ title: t.name, body: `<div class="kv">${esc(t.def)}</div><div class="gloss"><b>كيف تكشفها:</b> ${esc(t.tell)}</div>` })).join("");

  const renderFanjan = () => { const sym = $("#dfs", main).value || debunk.listFanjanSymbols()[0]; const r = debunk.fanjanRead(sym, $("#dfp", main).value || "الجهة الرائقة");
    $("#dfout", main).innerHTML = card({ title: `${esc(r.symbol)} — ${esc(r.position)}`, k: esc(r.technique),
      body: `<div class="big" style="font-size:1.05rem">${esc(r.meaning)}</div><div class="gloss">${esc(r.method)}</div>`,
      reveal: traceText(r.trace) }); wireCards(main); };
  const renderIkh = () => { const prt = $("#dis", main).value || debunk.listIkhtilaj()[0]; const r = debunk.ikhtilaj(prt, $("#disd", main).value || "—");
    $("#diout", main).innerHTML = card({ title: `اختلاج ${esc(r.part)}${r.side !== "—" ? " (" + esc(r.side) + ")" : ""}`, k: esc(r.technique),
      body: `<div class="big" style="font-size:1.05rem">${esc(r.omen)}</div>
        <div class="kv">روايات أخرى: ${r.alternatives.map((a) => `${esc(a.side)}: ${esc(a.omen)}`).join(" · ")}</div>
        <div class="gloss">${esc(r.note)}</div>`, reveal: traceText(r.trace) }); wireCards(main); };
  const renderDice = () => { const r = debunk.backgammon(+$("#dd1", main).value, +$("#dd2", main).value);
    $("#ddout", main).innerHTML = card({ title: `الفصّان ${AR(r.dice[0])}+${AR(r.dice[1])} = ${AR(r.sum)}`, k: esc(r.technique),
      body: `<div class="big" style="font-size:1.05rem">${esc(r.omen)}</div>${r.extra ? `<div class="kv">${esc(r.extra)}</div>` : ""}
        <div class="gloss">${esc(r.note)}</div>` }); wireCards(main); };
  $("#dfs", main).onchange = renderFanjan; $("#dfp", main).onchange = renderFanjan;
  $("#dis", main).onchange = renderIkh; $("#disd", main).onchange = renderIkh;
  $("#dd1", main).onchange = renderDice; $("#dd2", main).onchange = renderDice;
  renderFanjan(); renderIkh(); renderDice();

  const c = ctx();
  const sp = debunk.kotshinaSpread(c.name, c.question || "سؤال عامّ", c.when);
  $("#dkout", main).innerHTML = card({ title: "الفردة", k: esc(sp.technique),
    body: `<table class="tbl"><tr><th>الموضع</th><th>الورقة</th><th>الدلالة</th></tr>
      ${sp.cards.map((x) => `<tr><td>${esc(x.position)}</td><td class="mono">${esc(x.card)}</td><td>${esc(x.meaning)}</td></tr>`).join("")}</table>
      <div class="gloss">${esc(sp.note)}</div>` });

  $("#dpout", main).innerHTML = [
    (() => { const t = debunk.threeObjects(3, 1, 2); return card({ title: "الأشياء الثلاثة المخبَّأة", k: t.correct ? "الحيلة تعمل" : "—",
      body: `<div class="kv">مثال: صاحب القلم في مقعد ٣، الخاتم ٢، المنديل... ⇒ ح٤−٢٥٠ = <b>${AR(t.steps.minus250)}</b> ⇒ استُخرِج (${AR(t.recovered.obj1)}، ${AR(t.recovered.obj2)}، ${AR(t.recovered.obj3)})</div>
        <div class="gloss">${esc(t.identity)}</div>`, basis: `${esc(t.source)} · حيلة: ${esc(t.technique)}` }); })(),
    (() => { const r = debunk.ranksNineTrick(); return card({ title: "أعجوبة المراتب التسع", k: `مجموع الأرقام ${AR(r.digitSum)}`,
      body: `<div class="kv">${AR(r.descending)} − ${AR(r.ascending)} = <b>${AR(r.difference)}</b>، ومجموعُ أرقامِه = <b>${AR(r.digitSum)}</b></div>
        <div class="gloss">${esc(r.explain)}</div>`, basis: `${esc(r.source)} · حيلة: ${esc(r.technique)}` }); })(),
  ].join("");
  wireCards(main);
};

// 4) حساب الجُمّل ────────────────────────────────────────────────────
PANELS.jummal = (main) => {
  const c0 = ctx();
  main.innerHTML = `${head('jummal', 'حساب الجُمّل')}
    <p class="kv">جُمّل أيّ كلمةٍ هو رقمُها بحساب الحروف الأبجديّة — هذا الرقمُ نفسُه هو المُدخَل الذي تُبنى عليه أدواتٌ أخرى بالموقع (الأوفاق، الطلاسم، الجفر، التسخير)؛ فائدتُك هنا ليست بهذه الصفحة وحدَها، بل في أنّها «الآلةُ الحاسبة» التي تغذّي تلك الأدوات. النصُّ المكتوبُ افتراضًا («بسم الله الرحمن الرحيم») مجرّدُ مثالٍ توضيحيّ لا معنى خاصّ له هنا — امسحْه واكتب اسمك أو أيّ كلمةٍ تريد حسابَها.</p>
    <div class="form">
      <div class="fld"><label>النصّ</label><input id="t" value="بسم الله الرحمن الرحيم" style="min-width:320px"></div>
      <div class="fld"><label>الطريقة</label><select id="m">${abjad.methods().map((mm) => `<option value="${mm.id}">${esc(mm.title)}</option>`).join("")}</select></div>
      <label class="kv"><input type="checkbox" id="sag"> الحساب الصغير</label>
    </div><div id="out"></div>
    <h2>الغالب والمغلوب بين اسمين</h2>
    <p class="kv">اسمُك (من بطاقتك) ثابتٌ بالحقل الأوّل — اكتب فقط اسمَ الطرف الآخر بالحقل الثاني.</p>
    <div class="form">
      <div class="fld"><label>الطالب (أنت)</label><input id="ba" value="${esc(c0.name || "محمد")}"></div>
      <div class="fld"><label>المطلوب (الخصم/المحبوب)</label><input id="bb" placeholder="اكتب اسمَ الطرف الآخر"></div>
      <button class="btn" id="bg">احسب الغلبة</button>
    </div><div id="bout"></div>
    <h2>طبُّ الحروف — تشخيصُ المرض من الاسم (السرّ المكشوف)</h2>
    <p class="kv">مُعبّأةٌ افتراضيًّا باسمك واسم أمّك من بطاقتك — عدِّلها فقط لو تريد تشخيص اسمٍ آخر.</p>
    <div class="form" id="lmform">
      <div class="fld"><label>اسم المريض</label><input id="lmn" value="${esc(c0.name || "يوسف")}"></div>
      <div class="fld"><label>اسم الأب <span class="gloss">(اختياري — غير موجود في بطاقتك)</span></label><input id="lmf" placeholder="اختياري"></div>
      <div class="fld"><label>اسم الأمّ</label><input id="lmm" value="${esc(c0.mother || "امنة")}"></div>
      <div class="fld"><label>اليوم</label><select id="lmd"><option value="">—</option>${["أحد","اثنين","ثلاثاء","أربعاء","خميس","جمعة","سبت"].map((d) => `<option>${d}</option>`).join("")}</select></div>
      <button class="btn" id="lmg">شخِّص</button>
    </div><div id="lmout"></div>
    <h2>بطاقات الحروف الثمانية والعشرين</h2>
    <p class="kv">دليلُ مرجعٍ لكلّ حرفٍ عربيّ وخواصّه — ترجع له عندما تحتاج تعرف طبعَ حرفٍ معيّن ورد بنتيجةٍ بمكانٍ آخر (كحرف الجواب بالجفر)، لا أداةٌ تُشغَّل بنفسها. حروفُ اسمك أنت بالأسفل فقط؛ باقي الحروف (٢٨ كاملةً) مطويّةٌ إن أردت الرجوعَ لحرفٍ آخر.</p>
    <div class="grid" id="cards28own"></div>
    <details style="margin-top:.6rem"><summary class="kv" style="cursor:pointer">اعرض كلّ الحروف الثمانية والعشرين</summary>
      <div class="grid" id="cards28" style="margin-top:.5rem"></div></details>`;
  const run = () => {
    const t = $("#t", main).value, m = $("#m", main).value, sag = $("#sag", main).checked;
    const v = abjad.value(t, { method: m, saghir: sag, perLetter: true });
    const bast = abjad.bast(t), tk = abjad.taksirBasit(t), an = abjad.analyze(t);
    const allm = abjad.allMethods(t);
    $("#out", main).innerHTML = `<div class="grid">
      ${card({ title: "القيمة", k: sag ? "صغير" : esc(abjad.methods().find((x) => x.id === m)?.title || m),
        body: `<div class="big">${AR(v.total)}</div><div class="kv">${AR(v.count)} حرفًا · «${esc(abjad.normalize(t))}»</div>`,
        reveal: v.breakdown.map((b) => `${b.ch} = ${b.value}`).join("\n") + `\n──────\nالمجموع = ${v.total}` })}
      ${card({ title: "كلّ المناهج", body: `<div class="kv">${abjad.methods().map((mm) => `${esc(mm.title)}: <b>${AR(allm[mm.id])}</b>`).join("<br>")}</div>
        <div class="kv" style="margin-top:.4rem"><b>لماذا كل هذي الأرقام؟</b> كل منهج رقمه يُستعمل كمُدخَل مختلف في أدواتٍ أخرى بالموقع (الأوفاق، الطلاسم، الجفر). لا تحتاج تختار — القيمةُ الرئيسيّة فوق (${esc(abjad.methods().find((x) => x.id === m)?.title || m)}) هي الافتراضيّة المُستعمَلة بمعظم الأماكن.</div>`,
        basis: "المنهجُ اختيارُ الممارس؛ كلٌّ يعطي رقمًا مختلفًا ⇒ فهرسةً مختلفة في كلّ الجداول." })}
      ${card({ title: "البَسط (نطق الحروف)", body: `<div class="big">${AR(bast.total)}</div>
        <div class="gloss">هذا رقمٌ بديل (من نطق أسماء الحروف لا قيمها المباشرة) يُستعمَل أحيانًا بدل الرقم الرئيسيّ داخل بعض الأوفاق والعزائم — مرجعٌ لا نتيجةٌ تُقرَأ لوحدها.</div>`,
        reveal: bast.parts.map((p) => `${p.ch} → ${p.name} = ${p.value}`).join("\n") })}
      ${card({ title: "التكسير البسيط", body: `<div class="big">${AR(tk.total)}</div>
        <div class="gloss">تفكيكٌ آخر للاسم لرقمٍ بديل، يُستعمَل بنفس طريقة البَسط أعلاه — مرجعٌ لا نتيجةٌ تُقرَأ لوحدها.</div>`,
        reveal: tk.rows.map((r) => `${r.seg} = ${r.value}`).join("\n") })}
      ${card({ title: "طبائع الحروف والمزاج", body: `<div class="kv">
        الغالب (مزجُ نظامين): <b>${esc(an.dominantNatureBlend)}</b> · كوكب الحروف الغالب: <b>${esc(an.dominantPlanet)}</b><br>
        تقسيم شمس المعارف: ${Object.entries(an.natureCountBuni).map(([k, n]) => `${k} ${AR(n)}`).join(" · ")}<br>
        على التوالي الأبجديّ: ${Object.entries(an.natureCountTawali).map(([k, n]) => `${k} ${AR(n)}`).join(" · ")}<br>
        نورانيّة ${AR(an.nuraniCount)}/${AR(an.count)} · شمسيّة ${AR(an.sunCount)} · قمريّة ${AR(an.moonCount)} · منقوطة ${AR(an.dottedCount)}<br>
        أقوى حرفٍ قيمةً: <b>${esc(an.strongestLetter || "—")}</b> (${AR(an.strongestValue)})</div>
        <div class="gloss">${esc(an.mizaj || "")} — ${esc(an.world || "")}</div>` })}
    </div>`;
  };
  $("#bg", main).onclick = () => {
    const nb = abjad.nameBattle($("#ba", main).value, $("#bb", main).value);
    $("#bout", main).innerHTML = `<div class="grid">${card({
      title: `الغالبُ والمغلوب`, k: `«${esc(nb.a.name)}» × «${esc(nb.b.name)}»`,
      body: `<div class="big">${esc(nb.winnerName === nb.a.name ? "الغلبةُ لـ" + nb.a.name : nb.winnerName === nb.b.name ? "الغلبةُ لـ" + nb.b.name : nb.winnerName)}</div>
        <div class="kv" style="margin-top:.4rem">طبعُ «${esc(nb.a.name)}» ${esc(nb.a.element)}، وطبعُ «${esc(nb.b.name)}» ${esc(nb.b.element)}. ثقةُ الحكم: <b>${esc(nb.confidence)}</b>.</div>`,
      basis: `جُمّل «${esc(nb.a.name)}» = ${AR(nb.a.value)} (÷٩ باقٍ ${AR(nb.a.rem9)}، ${esc(nb.a.parity)}) · جُمّل «${esc(nb.b.name)}» = ${AR(nb.b.value)} (÷٩ باقٍ ${AR(nb.b.rem9)}، ${esc(nb.b.parity)}). ثلاثُ قواعد بالأغلبيّة: الأعداد ⇒ ${esc(nb.rule1.winnerName)} · العناصر ⇒ ${esc(nb.rule2.winnerName)} · الصداقة العنصريّة ⇒ ${esc(nb.rule3.winnerName)} [سرّ الأسرار في علم الأخيار].`,
      reveal: traceText(nb.trace) + "\nلو استُعمل منهجٌ آخرُ للجُمّل لانقلبت النتيجة.",
      vs: [`«حسبتُ اسمَيكما فوجدتُ الغلبةَ لـ${esc(nb.winnerName)}»`, `طرحٌ وقسمةٌ ومقارنةُ جدول. لو استعملتُ منهجًا آخرَ للجُمّل لانقلبت النتيجة.`]
    })}</div>`;
    wireCards(main);
  };
  const lmForm = $("#lmform", main);
  if (lmForm) $("#lmg", main).onclick = () => {
    const nm = $("#lmn", main).value.trim();
    if (!nm) { $("#lmout", main).innerHTML = `<div class="warn">اكتب اسمَ المريض.</div>`; return; }
    const lm = abjad.letterMedicine(nm, { motherName: $("#lmm", main).value.trim(), fatherName: $("#lmf", main).value.trim(), weekday: $("#lmd", main).value });
    $("#lmout", main).innerHTML = `<div class="grid">${card({
      title: `طبُّ الحروف — «${esc(lm.patient)}»`, k: `حرفُك «${esc(lm.letter)}»`,
      body: `<div class="kv">حرفُك من طبِّ الحروف هو «<b>${esc(lm.letter)}</b>»، وبابُه يقول:</div>
        <div class="kv" style="margin-top:.5rem"><b>سببُ العلّة:</b> ${esc(lm.cause)}</div>
        <div class="kv"><b>العلامة:</b> ${esc(lm.sign)}</div>
        <div class="kv"><b>العلاج:</b> ${esc(lm.cure)}</div>`,
      basis: `«السرّ المكشوف في طبّ الحروف» للطوخي: ${lm.total ? `جُمّل المريض والأب والأمّ واليوم = ${AR(lm.total)}، إسقاطٌ بـ٢٨ ⇒ الباقي ${AR(lm.rem)} ⇒ الحرف «${esc(lm.letter)}»` : `أوّلُ حرفٍ من الاسم «${esc(lm.letter)}»`}؛ ثمّ بابُه الثابت.`,
      reveal: traceText(lm.trace) + "\n\n" + lm.note + "\nتشخيصٌ ثابتٌ لكلّ من وقع اسمُه على هذا الحرف — بلا فحص. غيِّرِ اسمَ الأمّ أو اليوم ⇒ حرفٌ آخرُ ⇒ «علّةٌ» أخرى.",
    })}</div>`;
    wireCards(main);
  };
  const letterCard = (ch) => {
    const co = abjad.letterCorrespondences(ch);
    return card({ title: `الحرف ${esc(ch)} — ${esc(co.name)}`, k: `${AR(co.kabir)} · رتبة ${AR(co.order)}`,
      body: `<div class="kv">صغير ${AR(co.saghir)} · وسيط ${AR(co.wasat)} · لفظيّ ${AR(co.lafzi)} · مغربيّ ${AR(co.maghribi)}<br>
        طبعُه: <b>${esc(co.natureBuni)}</b> (على التوالي: ${esc(co.natureTawali)}) · كوكبُه <b>${esc(co.planet || "—")}</b> · برجُه <b>${esc(co.zodiac || "—")}</b><br>
        ${co.nurani ? "نورانيّ · " : ""}${co.sun ? "شمسيّ · " : "قمريّ · "}${co.dotted ? "منقوط" : "مهمَل"}<br>
        ${esc(co.world || "")}</div>` });
  };
  const ALL28 = [..."ابجدهوزحطيكلمنسعفصقرشتثخذضظغ"];
  $("#cards28", main).innerHTML = ALL28.map(letterCard).join("");
  const ownLetters = [...new Set([...abjad.normalize(c0.name || ""), ...abjad.normalize(c0.mother || "")])].filter((ch) => ALL28.includes(ch));
  $("#cards28own", main).innerHTML = ownLetters.length
    ? ownLetters.map(letterCard).join("")
    : `<div class="kv" style="grid-column:1/-1">املأ اسمك واسم أمّك في «بطاقتي» لتظهر حروفُ اسمك هنا مباشرةً.</div>`;
  ["t", "m", "sag"].forEach((id) => $("#" + id, main).addEventListener("input", run));
  run();
};

// 5) الأوفاق ────────────────────────────────────────────────────────
function numGrid(sq, cls) {
  return `<table class="tbl ${cls || ""}" style="margin:auto">${sq.map((r) =>
    `<tr>${r.map((x) => `<td class="mono" style="text-align:center;min-width:2.2em">${AR(x)}</td>`).join("")}</tr>`).join("")}</table>`;
}
function letterGridHTML(g) {
  return `<table class="tbl" style="margin:auto">${g.map((r) =>
    `<tr>${r.map((ch) => `<td class="mono" style="text-align:center;min-width:2.2em">${esc(ch)}</td>`).join("")}</tr>`).join("")}</table>`;
}
PANELS.awfaq = (main) => {
  const c0 = ctx();
  main.innerHTML = `${head('awfaq', 'الأوفاق')}
    <h2>أوفاق الكواكب السبعة</h2>
    <p class="kv">هذه أوفاقٌ مرجعيّةٌ لكلّ كوكب (لا لغرضٍ محدَّد) — هي الأساسُ الذي تُبنى منه أعمالُ قسم «الأغراض» أسفل. لا تحتاج تكتبها بنفسك عادةً؛ تعرضها هنا لتفهم شكل كلّ كوكب.</p>
    <div class="grid" id="planets"></div>
    <h2>بُدُوح وطبائع الرتب</h2>
    <p class="kv">مربّعُ بُدُوح (أول بطاقة) له استعمالٌ مباشرٌ موضَّحٌ بداخله. بقيّةُ البطاقات مرجعٌ يوضّح متى يُستعمَل كلّ رتبةٍ (يوم/ساعة/غرض) — الوفقُ الجاهز نفسُه تجده بقسم «الأغراض» أسفل.</p>
    <div class="grid" id="lore"></div>
    <h2>وفق الاسم / العدد (بالتعمير)</h2>
    <p class="kv">مولِّدُ وفقٍ شخصيٍّ عامٍّ — معبَّأٌ افتراضيًّا باسمك من بطاقتك؛ غيِّره لو أردت وفقَ اسمٍ آخر أو رقم. بدون ربطه بغرضٍ معيّن. إذا تريد وفقًا لغرضٍ محدَّد فاستعمل قسم «الأغراض» أسفل بدلًا منه؛ وإن أردت وفقًا حِرزيًّا عامًّا فقط، يُكتَب هذا ويُحمَل مثل أيّ وفقٍ شخصيّ.</p>
    <div class="form">
      <div class="fld"><label>اسم أو عدد</label><input id="wt" value="${esc(c0.name || "محمد")}"></div>
      <div class="fld"><label>الرتبة</label><select id="wn"><option value="">تلقائيّة</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option></select></div>
      <button class="btn" id="wg">ولّد</button>
    </div><div id="wout"></div>
    <h2>الأغراض ← عمليّة وفقٍ كاملة</h2>
    <div class="form"><div class="fld"><label>الغرض</label><select id="op">${awfaq.listPurposes().map((p) => `<option value="${p.id}">${esc(p.title)} (رتبة ${AR(p.order)})</option>`).join("")}</select></div><button class="btn" id="opg">اعرض العمل</button></div>
    <div class="form" id="op-target-wrap" hidden>
      <div class="fld"><label>اسم الطرف الآخر (المطلوب)</label><input id="op-target" placeholder="اسمه/اسمها"></div>
      <div class="fld"><label>اسم أمّه/أمّها <span class="gloss">(اختياري)</span></label><input id="op-target-mother"></div>
    </div>
    <div id="opout"></div>`;

  $("#planets", main).innerHTML = Object.keys(awfaq.PLANET_ORDERS).map((p) => {
    const sq = awfaq.planetSquare(p);
    return card({ title: `وفق ${p}`, k: `${AR(sq.order)}×${AR(sq.order)} · ∑=${AR(sq.magic)}`,
      body: talisman.svgWafq(sq.square).replace("<svg", '<svg class="seal small"'),
      reveal: `baseSquare(${sq.order}) ثم verify: كلّ صفٍّ وعمودٍ وقطرٍ = ${sq.magic}` });
  }).join("");

  const bd = awfaq.buduh();
  $("#lore", main).innerHTML = [
    card({ title: "مربّع بُدُوح", k: `∑=${AR(bd.magic)}`,
      body: `<div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap">${numGrid(bd.numbers)}${letterGridHTML(bd.letters)}</div>
        <div class="gloss">${esc(bd.nameFrom)}</div>
        <div class="kv" style="margin-top:.4rem"><b>يُستعمل لـ:</b> ${bd.uses.map(esc).join(" · ")}</div>
        <div class="gloss">${esc(bd.practice)}</div>`,
      basis: "أشهرُ مربّعٍ طلاسميّ؛ يُكتَب في زوايا كثيرٍ من الأوفاق «أوتادًا» لها. مقلوبُه لأعمال الحلّ والردّ." }),
    ...awfaq.orderNatures().map((o) => card({
      title: `رتبة ${AR(o.order)} — ${esc(o.planet)} (${esc(o.starName)})`, k: `∑=${AR(o.magic)} · ${esc(o.element)}`,
      body: `<div class="kv"><b>يومها:</b> ${esc(o.day)} · <b>ساعتها:</b> ${esc(o.hourRuler)}<br>
        <b>أغراضها:</b> ${o.uses.map(esc).join(" · ")}<br>
        <b>بخورها:</b> ${o.incense.map((s) => /سامّ/.test(s) ? `<b style="color:var(--warn)">${esc(s)}</b>` : esc(s)).join("، ")}</div>` })),
  ].join("");

  $("#wg", main).onclick = () => {
    const raw = $("#wt", main).value.trim();
    const forced = +$("#wn", main).value || 0;
    const nw = awfaq.nameWafq(raw, forced ? { order: forced } : {});
    const v = awfaq.verify(nw.square);
    const lw = nw.letterWafq;
    $("#wout", main).innerHTML = `<div class="grid wide">${card({
      title: `وفق «${esc(raw)}» بالتعمير`, k: `رتبة ${AR(nw.order)} · الهدف ${AR(nw.target)}${nw.exact ? "" : ` → ${AR(nw.realized)}`}`,
      body: talisman.svgWafq(nw.square).replace("<svg", '<svg class="seal big printable"') +
        `<button class="btn sm sec printbtn" type="button">🖨️ اطبع هذا الوفق / احفظه PDF</button>
         <div class="kv" style="text-align:center">المجموع المُحقَّق = <b>${AR(v.magic)}</b> ${nw.exact ? "" : `(قُرِّب من ${AR(nw.target)})`}</div>
         <div class="kv" style="margin-top:.3rem"><b>كيف تستعمله:</b> يُكتَب على ورقةٍ كما يظهر بالضبط، ويُحمَل معك أو يُحفَظ قريبًا منك، بلا توقيتٍ خاصّ — هذا وفقٌ حِرزيٌّ عامّ لا لغرضٍ محدَّد.</div>
         <div class="gloss">${esc(nw.taᶜmir)}</div>`,
      basis: `«التعمير» عند الممارس هو عينُ المعادلة: (المجموع − الآسّ ${AR(nw.aass)}) ÷ الرتبة = المفتاح (العدد البادئ)، ثمّ الزيادةُ بواحدٍ على المسار.`,
      reveal: `الهدف = ${/^\d+$/.test(raw) ? "عدد" : `جُمّل «${abjad.normalize(raw)}»`} = ${nw.target}\nالمفتاح a = ${nw.base} · الفرق d = ${nw.step}\nكلّ صفّ/عمود/قطر = ${v.magic}\n${awfaq.toText(nw.square)}`
    })}
    ${card({ title: "الوفق الحرفيّ لنفس الاسم", k: `رتبة ${AR(lw.order)}`,
      body: `${letterGridHTML(lw.letterGrid)}
        <div class="kv" style="margin-top:.4rem">مجاميع الصفوف: ${lw.rowSums.map(AR).join("، ")} · الأعمدة: ${lw.colSums.map(AR).join("، ")}<br>
        ${lw.isMagic ? `<b>متّزن</b> (∑=${AR(lw.magic)})` : "<b>غير متّزن</b>"}</div>
        <div class="gloss">${esc(lw.note)}</div>` })}
    </div>`;
    wireCards(main);
  };
  const syncOpTargetVisibility = () => {
    let needsTarget = false;
    try { needsTarget = awfaq.operation($("#op", main).value || awfaq.listPurposes()[0].id, {}).fill.some((f) => f.role === "target" || f.role === "target_reversed" || f.role === "target_mother"); } catch {}
    $("#op-target-wrap", main).hidden = !needsTarget;
  };
  const renderOp = () => {
    const c = ctx();
    const opTarget = $("#op-target", main)?.value.trim();
    const opId = $("#op", main).value || awfaq.listPurposes()[0].id;
    const op = awfaq.operation(opId, {
      name: c.name, mother: c.mother,
      targetName: opTarget || c.targetName, targetMother: opTarget ? $("#op-target-mother", main)?.value.trim() : c.targetMother
    });
    $("#opout", main).innerHTML = `<div class="grid wide">${card({
      title: `عمل: ${esc(op.title)}`, k: `رتبة ${AR(op.order)} — ${esc(op.orderNature.planet)}`,
      body: `<div class="kv"><b>يُملأ بـ:</b> ${op.fill.map((f) => f.role === "fixed" ? esc(f.resolved) : `<b>${esc(f.resolved)}</b>`).join("  +  ")}</div>
        ${op.personalized
          ? `<div class="kv" style="margin-top:.5rem"><b>المربّعُ جاهزٌ للطباعة — مملوءٌ فعليًّا بما سبق:</b></div>${talisman.svgLetterGrid(op.letterGrid).replace("<svg", '<svg class="seal big printable"')}`
          : `<div class="warn" style="margin-top:.5rem">هذا مربّعٌ مثاليٌّ فقط لأنّ بطاقتك (الاسم واسم الأمّ${op.fill.some((f) => f.role === "target" || f.role === "target_reversed" || f.role === "target_mother") ? "، واسم الطرف الآخر" : ""}) غير ممتلئة — املأها ليُبنى المربّعُ الحقيقيُّ الجاهزُ للطباعة بدل هذا المثال:</div>${talisman.svgLetterGrid(op.letterGrid).replace("<svg", '<svg class="seal big printable"')}`}
        <button class="btn sm sec printbtn" type="button">🖨️ اطبع هذا المربّع / احفظه PDF</button>
        <div class="kv" style="margin-top:.5rem"><b>أو بالأرقام (نفس المربّع، طريقةٌ بديلة للكتابة):</b></div>
        ${talisman.svgWafq(op.square).replace("<svg", '<svg class="seal small"')}
        <div class="kv" style="margin-top:.4rem">
          <b>التوقيت:</b> ${esc(op.timing)}<br>
          <b>البخور:</b> ${op.incense.map((s) => /سامّ/.test(s) ? `<b style="color:var(--warn)">${esc(s)}</b>` : esc(s)).join("، ")}<br>
          <b>الوسيط:</b> ${esc(op.medium)}<br>
          <b>النسخ الثلاث:</b> ${esc(op.disposal)}<br>
          <b>النقض:</b> ${esc(op.reverse)}</div>`,
      basis: `الغرض يحدّد الرتبة والكوكب واليوم والساعة والبخور والوسيط ومصير النسخ — كلُّها جداولُ مطابقات. مجموعُ المربّع ${AR(op.demoTarget)}${op.personalized ? " (من جُمّل بياناتك فعليًّا)" : " (نموذجٌ توضيحيّ)"}.`,
      reveal: traceText(op.trace),
      vs: [`«هذا عملُ ${esc(op.title)} كما في الكتاب»`, `رتبة ${op.order} + ساعة ${esc(op.orderNature.hourRuler || op.orderNature.planet)} + بخور + وسيط — بدّل أيَّ عنصرٍ منها يتغيّر «العمل» كلُّه دون أن يتغيّر شيءٌ في الواقع.`]
    })}</div>`;
    wireCards(main);
  };
  $("#op", main).addEventListener("change", () => { syncOpTargetVisibility(); renderOp(); });
  $("#opg", main).onclick = renderOp;
  syncOpTargetVisibility();
  renderOp();
  $("#wg", main).click();
  $("#opg", main).click();
};

// 6) الجفر ──────────────────────────────────────────────────────────
PANELS.jafr = (main) => {
  main.innerHTML = `${head('jafr', 'الجفر')}`;
  if (!gate(main)) return;
  const c0 = ctx();
  main.innerHTML += subjectBar(c0) +
    `<div class="qline">السؤال (من البطاقة): <b>${c0.question ? "«" + esc(c0.question) + "»" : "لم تختر سؤالًا — اختر واحدًا من «بطاقتي» فوق"}</b></div>
     <div class="form"><button class="btn" id="jg">استخرج جواب الجفر</button></div>
     <div class="split">
       <div class="main"><div class="col-head">الجواب</div><div id="jout"></div></div>
       <div class="side">
         <div class="col-head">عمليّات الجفر المساعدة على اسمك (مرجع)</div>
         <p class="kv" style="font-size:.85rem">هذه ليست أجوبةً تُقرَأ مباشرةً — هي طرقٌ لتحويل اسمك إلى صيغٍ حرفيّةٍ أخرى يستعملها العارفُ بهذا العلم كمُدخَلٍ داخل أعمالٍ أخرى (خادمٌ، عزيمة، طلسم). لا تحتاج تفعل بها شيئًا هنا بنفسك.</p>
         <div id="jops"></div>
       </div>
     </div>`;
  $("#jg", main).onclick = () => {
    const c = ctx();
    if (!c.question) { $("#jout", main).innerHTML = `<div class="warn">اختر سؤالًا من «بطاقتي» أوّلًا.</div>`; return; }
    const a = jafr.extractAnswer(c.question, { name: c.name, mother: c.mother });
    const isYesNo = a.questionForm === "yesno";
    $("#jout", main).innerHTML = `<div class="grid wide">${card({
      title: `جوابُ الجفر`, k: isYesNo ? `${esc(a.verdict.direction)} · ثقة ${AR(a.verdict.confidence)}٪` : esc(a.formed.label),
      body: `<div class="qline">المسألة: <b>«${esc(c.question)}»</b></div>
        <div class="big" style="font-size:1.1rem">${esc(a.formed.text)}</div>
        ${isYesNo ? `<div class="kv" style="margin-top:.3rem"><b>الوقتُ التقريبيّ:</b> ${esc(a.time.text)}.</div>` : ""}
        ${!isYesNo ? `<div class="kv" style="margin-top:.3rem">سؤالُك مصوغٌ بصيغة «${a.questionForm === "why" ? "لماذا" : a.questionForm === "how" ? "كيف" : a.questionForm === "when" ? "متى" : "ماذا"}» لا «هل» — فحكمُ الجفر هنا لا يكون نعم/لا (فرضُ نعم/لا على هذا السؤال يكون جوابًا غيرَ مطابقٍ لصيغته)؛ لذا النصُّ أعلاه هو الجوابُ المناسبُ لشكله.</div>` : ""}
        <div class="kv" style="margin-top:.6rem;border-top:1px solid var(--line);padding-top:.5rem"><b>من أين جاء هذا؟</b> حرفُ الجواب «<b>${esc(a.answerLetter)}</b>» وقع في <b>${esc(a.bab || "—")}</b> — وهذا نصُّ الباب في الكتاب.<br>
        وافقه الجوابُ الموزون من خمسة مناهجَ حسابيّةٍ مختلفة: «${esc(a.consensusLetter)}» — ${esc(a.consensusBab || "")}.<br>
        ويدعمه: كوكبُ الحرف (${esc(a.planetAnswer || "—")}) وعنصرُه (${esc(a.elementAnswer || "—")}).</div>
        <div class="kv" style="margin-top:.5rem"><b>ماذا تفعل بهذا؟</b> النصُّ الكبيرُ أعلاه هو جوابُ سؤالك. إذا احتجتَ عملًا فعليًّا لدفع الأمر أو تيسيره، ${navLink("session", "افتح «الجلسة الكاملة»")} لتوصيةٍ مبنيّةٍ على موضوع سؤالك تحديدًا.</div>`,
      basis: `جُمّل «${esc(c.question)}» + ٧٨٦ (البسملة) + جُمّل «${esc(c.name)}» + جُمّل «${esc(c.mother)}» = ${AR(a.grandTotal)}. ثمّ ÷٢٨ باقيه (${AR(a.isqat.by28.remainder)}) ⇒ حرفُ الجواب «${esc(a.answerLetter)}» وبابُه. ثلاثةُ محاورَ (طبعُ الباب · نورانيّةُ الحرف · مزجُ خمسةِ مناهج) تُجمَع موزونةً ⇒ حكمٌ واحدٌ وثقة.`,
      reveal: traceText(a.trace)
        + `\n\nالمحاورُ الخام: نورانيّة الحرف ⇒ ${esc(a.yesNoByLuminosity)} · مزجُ الميل ⇒ ${esc(a.blendVerdict)} · بعدِّ السنين ⇒ ${esc(a.time.alt)}.\nسلسلةُ الحروف (لا كلمةٌ لغويّة): «${esc(a.letterChain || a.answerWord)}».`,
      vs: [`«كشف لي الجفر: ${esc(a.verdict.text)}»`,
        `الحرف = letterAt( ${AR(a.grandTotal)} mod 28 = ${AR(a.isqat.by28.remainder)} ) = «${esc(a.answerLetter)}». خمسةُ مناهجَ بديلةٍ أعطت: ${a.byMethod.map((m) => m.letter).join("، ")} — لو غيّرتَ صياغةَ السؤال أو البذرةَ لتغيّر كلُّ شيء.`]
    })}</div>`;
    wireCards(main);
  };
  const nm = abjad.normalize(c0.name);
  const zb = jafr.zuburBayyinat(nm);
  const tri = jafr.numberTriangle(nm, 9);
  const grid = jafr.jafrGrid();
  const tk3 = jafr.taksir(nm, { method: "thulathi" });
  $("#jops", main).innerHTML = [
    card({ title: "أنواع البسط على اسمك",
      body: `<div class="kv mono">${jafr.bastModes().map((m) => `${esc(m.title)}: «${esc(jafr.bastBy(nm, m.id).text)}»`).join("<br>")}</div>`,
      basis: "أنواعُ البسط: كلُّ نوعٍ يُنتج نصًّا فجُمّلًا مختلفًا؛ يختار الممارسُ النوعَ المناسب للعمل." }),
    card({ title: "التكسير (من الطرفين + ثلاثيّ)",
      body: `<div class="med">من الطرفين: «${esc(nm)}» ← «${esc(jafr.taksir(nm, 1).result)}»<br>ثلاثيّ: «${esc(nm)}» ← «${esc(tk3.result)}»</div>`,
      reveal: "من الطرفين:\n" + jafr.taksir(nm, 1).steps.join("\n") + "\n\nثلاثيّ:\n" + tk3.steps.join("\n") }),
    card({ title: "الزبر والبيّنات", body: `<div class="kv mono">${zb.rows.map((r) => `${r.letter}: زبر ${r.zabr} (${r.zabrValue}) / بيّنة ${r.bayyina} (${r.bayyinaValue})`).join("<br>")}</div>` }),
    card({ title: "مثلّث الأعداد (إسقاط ٩)", body: `<pre class="grid-num">${tri.rows.map((r) => r.join("  ")).join("\n")}</pre><div class="kv">القمّة: ${AR(tri.apex)} → «${esc(tri.apexLetter)}»</div>` }),
    card({ title: "دائرة الإبدال (+١) ودائرة التضادّ",
      body: `<div class="med">+١: «${esc(nm)}» ← «${esc(jafr.circleShift(nm, 1).result)}»<br>تضادّ (ا↔غ): «${esc(nm)}» ← «${esc(jafr.circleSubstitute(nm, "tadad").result)}»</div>` }),
    card({ title: "جدول الطبائع والكواكب (٤×٧)",
      body: `<div style="overflow-x:auto"><table class="tbl"><tr><th></th>${grid.planets.map((p) => `<th>${esc(p)}</th>`).join("")}</tr>
        ${grid.rows.map((r) => `<tr><th>${esc(r.element)}</th>${r.letters.map((l) => `<td class="mono">${esc(l)}</td>`).join("")}</tr>`).join("")}</table></div>
        <div class="kv" style="margin-top:.3rem">جدولُ الطبائع: كلُّ خانةٍ حرفٌ يجمع طبعَه وكوكبَه، والحروفُ الثمانيةُ والعشرون موزَّعةٌ مرّةً واحدة.</div>` })
  ].join("");
  $("#jg", main).click();
};

// 7) الزايرجة ───────────────────────────────────────────────────────
PANELS.zairja = (main) => {
  main.innerHTML = `${head('zairja', 'زايرجة العالم')}
    <p class="kv">أربعُ طرقٍ كلاسيكيّةٍ مختلفةٍ لاستخراج بيتٍ يجيب سؤالك — كلٌّ منها أنبوبُ حسابٍ مستقلٌّ من كتابٍ مختلف، فلا تتوقّع أن تتّفق أبياتُها. هذه اللوحة للاستكشاف والتفصيل؛ الجوابُ الموحَّدُ المُلخَّص من كلّ الطرق معًا تجده في «الجلسة الكاملة».</p>`;
  if (!gate(main)) return;
  const c0 = ctx();
  const officialPre = c0.question ? zairja.classifyOfficialTopic(c0.question) : null;
  const rulePre = officialPre ? (ADJUSTMENT_RULES[officialPre.n] || { kind: "none" }) : { kind: "none" };
  const stripLabel = (d) => (d || "").replace(/^عددُ\s*/, "");
  let adjFieldsHtml = "";
  if (rulePre.kind === "name1") {
    adjFieldsHtml = `<div class="fld"><label>تعديلُ السؤال: ${esc(stripLabel(rulePre.desc))}</label><input id="z-adj1" placeholder="اختياري — يرفع الدقّة"></div>`;
  } else if (rulePre.kind === "name2") {
    adjFieldsHtml = `<div class="fld"><label>تعديلُ السؤال — الاسم الأوّل</label><input id="z-adj1" placeholder="اختياري"></div>
      <div class="fld"><label>واسمُ أمّه</label><input id="z-adj2" placeholder="اختياري"></div>`;
  } else if (rulePre.kind === "date") {
    adjFieldsHtml = `<div class="fld"><label>تعديلُ السؤال: تاريخُ الحدث</label><input id="z-adjdate" type="date"></div>`;
  } else if (rulePre.kind === "name_date") {
    adjFieldsHtml = `<div class="fld"><label>تعديلُ السؤال: ${esc(stripLabel(rulePre.desc))}</label><input id="z-adj1" placeholder="اختياري"></div>
      <div class="fld"><label>تاريخُ الحدث</label><input id="z-adjdate" type="date"></div>`;
  } else if (rulePre.kind === "name_year") {
    adjFieldsHtml = `<div class="fld"><label>تعديلُ السؤال: ${esc(stripLabel(rulePre.desc))}</label><input id="z-adj1" placeholder="اختياري"></div>
      <div class="fld"><label>سنةُ الحدث</label><input id="z-adjdate" type="date"></div>`;
  }
  main.innerHTML += subjectBar(c0) +
    `<div class="qline">السؤال (من البطاقة): <b>${c0.question ? "«" + esc(c0.question) + "»" : "لم تختر سؤالًا"}</b></div>
     <div class="form">
       <div class="fld"><label>الوَتَر (بيتٌ حاكمٌ يحدّد القافية)</label><input id="zw" value="بسم الاله وبه نستعين" style="min-width:240px"></div>
       ${adjFieldsHtml}
       <button class="btn" id="zg">أَدِر الزايرجة</button></div>
     ${rulePre.kind !== "none" && officialPre ? `<div class="kv gloss">الزايرجةُ الهندسيّة صنّفت سؤالك موضوعَ «${esc(officialPre.topic)}» — وله تعديلٌ اختياريّ (${esc(stripLabel(rulePre.desc))}) يرفع دقّة نسبة السؤال إن مُلئ؛ يُهمَل بأمانٍ إن تُرك فارغًا.</div>` : ""}
     <div id="zout"></div>`;
  $("#zg", main).onclick = () => {
    const c = ctx();
    if (!c.question) { $("#zout", main).innerHTML = `<div class="warn">اختر سؤالًا من «بطاقتي» أوّلًا.</div>`; return; }
    const hndOpt = {
      name: c.name, mother: c.mother,
      adjustmentName: $("#z-adj1", main)?.value || "",
      adjustmentName2: $("#z-adj2", main)?.value || "",
      eventDate: $("#z-adjdate", main)?.value || null,
      when: c.now,
    };
    // الزايرجةُ آلةٌ تُدارُ فعليًّا عند الاستشارة (كالقرعة) — طالعُ لحظةِ الإدارة، لا طالعُ الميلاد.
    let asc = 100; try { asc = falak.ascendant(c.now, c.lat, c.lon).longitude; } catch {}
    const z = zairja.operate(c.question, { ascendantDegree: asc, watar: $("#zw", main).value });
    $("#zout", main).innerHTML = `<div class="grid wide">${card({
      title: `إدارةُ الزايرجة`, k: `طالع ${AR(asc.toFixed(0))}°`,
      body: `<div class="qline">المسألة: <b>«${esc(c.question)}»</b></div>
        <div class="kv">أدرتُ الحلقاتِ على درجةِ طالعك وجُمّلِ سؤالك وقافيةِ الوَتَر، فخرج البيت:</div>
        <div class="big" style="font-size:1.12rem">«${esc(z.answer)}»</div>
        <div class="kv" style="margin-top:.4rem">وميلُ البيت: <b>${z.sentiment > 0 ? "سعدٌ وقبول" : z.sentiment < 0 ? "نحسٌ ومنع" : "متوسّط"}</b>.</div>
        <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> هذا البيتُ الشعريُّ نفسُه جوابُك بهذه الطريقة تحديدًا؛ اقرأه واعتبر ميلَه (سعدٌ/نحس) اتّجاهَ الجواب. هذه أوّل طريقةٍ من أربع طرقٍ زايرجيّةٍ مختلفة أسفل — لا يلزم أن تتّفق نتائجهنّ.</div>`,
      basis: `جُمّل السؤال + درجة الطالع (${AR(asc.toFixed(0))}°) + ٣٦١، إسقاطٌ بـ٢٨ لكلّ حرف؛ ثمّ تركيبُ صدرٍ وعجزٍ بمؤشّرَين من هذه الأرقام وقافيةِ الوَتَر.`,
      reveal: `المخرَجُ الخامُ من الحلقات: ${esc(z.rawLetters.join(" "))} ${esc(z.rhymeLetter)}\n` + traceText(z.trace) + "\n\n" + z.note + "\nالبيتُ مركَّبٌ من قوالبَ ثابتةٍ يُلوّنُها موضوعُ سؤالك؛ الآلةُ لا «تقرأ» السؤال.",
      vs: [`«استخرجتُ لك بالزايرجة بيتًا يجيب سؤالك: ${esc(z.answer)}»`,
        `الآلة أخرجت: ${esc(z.answerRaw)} (حروفٌ مبعثرة).\nرُكِّب صدرٌ وعجزٌ من قوالبَ حسب موضوع السؤال، ثمّ نُسِب للحروف. لم «تقرأ» الآلةُ سؤالك.`]
    })}
    ${(() => { const h = zairja.handasiya(c.question, hndOpt); return card({
      title: "الزايرجةُ الهندسيّة",
      k: `الموضوعُ الرسميّ «${esc(h.officialTopic.topic)}» · باب البيت «${esc(h.topic)}»`,
      body: `<div class="kv">صُنِّف سؤالُك إلى الموضوع الرسميّ «<b>${esc(h.officialTopic.topic)}</b>» (من واحدٍ وثلاثين موضوعًا يعدّها الكتاب)، وحسبتُ نسبةَ السؤال من اسمك واسم أمّك ورقم الموضوع، فأدّى الأنبوبُ إلى بابِ بيتٍ «<b>${esc(h.topic)}</b>»؛ وبيتُه:</div>
        <div class="big" style="white-space:pre-line;font-size:1.03rem">${esc(h.verse.replace(/\*\*/g, "…"))}</div>
        ${h.topicNote ? `<div class="kv gloss" style="margin-top:.4rem">${esc(h.topicNote)}</div>` : ""}
        <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> هذا هو جوابُ الطريقة الثانية (المُصنَّفة رسميًّا حسب موضوع سؤالك من الكتاب) — اقرأه كجوابٍ مستقلّ، لا كتكملةٍ للبطاقة أعلاه.</div>`,
      basis: `«الزايرجة الهندسية» للطوخي (الطريقةُ الرسميّةُ ص٦٧): جُمّل الاسم + جُمّل الأمّ + رقمُ الموضوع (${AR(h.officialTopic.n)}) + تعديل السؤال = نسبةُ السؤال (${AR(h.questionValue)}) ← الباقي ${AR(h.baqi)} ← حرفُ السرّ «${esc(h.secretLetter)}» ← جدولُ الصفحة والجواب ← صفحة ${AR(h.pageNumber)}، جواب ${AR(h.answerNumber)} ← بيتُ الباب.`,
      reveal: traceText(h.trace) + "\n\n" + h.note + "\nنفسُ الاسم والسؤال ⇒ نفسُ البيت أبدًا؛ بابُ البيت قد لا يطابق الموضوعَ المصنَّف لأنّ أنبوب الحساب يمرّ بجداولَ وسيطة.",
    }); })()}
    ${(() => { const fl = zairja.operateFasl(c.question, { when: c.now, hourAscDegree: asc }); return card({
      title: "زايرجةُ ج١ — طريقةُ الخاتمِ والأربعةَ عشرَ طالعًا",
      k: `خاتم ${AR(fl.khatamOrder)} · مفتاح ${esc(fl.keySign)}`,
      body: `<div class="kv">أدرتُ هذه الطريقةَ على مسألتك، فكان:<br>
        الطوالعُ الأربعةُ (من التاريخ القبطيّ): <b>${fl.fourAscendants.signs.map(esc).join(" · ")}</b>.<br>
        جملةُ الدخل ${AR(fl.entryTotal)} (السؤال + الطوالع + قطب بني وهب ٦٣٢٣ + اسم الله ٣٧٣ + طالع الساعة).</div>
        <div style="overflow-x:auto;margin:.4rem 0"><table class="tbl mono" style="font-size:.85rem">${fl.khatam.map((row) => `<tr>${row.map((l) => `<td>${esc(l)}</td>`).join("")}</tr>`).join("")}</table></div>
        <div class="kv">مفتاحُ السؤال: برجُ «<b>${esc(fl.keySign)}</b>» طبعُه ${esc(fl.keyElement)}؛ ثمّ ٢٨ طالعًا (٢٤ حرفًا) ⇒ امتزاجٌ ⇒ ١٤ طالعًا ⇒ ملقطُ الجواب: «<span class="mono">${esc(fl.answerRaw)}</span>».</div>
        <div class="big" style="font-size:1.08rem;margin-top:.4rem">${esc(fl.answer)}</div>
        <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> النصُّ الكبيرُ أعلاه جوابُ الطريقة الثالثة (طريقةٌ مختلفةٌ تمامًا تعتمد جدول الخاتم بدل حلقات الحروف) — جوابٌ مستقلّ، قارِنه بالطريقتين السابقتين إن أردت.</div>`,
      basis: `«فصلٌ آخر في الزايرجة» [زايرجة ج١]. ${esc(fl.note)}`,
      reveal: traceText(fl.trace) + "\n\nحروفُ القطب: " + esc(fl.qutb) + "\nإسقاطُ الطبائع: نار ٩ · تراب ١٢ · هواء ١٥ · ماء ١٦.\nاللفظُ الخام: " + esc(fl.lafzRaw),
    }); })()}
    </div>
    <p class="kv" style="margin-top:.5rem">طريقةٌ رابعةٌ (البوني) نتيجتُها حروفٌ خامٌ لا جوابًا جاهزًا — انتقلت إلى «معلوماتٌ فقط» بالمرجع لأنها بحاجة تأويل الممارس نفسِه لا استعمالًا مباشرًا.</p>`;
    wireCards(main);
  };
  if (c0.question) $("#zg", main).click();
};

// 8) الرمل ──────────────────────────────────────────────────────────
function figCell(f) {
  return `<span class="mono" title="${esc(f.ar)}">${f.rows.map((r) => (r === 1 ? "•" : "••")).join("/")}</span>`;
}
PANELS.raml = (main) => {
  main.innerHTML = `${head('raml', 'علم الرمل')}`;
  if (!gate(main)) return;
  const c0 = ctx();
  main.innerHTML += subjectBar(c0) +
    `<div class="qline">السؤال (من البطاقة): <b>${c0.question ? "«" + esc(c0.question) + "»" : "لم تختر سؤالًا"}</b></div>
     <div class="form"><button class="btn" id="rg">اضرب الطالع الرمليّ</button></div>
     <div id="rout"></div>`;
  $("#rg", main).onclick = () => {
    const c = ctx();
    if (!c.question) { $("#rout", main).innerHTML = `<div class="warn">اختر سؤالًا من «بطاقتي» أوّلًا.</div>`; return; }
    const r = raml.reading({ name: c.name, mother: c.mother, question: c.question, when: c.when });
    const ch = r.chart;
    const line = (label, arr) => `<tr><th>${label}</th>${arr.map((f) => `<td>${esc(f.ar)}<br>${figCell(f)}</td>`).join("")}</tr>`;
    $("#rout", main).innerHTML = `<div class="grid wide">
      ${card({
        title: `الحكم عن: «${esc(c.question)}»`, k: `البيت ${AR(r.house.n)} — ${esc(r.house.name)}`,
        body: `<div class="big">${esc(r.verdict)}</div>
          <div class="gloss">وُجِّه السؤالُ إلى «البيت ${AR(r.house.n)} (${esc(r.house.name)})» لأنّ فيه كلمةً تخصّه (${esc(r.house.topic)}). ثمّ حُكِم بمزجِ عدّة موازين.</div>
          <div class="kv" style="margin-top:.4rem"><b>بصراحة:</b> صيغةُ حكم الرمل ثابتةٌ («يتمّ الأمر / لا يتمّ») لأنّها مبنيّةٌ لأسئلة «هل يحدُث كذا؟» — إن كان سؤالُك تشخيصيًّا («هل سببُه كذا؟») فاقرأ «يتمّ» على أنّه «الاحتمالُ قائمٌ ويُرجَّح» و«لا يتمّ» على أنّه «الاحتمالُ ضعيف»، لا حرفيًّا.</div>
          <div class="kv" style="margin-top:.5rem">شكلُ بيت المسألة: <b>${esc(r.house.figure.ar)}</b><br>
          ${esc(r.houseFigureMeaning)}<br>
          القاضي: <b>${esc(r.judge.ar)}</b> — ${esc(r.judgeMeaning)}<br>
          الشاهدان: ${esc(ch.witnesses.right.ar)} / ${esc(ch.witnesses.left.ar)} — ${esc(r.witnessNote)}<br>
          سهم القسمة: ${esc(ch.reconciler.ar)}<br>
          نظرُ الطالع إلى بيت المسألة: <b>${esc(r.aspect)}</b><br>
          تقديرُ الوقت: <b>${esc(r.timing.text)}</b> (من عنصر الشكل وعدد نقاطه)${r.timing.muthallath ? `<br><span class="gloss">${esc(r.timing.muthallath)}</span>` : ""}<br>
          ${r.figureLore ? `خصائص الشكل (المثلث): بربريًّا «${esc(r.figureLore.berber)}»، ${esc(r.figureLore.gender)} ${esc(r.figureLore.bound)}، كوكبه ${esc(r.figureLore.planet || "—")}، يُخاف منه: ${esc(r.figureLore.fear || "—")}<br>` : ""}
          ميزانُ الرمل: ${r.balanceOk ? `صحيح (مجموع النقاط زوج)${r.redoCount ? ` — أُعيد الضربُ ${AR(r.redoCount)} ${r.redoCount === 1 ? "مرّة" : "مرّات"} حتى صحّ` : ""}` : "<b>فاسدٌ رغم إعادة الضرب</b> — حالةٌ نادرةٌ جدًّا؛ الحكمُ أدناه احتياطيٌّ"}</div>
          <div class="gloss" style="margin-top:.4rem">بحسب كلّ مصدر:${r.bySource.map((s) => `<br>• ${esc(s.source)} (وزن ${AR(s.weight)})${s.score != null ? ` ⇒ ${esc(s.verdict)} [${AR(s.score)}]` : `: ${esc(s.note || "")}`}`).join("")}<br><b>المزجُ الموزون = ${AR(r.score)}</b></div>
          <div class="kv" style="margin-top:.5rem"><b>ماذا تفعل بهذا؟</b> النصُّ الكبيرُ أعلاه هو حكمُ الرمل على سؤالك؛ وبقيّةُ التفاصيل (الشكل، القاضي، الشاهدان) هي الدليلُ الذي بُني عليه الحكم. التفصيلُ الكاملُ الإضافيُّ (الطالع بالكامل، تسكين البيوت، القراءة الثلاثيّة) لا عملَ فيه — انتقل إلى «معلوماتٌ فقط» بالمرجع.</div>`,
        basis: `الأساس: بذرةٌ رقميّةٌ من (جُمّل اسمك + جُمّل أمّك + جُمّل السؤال + تاريخ اليوم) ⇒ مولّدٌ عشوائيٌّ حتميّ ⇒ ١٦ سطرًا ⇒ الأشكال. الحكمُ مزجٌ موزونٌ لوزنٍ «فلكيّ» ووزنٍ «عُمانيّ» يختلفان في عناصر البيوت. نفس المدخلات في نفس اليوم ⇒ نفس الطالع.`,
        reveal: traceText(r.trace),
        vs: [`«يكشف الرمل أنّ: ${esc(r.verdict)}»`, `الوزن الفلكيّ ${r.scoreStandard} + الوزن العُمانيّ ${r.scoreOmani} ⇒ المزج ${r.score}. كلّ الأشكال مجموعةٌ صفًّا بصفّ من بذرةٍ ثابتة — لا ضربَ يدٍ ولا رمل.`]
      })}
    </div>`;
    wireCards(main);
  };
  if (c0.question) $("#rg", main).click();
};

// 9) الفلك ──────────────────────────────────────────────────────────
PANELS.falak = (main) => {
  main.innerHTML = `${head('falak', 'الفلك والساعات')}`;
  if (!gate(main)) return;
  const c = ctx();
  main.innerHTML += subjectBar(c) +
    `<p class="kv">اللحظةُ المحسوبة: <b>${esc(fmtDateTime(c.now))}</b> (الآن، لا وقتَ ميلادك) عند (${AR(c.lat)}، ${AR(c.lon)}). كلّ ما يلي حسابٌ فلكيٌّ دقيقٌ عبر astronomy-engine؛ والأحكامُ المبنيّةُ عليه من كتب أحكام النجوم.</p>
    <h2>خاصّتُك أنت (من تاريخ ميلادك — لا تتغيّر اليوم)</h2><div id="natal"></div>
    <h2>حكم سؤالك الآن (على طريقة الاختيارات)</h2><div id="horary"></div>
    <h2>السماءُ الآن — اللحظة الحاليّة</h2><div id="fout"></div>
    <h2>حال القمر وجودة اليوم — قواعدُ عمليّة</h2><div id="ahkamKeep"></div>
    <h2>جدول الساعات الكوكبية لهذا اليوم — لاختيار ساعةٍ تعمل بها</h2><div id="hours"></div>`;
  let sky, ph;
  try { sky = falak.snapshot(c.now, c.lat, c.lon); ph = falak.planetaryHoursForMoment(c.now, c.lat, c.lon); }
  catch (e) { $("#fout", main).innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
  $("#fout", main).innerHTML = `<div class="grid wide">
    ${card({ title: "اللحظة", body: `<div class="kv">
      رب اليوم: <b>${esc(sky.day.planet)}</b> (${esc(sky.day.weekday)})<br>
      الساعة الجارية: <b>#${AR(sky.hour.i)} ${esc(sky.hour.phase)} — حاكمها ${esc(sky.hour.ruler)}</b><br>
      الطالع: <b>${esc(sky.ascendant.sign)} ${AR(sky.ascendant.degreeInSign.toFixed(1))}°</b> · الوجه <b>${esc(sky.ascendant.face.ruler)}</b> · الحدّ <b>${esc(sky.ascendant.term.ruler)}</b><br>
      منزلة القمر: <b>${AR(sky.moonMansion.number)} ${esc(sky.moonMansion.name)}</b> — حرفها «${esc(sky.moonMansion.letter)}» ← ${esc(sky.moonMansion.letterPlanet || "—")} ← ملَكها ${esc(sky.moonMansion.letterAngel || "—")} · روحانيّتها «${esc(sky.moonMansion.roohaniyya)}»<br>
      تُوافق المنزلة: ${esc(sky.moonMansion.work)}</div>`,
      reveal: `شروق/غروب من SearchRiseSet ؛ الساعة = المدّة/12\nحاكم الساعة الأولى = رب اليوم ثم ترتيب الكلدانيين\nالطالع من الزمن النجميّ الموضعيّ + ميل فلك البروج\nالوجه = floor(deg/10) على دور الكلدانيين ؛ الحدّ = جدول المصريين` })}
  </div>`;
  // ── طبقة الأحكام: يبقى هنا بس اللي فيه توجيهٌ عمليّ مباشر ─────────────
  const ms = sky.moon, dq = sky.dayQuality;
  $("#ahkamKeep", main).innerHTML = `<div class="grid wide">
    ${card({ title: "حال القمر", body: `<div class="kv">
      الطور: <b>${esc(ms.phaseName)}</b> (${ms.waxing ? "متزايد" : "متناقص"}) · السرعة ${AR(ms.speedPerDay)}°/يوم (${ms.fast ? "سريع" : "بطيء"})<br>
      خالي السير: <b>${ms.voidOfCourse ? "نعم — «لا يكون من الأمر شيء»" : `لا — يتّصل بـ${esc(ms.nextAspectWith)} بعد ${AR(ms.degreesToNextAspect)}°`}</b><br>
      ${ms.inViaCombusta ? "في طريق الاحتراق (١٥° الميزان–١٥° العقرب)" : ""}</div>
      <div class="gloss" style="margin-top:.3rem">قاعدةٌ عمليّة: إن كان القمر «خالي السير»، يُنصَح بتأجيل بدءِ أيّ عملٍ أو قرارٍ مهمّ اليوم — لا يُتوقَّع أن يتمّ.</div>`,
      basis: "خلوُّ السير: ألّا يُتِمّ القمرُ نظرًا بطلميًّا لكوكبٍ قبل خروجِه من برجه — عندها يُقال لا يتمّ المسؤول عنه." })}
    ${card({ title: `جودة اليوم — ${esc(dq.verdict)}`, body: `<div class="kv">
      رب اليوم: <b>${esc(dq.dayRuler)}</b> · حاكم الساعة: <b>${esc(dq.hourRuler)}</b><br>
      منزلة القمر: ${AR(dq.mansion.n)} ${esc(dq.mansion.name)} — روحانيّتها «${esc(dq.mansion.roohaniyya)}»<br>
      <b>يصلح لـ:</b> ${dq.goodFor.map(esc).join("، ")}<br>
      <b>لا يصلح لـ:</b> ${dq.badFor.map(esc).join("، ")}</div>
      <div class="gloss" style="margin-top:.3rem"><b>ماذا تفعل بهذا؟</b> اختر من أعمالك اليوم ما يقع تحت «يصلح لـ»، وأجِّل ما يقع تحت «لا يصلح لـ» إن استطعت.</div>`,
      basis: `نقاط = تزايد القمر (${ms.waxing ? "+" : "−"}) + خلوّ سيره + روحانيّة المنزلة + طبع رب اليوم = ${AR(dq.score)}.` })}
  </div>
  <p class="kv" style="margin-top:.5rem">تفصيلٌ فنّيٌّ إضافيٌّ (البيوت، الأنظار، سهام العرب، درجات البروج، الرأس والذنب، طبع الطالع، مواقع الكواكب، أحكام العالم) بلا توجيهٍ عمليٍّ مباشر — انتقل إلى «معلوماتٌ فقط» بالمرجع.</p>`;

  // ── حكم السؤال + توقّع السنة ─────────────────────────────────────
  const hor = c.question ? falak.horary(c.question, c.now, c.lat, c.lon) : null;
  let bAsc = 100; try { bAsc = falak.ascendant(c.birth, c.lat, c.lon).longitude; } catch {}
  const pf = falak.annualProfection(c.birth, c.now, bAsc);
  const fd = falak.firdaria(c.birth, c.now);
  let am = null; try { am = falak.almuten(c.birth, c.lat, c.lon); } catch {}
  const el = c.question ? falak.election(falak.classifyAstroTopic(c.question), c.now, new Date(new Date(c.now).getTime() + 3 * 864e5), c.lat, c.lon) : null;
  $("#natal", main).innerHTML = `<div class="grid wide">
    ${card({ title: "توقّع السنة (الانتهاء)", k: `عمرك ${AR(pf.age)}`,
      body: `<div class="kv">بيت السنة: <b>${AR(pf.profectedHouse)} — ${esc(pf.houseName)}</b> (${esc(pf.profectedSign)})<br>
        حاكم السنة: <b>${esc(pf.yearLord)}</b> — ${esc(pf.governs)}<br>
        ${esc(pf.note)}</div>
        <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> يخبرك أيُّ مجالِ حياةٍ (${esc(pf.houseName)}) هو الأبرزُ لك هذه السنةَ تحديدًا، وأيُّ كوكبٍ (${esc(pf.yearLord)}) يحكمها — استعمِلها لفهم لماذا تكثر أحداثُ هذا المجال معك الآن، لا كموعدٍ تعمل به.</div>`,
      basis: "بيت السنة = (العمر mod 12) + 1، وبرجُه من طالع مولدك، وحاكمُ البرج = «حاكم السنة». طريقةٌ ميكانيكيّةٌ من كتب النتائج السنوية." })}
    ${card({ title: "الفردار (فترة العمر)", k: `${AR(fd.ageYears)} سنة`,
      body: `<div class="kv">الحكم الأكبر: <b>${esc(fd.majorLord)}</b> (${esc(fd.majorGoverns)}) — ${AR(fd.yearsIntoMajor)} من ${AR(fd.majorLength)} سنة<br>
        الحكم الفرعيّ الآن: <b>${esc(fd.minorLord)}</b> — ${esc(fd.minorGoverns)}</div>
        <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> مثل توقّع السنة أعلاه لكن بحقبةٍ أطول من العمر — فهمٌ لطابع مرحلتك الحاليّة (${esc(fd.majorGoverns)})، لا توصيةَ عمل.</div>`,
      basis: "الفردارات: فتراتٌ حاكمةٌ بأطوالٍ ثابتة (الشمس ١٠، الزهرة ٨، عطارد ١٣…) تدور مع العمر." })}
    ${am ? card({ title: "المؤتمن — الكوكبُ الأعظمُ على طالعك كلِّه", k: `${esc(am.planet)} (${AR(am.score)} نقطة)`,
      body: `<div class="kv">هذا الكوكبُ (${esc(am.planet)}) هو الأقوى كرامةً عبر أربع نقاطٍ حسّاسةٍ من مولدك معًا (الطالع والشمس والقمر وسهم السعادة) — لا بيتٍ واحدٍ بعينه. طبعُه عمومًا: <b>${PLANETS_INFO[am.planet]?.benefic === true ? "سعدٌ" : PLANETS_INFO[am.planet]?.benefic === false ? "نحسٌ" : "متغيّرٌ بحسب قرانه"}</b>، ودلالاتُه: ${esc(PLANETS_INFO[am.planet]?.theme || "—")}.${am.tie ? ` <br>(تعادلٌ في النقاط مع: ${am.tie.filter((p) => p !== am.planet).map(esc).join("، ")} — النتيجةُ غيرُ حاسمةٍ تمامًا هذه المرّة.)` : ""}</div>
        <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> هذا أقربُ ما في علم الفلك التقليديّ لفكرة «الكوكب الحاكم على حظّك العامّ» ك صفةٍ ملازمةٍ لك — اقرأ دلالاتِه أعلاه كطابعٍ عامّ لحياتك، لا كحكمٍ على يومٍ أو سؤالٍ بعينه (لذلك موجودٌ غيرُه في هذه الصفحة وغيرها).</div>`,
      basis: `${esc(am.note)} ترتيبُ الكواكب كاملًا: ${am.ranking.map((r) => `${esc(r.planet)}=${AR(r.score)}`).join("، ")}.` }) : ""}
  </div>`;
  $("#horary", main).innerHTML = `<div class="grid wide">
    ${hor ? card({ title: `حكمُ المسألة`, k: `${esc(hor.topic)}`,
      body: `<div class="qline">المسألة: <b>«${esc(c.question)}»</b></div>
        <div class="big">${esc(hor.verdict)}${hor.timing ? ` — ${esc(hor.timing.text)}` : ""}</div>
        <div class="kv" style="margin-top:.4rem">الطالع: <b>${esc(hor.ascendant)}</b> (حاكمُه ${esc(hor.ascLord)})؛ بيتُ المسألة: <b>${AR(hor.quesited.house)} — ${esc(hor.quesited.name)}</b> في ${esc(hor.quesited.sign)} (حاكمُه ${esc(hor.quesited.lord)}).<br>
        ${hor.perfection ? `اتّصالٌ مقبلٌ بين الدليلين: ${esc(hor.perfection.between.join(" — "))} (${esc(hor.perfection.aspect)}).` : hor.lightTransfer ? `${esc(hor.lightTransfer.kind)}: ${esc(hor.lightTransfer.text)}` : "لا اتّصالَ مقبلًا بين الدليلين."}<br>
        القمر: ${esc(hor.moon.phase)}${hor.moon.voidOfCourse ? " — خالي السير" : ""}.
        ${hor.timing ? `<br>مقياسُ الزمن: <b>${esc(hor.timing.text)}</b> (من ${esc(hor.timing.fromPlanet)}).` : ""}
        ${hor.disease ? `<br>جنسُ العلّة (من ${esc(hor.disease.from)}): <b>${esc(hor.disease.nature)}</b> — ${esc(hor.disease.diseases)}` : ""}</div>`,
      basis: `دليلُ السائل (حاكمُ الطالع + القمر) ودليلُ المطلوب (حاكمُ بيته + كوكبُه الطبيعيّ)، ثمّ اتّصالٌ مقبلٌ أو نقلُ نورٍ أو جمعُه، ثمّ نقاطُ الكرامة والاحتراق وخلوّ السير ودرجاتِ البروج. تفصيلُ العوامل: ${hor.factors.map((f) => f).join(" | ")}`,
      reveal: traceText(hor.trace),
      vs: [`«كشف طالعُك أنّ: ${esc(hor.verdict)}»`, `الحكم = مجموع نقاطٍ من جداول ثابتة (${AR(hor.score)}). بدّل ساعةَ السؤال أو صياغتَه ⇒ طالعٌ آخرُ ⇒ حكمٌ آخر.`]
    }) : `<div class="gloss">اختر سؤالًا من «بطاقتي» ليظهر حكمُه الفلكيّ.</div>`}
    ${el ? card({ title: `اختيار وقتٍ لـ«${esc(el.topic)}»`, k: `كوكبه ${esc(el.purposePlanet)}`,
      body: `<div class="kv">${el.best.map((w) => `<b>${new Date(w.start).toLocaleString("ar", { dateStyle: "short", timeStyle: "short" })}</b> — ساعة ${esc(w.hourRuler)} · نقاط ${AR(w.score)}`).join("<br>")}</div>
        <div class="gloss">${esc(el.note)}</div>`,
      basis: "يُمسَح كلُّ ساعةٍ في نافذةٍ ويُرتَّب بحسب: مطابقة حاكم الساعة لكوكب الغرض + جودة اليوم + كرامة الكوكب + سلامته من الاحتراق." }) : ""}
  </div>`;

  // ── أحكام العالم (ج٤): الفصل / الطقس / الغلاء ─────────────────────
  $("#hours", main).innerHTML = card({ title: `${esc(ph.dayRuler)} — ${new Date(ph.sunrise).toLocaleDateString("ar")}`,
    body: `<div style="overflow-x:auto"><table class="tbl"><tr><th>#</th><th>الطور</th><th>الحاكم</th><th>من</th><th>إلى</th></tr>
      ${ph.hours.map((h) => `<tr><td>${AR(h.i)}</td><td>${esc(h.phase)}</td><td>${esc(h.ruler)}</td>
        <td>${new Date(h.start).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</td>
        <td>${new Date(h.end).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}</td></tr>`).join("")}</table></div>
      <div class="kv" style="margin-top:.4rem"><b>كيف تستعمل هذا الجدول؟</b> إن أردت فعلَ شيءٍ يناسب كوكبًا معيّنًا (كتابة وفقٍ، عزيمة، طلب حاجة)، اختر ساعةً حاكمُها ذلك الكوكب من العمود الثالث، وابدأ عملَك بين وقتَي «من» و«إلى» المذكورَين.</div>` });
  wireCards(main);
};

// 10) الأسماء والخدّام ──────────────────────────────────────────────
PANELS.asma = (main) => {
  main.innerHTML = `${head('asma', 'الأسماء والخدّام')}`;
  if (!gate(main)) return;
  main.innerHTML += subjectBar(ctx()) + `<div class="form"><button class="btn" id="ag">اقرأ اسمي</button></div><div id="aout"></div>`;
  $("#ag", main).onclick = () => {
    const c = ctx();
    const r = ak.reading(c.name, c.mother);
    $("#aout", main).innerHTML = `<div class="grid wide">${card({
      title: `«${esc(r.input.name)} / ${esc(r.input.mother)}»`, k: "÷ ٤ · ٧ · ١٢ · ٢٨",
      body: `<div class="big">${esc(r.planet.name)}</div>
        <div class="kv">المجموع <b>${AR(r.values.total)}</b> · العنصر <b>${esc(r.element)}</b> · البرج <b>${esc(r.sign.name)}</b> · المنزلة <b>${esc(r.mansion.name)}</b><br>
        طبع الحروف الغالب: <b>${esc(r.dominantLetterNature)}</b><br>
        المَلَك: <b>${esc(r.servant.angelOfPlanet)}</b> · روح الكوكب: <b>${esc(r.servant.spiritOfPlanet)}</b> · الخادم المُصرَّف: <b>${esc(r.servant.derivedServantName)}</b><br>
        اليوم المختار: <b>${esc(r.timing.day)}</b> ساعة <b>${esc(r.timing.hourRuler)}</b></div>
        <div class="warn">البخور: ${esc(r.incenseNote || "—")}</div>`,
      reveal: traceText(r.trace),
      vs: [`«اسمك تحت ${esc(r.planet.name)}، خادمك ${esc(r.servant.derivedServantName)}، يومك ${esc(r.timing.day)}.»`,
        `${AR(r.values.total)} = جُمّل الاسم + جُمّل الأمّ\nقسمةٌ على ٤ و٧ و١٢ و٢٨ ⇒ فهرسةٌ في جداول ثابتة.`]
    })}</div>
    <h2>كيف تسخّر خادمَك هذا وتستفيد منه — العملُ كاملًا</h2>
    ${(() => { try { return taskhirOpFullHTML(taskhir.operation("تسخير_خادم", { name: c.name, mother: c.mother, when: c.now, lat: c.lat, lon: c.lon })); } catch (e) { return `<div class="warn">${esc(e.message)}</div>`; } })()}
    <div class="grid wide">
    ${(() => { const sr = ak.spiritRank(c.name, c.mother); const tax = ak.jinnTaxonomy(); return card({
      title: "رتبة «ما بك» على طريقة الرقاة (العفاريت والجنّ)", k: esc(sr.rank.name),
      body: `<div class="kv">جُمّل الاسم + الأمّ = <b>${AR(sr.total)}</b> ← ٪ ٦ ← المرتبة «<b>${esc(sr.rank.name)}</b>»: ${esc(sr.rank.def)}</div>
        <div class="kv" style="margin-top:.4rem">المراتبُ الستُّ: ${tax.ranks.map((x) => `<span class="mono">${esc(x.name)}</span>`).join(" ← ")}</div>
        <div class="gloss">${esc(tax.origin)}<br>${esc(sr.note)}</div>
        <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> هذه بطاقةُ معرفةٍ لا تشخيصٌ ولا علاج — تخبرك بالمرتبة التي يضعها هذا العرفُ لاسمك حسب حسابٍ رقميّ، لا فحصًا لحالتك الفعليّة. إن كان لديك شكوى حقيقيّة (وسواس، أرق، إلخ) ${navLink("diagnosis", "افتح «التشخيص»")} بدل الاعتماد على هذا الرقم وحده.</div>`,
      basis: "«العفاريت والجنّ» للطوخي ص ٧: جنّيّ ← عامر ← أرواح ← شيطان ← مارد ← عفريت. الراقي يشتقّ «رتبتك» من رقمٍ لا من فحص.",
      reveal: traceText(sr.trace),
    }); })()}
    </div>`;
    wireCards(main);
  };
  $("#ag", main).click();
};

// 11) الطلاسم ──────────────────────────────────────────────────────
PANELS.talismans = (main) => {
  const c = ctx();
  main.innerHTML = `${head('talismans', 'الطلاسم')}
    <p class="kv">طلاسمُ مسمّاةٌ من الكتاب — كلُّها مرسومةٌ SVG بلا صور خارجية. أحدَ عشرَ منها عامّةٌ (لأيّ أحد)، وواحدٌ («وفق الاسم») مبنيٌّ على اسمك أنت تحديدًا — موضَّحٌ لكلِّ طلسمٍ: غرضُه، وكيف يُستعمَل فعليًّا.</p>
    <div class="grid" id="tg"></div>`;
  $("#tg", main).innerHTML = talNamed.renderAll(c.name).map((t) =>
    card({ title: t.name, k: t.id === "wafq-name" ? "خاصٌّ باسمك" : "عامّ",
      body: t.svg.replace("<svg", '<svg class="seal big printable"') +
        `<button class="btn sm sec printbtn" type="button">🖨️ اطبع هذا الطلسم / احفظه PDF</button>
         <div class="kv" style="margin-top:.5rem"><b>الغرض:</b> ${esc(t.purpose)}</div>
         <div class="kv" style="margin-top:.3rem"><b>كيف يُستعمَل:</b> ${esc(t.usage || "—")}</div>` })
  ).join("");
  wireCards(main);
};

// 12) الأرواح والملوك ──────────────────────────────────────────────
// أسماءُ الملائكة الموكَّلة بكوكبٍ (PLANET_ANGELS) تتطابق مع اثنين من رؤساء
// الملائكة (جبريل=القمر، ميكائيل=عطارد) — فهذان فقط عمليّان (يُستحضَران ضمن
// عمل تسخير)؛ الباقي (إسرافيل، عزرائيل، رضوان، مالك، منكر ونكير، رقيب وعتيد،
// حملة العرش) أسماءٌ دينيّةٌ ثابتة لا عملَ سحريًّا مرتبطًا بها في هذه الكتب.
const OPERATIONAL_ANGEL_NAMES = new Set(Object.values(spirits.PLANET_ANGELS));
function spiritCards(arr, type) {
  return arr.map((e) => {
    const c = art.card({ ...e, kind: e.kind || type });
    let extra = "";
    if (type === "king") {
      extra = `<div class="kv" style="margin-top:.5rem">
        <b>يومُه:</b> ${esc(e.day)} (كوكبُه ${esc(e.planet)}) · <b>كُنيتُه:</b> ${esc(e.kunya)}<br>
        <b>لونُه:</b> ${esc(e.color)} · <b>بخورُه:</b> ${esc(e.incense)}<br>
        <b>مجالُه:</b> ${esc(e.domain)}<br>
        <b>مرافقُه من الملائكة:</b> ${esc(e.comrade)}</div>
        <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> هذا أحد الملوك السبعة، كلٌّ منهم يُستحضَر عمليًّا (بيومه وساعته وبخوره أعلاه) ضمن عملِ «التسخير والتصريف» — افتحه واختر غرضًا لترى العملية الكاملة معه.</div>`;
    } else if (type === "planet-angel") {
      extra = `<div class="kv" style="margin-top:.5rem"><b>يومُه:</b> ${esc(e.dayName || "—")} (يوم كوكبه)</div>
        <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> ملَكٌ عمليّ: يُستحضَر ضمن عملِ «التسخير والتصريف» لأيّ غرضٍ يخصّ كوكبَه — ${navLink("taskhir", "افتحه لترى اليوم والساعة والبخور كاملةً")}.</div>`;
    } else if (type === "arch") {
      const operational = OPERATIONAL_ANGEL_NAMES.has(e.name.split(" ")[0].replace(/[()]/g, ""));
      extra = e.note ? `<div class="gloss" style="margin-top:.4rem">${esc(e.note)}</div>` : "";
      if (operational) {
        extra += `<div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> هذا الملَك موكَّلٌ بكوكبٍ (راجع «ملائكة الكواكب السبعة» تحت) — يُستحضَر عمليًّا ضمن ${navLink("taskhir", "«التسخير والتصريف»")}.</div>`;
      } else if (!e.hasRealPractice) {
        extra += `<div class="kv" style="margin-top:.4rem"><b>بصراحة:</b> اسمٌ دينيٌّ للمعرفة فقط — بحثتُ في نصّ الكتاب نفسِه فلم أجد عملًا أو يومًا أو طباعةً مرتبطةً باسمه تحديدًا؛ لا تتوقّع استعمالًا عمليًّا هنا.</div>`;
      }
    } else if (type === "marid") {
      extra = `<div class="kv" style="margin-top:.4rem"><b>بصراحة:</b> شخصيّةٌ من القَصص والتراث الشعبيّ، لا استحضارَ ولا طباعةَ لها هنا — للمعرفة فقط.</div>`;
    } else if (type === "shaytan") {
      extra = `<div class="kv" style="margin-top:.4rem"><b>بصراحة:</b> هذا شيطانٌ يُستعاذ من شرّه (بذكر الله عند العمل المذكور)، لا كيانٌ يُستحضَر أو يُستفاد منه — عكسُ بقيّة هذه الصفحة تمامًا.</div>`;
    }
    return card({
      title: c.name, k: c.planet || "",
      body: `<div class="imgslot" id="slot-${esc(c.slug)}">${c.sigilSvg.replace("<svg", '<svg class="seal"')}</div>
        <div class="kv" style="margin-top:.5rem">${esc(c.description || "")}</div>${extra}
        <details style="margin-top:.4rem"><summary class="kv" style="cursor:pointer">برومبت الصورة + اسم الملف</summary>
          <div class="kv mono" style="font-size:.72rem;margin-top:.3rem">assets/spirits/${esc(c.slug)}.png</div>
          <div class="kv" style="font-size:.78rem;margin-top:.3rem">${esc(c.imagePrompt)}</div></details>`
    });
  }).join("");
}
// أسماءُ رؤساء الملائكة الفعليّون هنا: عمليّون (يُستحضَرون) أو لهم عملٌ حقيقيٌّ
// موثَّقٌ باسمهم (hasRealPractice) — الباقي (بلا عملٍ ولا استحضار) انتقل كاملًا
// إلى «معلوماتٌ فقط» فلا يبقى مكرَّرًا هنا ولا يبدو كأنّ له استعمالًا.
const ARCHANGELS_ACTIVE = spirits.ARCHANGELS.filter((e) =>
  OPERATIONAL_ANGEL_NAMES.has(e.name.split(" ")[0].replace(/[()]/g, "")) || e.hasRealPractice);
PANELS.spirits = (main) => {
  main.innerHTML = `${head('spirits', 'الأرواح والملوك')}
    <p class="kv">كلُّ من في هذه الصفحة عمليٌّ: يُستحضَر ضمن «التسخير والتصريف»، أو له عملٌ حقيقيٌّ موثَّقٌ باسمه (موضَّحٌ ببطاقته). الأسماءُ الدينيّةُ التي لا عملَ سحريًّا مرتبطًا بها (رضوان، مالك، إسرافيل...) والقَصصُ الشعبيّةُ (المردة، أبناء إبليس) انتقلت إلى «معلوماتٌ فقط» بالمرجع — هون بس اللي فعلًا بتفتح له «التسخير» وتسويه.</p>
    <h2>الملوك السبعة (عمليّون)</h2><div class="grid" id="g1"></div>
    <h2>توزيعُ أربعةٍ منهم على الجهات الأصليّة</h2>
    <p class="kv">مرجعٌ إضافيٌّ فقط (لا يُستعمَل وحده في عمل)؛ الجهةُ الفعليّةُ لكلّ عملٍ مذكورةٌ ببطاقة العمل نفسِه في «التسخير».</p>
    <div style="overflow-x:auto"><table class="tbl" id="gdir"></table></div>
    <h2>رؤساء الملائكة (عمليّون أو لهم عملٌ موثَّق)</h2><div class="grid" id="g2"></div>
    <h2>ملائكة الكواكب السبعة (عمليّون)</h2><div class="grid" id="g3"></div>`;
  $("#g1", main).innerHTML = spiritCards(spirits.SEVEN_KINGS, "king");
  $("#gdir", main).innerHTML = `<tr><th>الجهة</th><th>الملِك</th><th>الكوكب</th></tr>` +
    spirits.DIRECTION_KINGS.map((d) => `<tr><td>${esc(d.direction)}</td><td>${esc(d.king)}</td><td>${esc(d.planet)}</td></tr>`).join("") +
    `<tr><td colspan="3" class="gloss">${esc(spirits.DIRECTION_KINGS_NOTE)}</td></tr>`;
  $("#g2", main).innerHTML = spiritCards(ARCHANGELS_ACTIVE, "arch");
  $("#g3", main).innerHTML = spiritCards(Object.entries(spirits.PLANET_ANGELS).map(([planet, name]) => ({ name, planet, role: `الموكَّل بكوكب ${planet}`, dayName: PLANETS_INFO?.[planet]?.day })), "planet-angel");
  // حاول تحميل الصور إن وُجدت
  main.querySelectorAll(".imgslot").forEach((slot) => {
    const slug = slot.id.replace("slot-", "");
    const img = new Image();
    img.onload = () => { slot.innerHTML = ""; slot.appendChild(img); };
    img.onerror = () => {};
    img.src = `../assets/spirits/${slug}.png`;
  });
};

// 13) التسخير ──────────────────────────────────────────────────────
PANELS.taskhir = (main) => {
  main.innerHTML = `${head('taskhir', 'التسخير والتصريف')}`;
  if (!gate(main)) return;
  const goals = taskhir.listGoals();
  const GOALS_NEED_TARGET_T = ["محبة", "تفريق", "تهييج", "حجب", "أذى", "ردّ_غائب"];
  main.innerHTML += subjectBar(ctx()) + `<div class="form">
      <div class="fld"><label>الغاية</label><select id="tg">${goals.map((g) => `<option value="${g.id}">${esc(g.label)}</option>`).join("")}</select></div>
      <div class="fld"><label>نصّ الحاجة (يُقال في العزيمة، ومنه يُحسَب عددُ التكرار)</label><select id="treq"></select></div>
      <button class="btn" id="tgo">ركّب العمل كاملًا</button>
    </div>
    <div class="form" id="ttarget-wrap" hidden>
      <div class="fld"><label>اسم الطرف الآخر (بينك وبينه)</label><input id="ttarget" placeholder="اسمه/اسمها"></div>
      <div class="fld"><label>اسم أمّه/أمّها <span class="gloss">(اختياري)</span></label><input id="ttarget-mother"></div>
    </div>
    <div id="tout"></div>`;
  const syncTargetVisibility = () => { $("#ttarget-wrap", main).hidden = !GOALS_NEED_TARGET_T.includes($("#tg", main).value); };
  const syncRequestOptions = () => {
    const g = goals.find((x) => x.id === $("#tg", main).value) || goals[0];
    const opts = [...(g.requestOptions || [g.intent]), "قضاء الحاجة وتيسير الأمر", "حضور الخادم وطاعته"];
    $("#treq", main).innerHTML = opts.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join("");
  };
  $("#tg", main).addEventListener("change", () => { syncTargetVisibility(); syncRequestOptions(); });
  syncTargetVisibility(); syncRequestOptions();
  $("#tgo", main).onclick = () => {
    const c = ctx();
    const goalId = $("#tg", main).value || goals[0].id;
    const tName = $("#ttarget", main)?.value.trim();
    let op;
    try {
      op = taskhir.operation(goalId, {
        name: c.name, mother: c.mother, request: $("#treq", main).value, when: c.now, lat: c.lat, lon: c.lon,
        ...(GOALS_NEED_TARGET_T.includes(goalId) && tName ? { targetName: tName, targetMother: $("#ttarget-mother", main)?.value.trim() } : {})
      });
    }
    catch (e) { $("#tout", main).innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    const targetWarn = (GOALS_NEED_TARGET_T.includes(goalId) && !tName)
      ? `<div class="warn">هذا العملُ نوعُه بين طرفين — اكتب اسمَ الطرف الآخر فوق أوّلًا، وإلّا سيبقى الخاتمُ والعزيمةُ باسمك وحدَك لا بينكما.</div>` : "";
    $("#tout", main).innerHTML = targetWarn + taskhirOpFullHTML(op) + `
    <h2>المندل (الاستحضار بالصبيّ والمرآة)</h2><div id="mandal"></div>
    <h2>المندل النفسي — جدول التنفيذ (٤٦ يومًا: رياضة ٩ + خلوة ٢٨ + رياضة ٩)</h2><div class="grid wide" id="mandalnafsi"></div>
    <h2>تصريف خدّام السماء الأولى — سبعة مقدَّمين (السحر العظيم)</h2>
    <p class="kv">طريقةٌ أخرى مستقلّةٌ عن عمليّة «${esc(op.goal.label)}» أعلاه — لا تُضاف إليها بل تُستعمَل بدلًا منها إن أردتَ الاستعانةَ بأحد هؤلاء السبعة تحديدًا. كلُّ بطاقةٍ فيها غرضُها وعملُها الخاصّ بها كاملًا.</p>
    <div class="grid" id="muqaddam"></div>
    <h2>تصريف السماوات من الثانية إلى السابعة (السحر العظيم)</h2>
    <p class="kv">استمرارٌ لنفس الطريقة أعلاه بمقدَّمين أعلى مرتبةً — كلُّ بطاقةٍ عملٌ مستقلٌّ بذاته له غرضُه، لا خطواتٌ متتابعة.</p>
    <div class="grid" id="heavens"></div>
    <h2>الأقلام السرّيّة</h2>
    <p class="kv">مرجعُ تشفيرٍ فقط: كلّ «قلم» طريقةٌ لكتابة الحروف بشكلٍ مختلف. يُستعمَل حين تحتاج تكتب اسمًا أو نصًّا مشفَّرًا داخل خاتمٍ أو وفقٍ (كما في «الخاتم بقلمٍ سرّيّ» أعلاه)، لا كعملٍ قائمٍ بذاته.</p>
    <div id="pens"></div>`;
    const md = taskhir.mandal(c.when);
    $("#mandal", main).innerHTML = card({ title: `مندل يوم ${esc(md.day)}`, k: esc(md.king || "—"),
      body: `<div class="kv"><b>الوسائط</b> (يُختار واحدٌ منها لينظر فيه الرائي، لا تُجمَع معًا): ${md.medium.map(esc).join("، ")}
        <span class="gloss">(«مرآةٌ مصقولةٌ سوداءُ الظهر» = مرآةٌ عاديّة طُليَ ظهرُها بلونٍ أسود فتصير كالمرآة السوداء المستعملة تقليديًّا في التحديق والرؤى)</span><br>
        <b>الرائي:</b> ${esc(md.seer)}<br>
        <b>الإعداد:</b><ol>${md.setup.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        <b>صيغة الفتح:</b> ${esc(md.openFormula)}<br>
        <b>المشاهد المُلقَّنة بالترتيب:</b> ${md.scenes.map(esc).join(" ← ")}<br>
        <b>الصرف:</b> ${esc(md.dismissal)}</div>
        <div class="warn">${esc(md.debunk)}</div>` });

    const mn = taskhir.mandalNafsi({ when: c.now }); // جدولٌ يبدأ من يومِ الاستشارة لا من الميلاد
    $("#mandalnafsi", main).innerHTML =
      card({
        title: mn.heading, k: `يبدأ ${esc(mn.startSunday)} · ينتهي ${esc(mn.shukrDay)}`,
        body: `<div class="kv">${esc(mn.premise)}</div>
          <div class="kv" style="margin-top:.3rem">تاريخُ البدءِ المطلوب: <b>${esc(mn.startRequested)}</b> ⇒ أوّلُ أحدٍ بعده: <b>${esc(mn.startSunday)}</b> · المجموع <b>${AR(mn.totalDays)}</b> يومًا · ركعتا الشكر يوم <b>${esc(mn.shukrDay)}</b>.</div>
          ${mn.phases.map((p) => `<div class="kv" style="margin-top:.6rem;border-top:1px solid var(--line);padding-top:.4rem">
            <b>${esc(p.name)}</b> — ${AR(p.days)} أيّام · <b>${esc(p.from)}</b> ← → <b>${esc(p.to)}</b>
            ${p.open.length ? `<ul style="margin:.3rem 0">${p.open.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
            ${p.incense ? `<div>البخور: ${p.incense.map(esc).join("، ")}${p.incenseNote ? ` <span class="gloss">(${esc(p.incenseNote)})</span>` : ""}</div>` : ""}
            ${p.sarfAmmar ? `<div>صرف العمّار: ${esc(p.sarfAmmar.recite)} — «${esc(p.sarfAmmar.say)}» ×${AR(p.sarfAmmar.count)}</div>` : ""}
            ${p.daily.length ? `<div>يوميًّا:</div><ul style="margin:.2rem 0">${p.daily.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
            ${p.fast ? `<div>الصيام: ${esc(p.fast)}</div>` : ""}
            ${p.posture ? `<div class="gloss">${esc(p.posture)}</div>` : ""}
            ${p.successSigns ? `<div>علاماتُ النجاح:</div><ul style="margin:.2rem 0">${p.successSigns.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
            ${p.close ? `<div><b>الختام:</b> ${esc(p.close)}</div>` : ""}
          </div>`).join("")}
          <div class="kv" style="margin-top:.6rem"><b>المرآة:</b> ${esc(mn.mirror.material)}، ${esc(mn.mirror.shape)}، كلُّ ضلعٍ ${AR(mn.mirror.sideCm)}سم — ${esc(mn.mirror.back)}؛ ${esc(mn.mirror.mount)}.</div>
          <div class="kv" style="margin-top:.4rem"><b>العزيمة:</b> «${esc(mn.azima)}»</div>
          <div class="kv" style="margin-top:.4rem"><b>الخاتم (الوفق المتّسع ٩×٩، الثابت ${AR(mn.wafqConstant)}):</b></div>
          <div style="overflow-x:auto"><table class="tbl mono" style="font-size:.8rem">${mn.wafq.map((row) => `<tr>${row.map((x) => `<td>${AR(x)}</td>`).join("")}</tr>`).join("")}</table></div>
          <div class="gloss">${esc(mn.wafqNote)}</div>
          <div class="kv" style="margin-top:.3rem">${esc(mn.spareTime)}</div>
          <div class="gloss">${esc(mn.failNote)}</div>`,
        reveal: mn.reveal, source: mn.source,
      });

    $("#muqaddam", main).innerHTML = taskhir.listMuqaddamun().map((mq) => {
      const fh = taskhir.firstHeaven(mq.n, { request: $("#treq", main).value });
      return card({ title: `${esc(fh.name)}${fh.chief !== "—" ? " — " + esc(fh.chief) : ""}`, k: `تكرار ${AR(fh.repeat)}`,
        body: `<div class="kv"><b>الغرض:</b> ${esc(fh.purpose)}<br><b>العمل:</b> ${esc(fh.ritual)}</div>
          ${fh.army ? `<div class="kv" style="margin-top:.4rem"><b>عسكرُه</b> (أي: الأعوانُ الذين تحت إمرته، ${AR(fh.army.names.length)} اسمًا — تُذكَر أسماؤهم في العزيمة كإحدى الأقسام، لا حاجةَ لتكرار كلٍّ منها لوحده): <span class="gloss">${esc(fh.army.role)}</span><br><span class="mono" style="font-size:.82rem;line-height:1.9">${fh.army.names.map(esc).join(" · ")}</span></div>` : ""}`,
        reveal: traceText(fh.trace) + (mq.n === 7 ? "\n\n" + fh.secondHeavenNote : "") });
    }).join("");
    $("#heavens", main).innerHTML = [
      card({ title: "مطلعُ «سفر آدم» — صفةُ السماواتِ السبع", k: "نصٌّ وصفيّ",
        body: `<div class="kv gloss">${esc(taskhir.safarAdamIntro().text)}</div>` }),
      card({ title: "السماء الثانية — خدّام القمر (اثنتا عشرةَ درجة)", body: `<div class="kv">
        ${taskhir.secondHeavenDegrees().map((d) => `الدرجة ${AR(d.degree)}: <b>${esc(d.purpose)}</b>`).join("<br>")}<br>
        <span class="gloss">${esc(taskhir.secondHeavenDegree(12).note)}</span></div>`,
        reveal: taskhir.secondHeavenDegrees().map((d) => { const x = taskhir.secondHeavenDegree(d.degree); return `الدرجة ${d.degree}: ${x.purpose}\n${x.ritual}`; }).join("\n\n") }),
      ...[3, 4, 5, 6].map((n) => { const h = taskhir.heaven(n);
        return card({ title: esc(h.heading), k: esc(h.structure.slice(0, 28)),
          body: `<div class="kv">${h.chiefs ? `<b>المقدَّمون:</b> ${h.chiefs.map(esc).join("، ")}${h.seasonChiefs ? ` · وعلى الفصول: ${h.seasonChiefs.map(esc).join("، ")}` : ""}<br>` : ""}
            ${h.ops.map((o) => `<b>${esc(o.purpose)}</b><br>${esc(o.ritual)}`).join("<br><br>")}</div>`,
          reveal: traceText(h.trace) }); }),
      (() => { const sf = taskhir.sayfAllah(); return card({ title: esc(sf.heading), k: "سيف الله القاطع", cls: "wide-span",
        body: `<div class="kv">${esc(sf.virtue)}</div>
          <div class="kv" style="margin-top:.4rem"><b>الشرط:</b> ${esc(sf.conditions)}</div>
          <div class="kv" style="margin-top:.4rem"><b>ما يُعمَلُ به:</b> ${esc(sf.powers)}</div>
          <div class="kv" style="margin-top:.5rem"><b>أعمالُ السيف (${AR(sf.operations.length)}):</b></div>
          <ol class="kv">${sf.operations.map((o) => `<li><b>${esc(o.purpose)}</b> — ${esc(o.ritual)}</li>`).join("")}</ol>
          <div class="kv" style="margin-top:.5rem"><b>«السيف» نفسُه</b> نصٌّ واحدٌ طويلٌ من الأسماء المتتالية (أسماءُ السماء السابعة)، لا معنى له كجملةٍ عاديّة — هو أشبه بمفتاحٍ طويل. اطّلع عليه هون:</div>
          <details style="margin-top:.3rem"><summary class="kv" style="cursor:pointer">افتح نصّ السيف الكامل (${AR(sf.names.length)} حرفًا)</summary>
            <div class="kv mono" style="font-size:.8rem;line-height:2;margin-top:.4rem;word-break:break-word">${esc(sf.names)}</div></details>
          <div class="kv" style="margin-top:.6rem"><b>تطبيقاتُ السيف «من اسمٍ إلى اسمٍ» (${AR(sf.applications.length)}):</b> كلُّ سطرٍ بالجدول تحته يخصّ حاجةً معيّنة — تفتح نصّ السيف أعلاه، وتحدّد فيه المقطعَ المذكور بعمود «المقطع» (من الاسم الأوّل المذكور إلى الاسم الثاني بالضبط، لا السيفَ كلَّه)، ثمّ تفعل ما بعمود «الوسيط والعمل» بهذا المقطع تحديدًا (تكتبه، تقرؤه على شيءٍ، تعلّقه...):</div>
          <div style="overflow-x:auto"><table class="tbl" style="font-size:.82rem"><tr><th>الغرض</th><th>المقطع (بين هذين الاسمين في النصّ أعلاه)</th><th>الوسيط والعمل</th></tr>
          ${sf.applications.map((a) => `<tr><td>${esc(a.purpose)}</td><td class="mono">${esc(a.span)}</td><td>${esc(a.method)}</td></tr>`).join("")}</table></div>
          <div class="kv" style="margin-top:.4rem"><b>مراتبُ ملائكتِه:</b> الأربعة (${sf.hierarchy.four.map(esc).join("، ")}) ← الخمسة ← الثلاثة (${sf.hierarchy.three.map(esc).join(" ")}) ← الاثنا عشرَ من السماء السابعة.</div>
          <div class="kv" style="margin-top:.4rem"><b>مقدَّمو السخط والحمية والغضب:</b> ${Object.entries(sf.wrathChiefs).filter(([k]) => k !== "note").map(([k, v]) => `${esc(k)}: ${esc(v)}`).join("، ")} — ${esc(sf.wrathChiefs.note)}</div>
          <div class="kv" style="margin-top:.4rem"><b>صلاةُ يد الله:</b> ${esc(sf.handOfGod)}</div>
          <div class="kv" style="margin-top:.4rem">${esc(sf.closingSalam)}</div>
          <div class="kv" style="margin-top:.5rem"><b>نصُّ السيف:</b></div>
          <div class="mono" style="font-size:.9rem;line-height:1.8">${esc(sf.names)}</div>
          <div class="kv" style="margin-top:.4rem"><b>بعضُ تفسير السيف:</b> ${esc(sf.tafsirNames)}</div>`,
        reveal: esc(sf.recipientCriteria) + "\n\n" + esc(sf.revelation) + "\n\n" + esc(sf.note) }); })(),
    ].join("");
    $("#pens", main).innerHTML = taskhir.secretPens().map((p) => {
      const demo = taskhir.secretScript(c.name || "اسم", p.id);
      return card({ title: p.id, body: `<div class="kv">${esc(p.note)}<br>مثال «${esc(demo.source)}» ← <span class="mono" style="font-size:1.2rem">${esc(demo.text)}</span></div>` });
    }).join("");
    wireCards(main);
  };
  $("#tgo", main).click();
};

// 14) الخواصّ ──────────────────────────────────────────────────────
PANELS.khawass = (main) => {
  const c = ctx();
  const names = khawass.names();
  const mat = khawass.materia();
  const nfp = c.ready ? khawass.nameForPerson(c.name, c.mother) : null;
  main.innerHTML = `${head('khawass', 'الخواصّ')}
    <div class="grid wide">
      ${nfp ? card({ title: "اسمُك الحسنى الموافق", k: nfp.method,
        body: `<div class="big">${esc(nfp.name.name)} — قيمته ${AR(nfp.name.value)}</div><div class="kv">${esc(nfp.name.khassa)}</div>
          <div class="kv" style="margin-top:.4rem"><b>ماذا تفعل بهذا؟</b> هذا هو الاسمُ الحسنى الموافقُ لك عدديًّا خصّيصًا (لا لأحدٍ آخر بالصدفة نفسِها إلّا من شارَكك المجموع). خاصّتُه المذكورةُ أعلاه هي الأثرُ الذي يُنسَب لتكراره؛ الوِردُ العمليُّ (كم مرّة، متى) غيرُ مذكورٍ في هذا الكتاب لهذه الطريقة بعينها — إن أردتَ عددَ تكرارٍ محدَّدًا استعمل قيمتَه (${AR(nfp.name.value)}) نفسَها كعدد ذكرٍ يوميّ، وهو الاصطلاحُ الشائع عند من يستعمل هذه الطريقة.</div>`,
        basis: `(جُمّل «${esc(c.name)}» + جُمّل «${esc(c.mother)}») ÷ ٩٩، والباقي + ١ = ترتيب الاسم.` })
      : card({ title: "اسمُك الحسنى الموافق", body: `<div class="kv">املأ الاسم واسم الأمّ وتاريخ الميلاد في «بطاقتي» ليظهر.</div>` })}
      ${card({ title: "مطابقة عددٍ باسمٍ حسنى", body: `<div class="kv">أداةٌ عكسيّةٌ: عندك رقمٌ (وردَ في وفقٍ أو حسابٍ آخر) وتريد معرفةَ أيّ اسمٍ حسنى يساويه؟ اكتبه هنا:</div><div class="form" style="margin-top:.4rem"><input id="mv" value="66" style="min-width:120px"><button class="btn sm" id="mb">طابِق</button></div><div id="mo" class="kv"></div>` })}
    </div>
    <h2>الأسماء الحسنى (${AR(names.length)}) — بقيمها</h2>
    <p class="kv">اسمُك الموافق ظهر في البطاقة الأولى فوق؛ هذا الجدولُ الكاملُ (${AR(names.length)} اسمًا) مطويٌّ لأنّك عادةً لا تحتاج إلّا اسمَك — افتحه فقط لو أردت اختيارَ اسمٍ آخر بنفسك لغرضٍ معيّن، أو لمعرفة معنى «الخاصّة» التي تظهر باسمٍ ورد بنتيجةٍ أخرى بالموقع.</p>
    <details><summary class="kv" style="cursor:pointer">اعرض الأسماء الحسنى الـ${AR(names.length)} كاملةً</summary>
    <div style="overflow-x:auto;margin-top:.5rem"><table class="tbl"><tr><th>#</th><th>الاسم</th><th>كبير</th><th>صغير</th><th>الخاصّة</th></tr>
      ${names.map((n) => `<tr><td>${AR(n.index)}</td><td>${esc(n.name)}</td><td>${AR(n.value)}</td><td>${AR(n.saghir)}</td><td>${esc(n.khassa)}</td></tr>`).join("")}</table></div></details>
    <h2>خواصّ السور والآيات</h2><div class="grid">
      ${khawass.surahs().map((s) => card({ title: s.ref, k: s.also || "", body: `<div class="kv">${esc(s.uses)}</div>` })).join("")}</div>
    <h2>الأدعية والأحزاب</h2>
    <p class="kv">بطاقتان («حزب البحر»، «الصلاة المشيشية») فيهما نصُّهما الكاملُ جاهزًا للقراءة مباشرةً. باقي البطاقات فهرسٌ ووصفٌ فقط (نصُّها الكاملُ طويلٌ ولم يُتحقَّق منه هنا بدقّةٍ كافية) — اختر ما يوافق غرضَك من عمود «الغرض»، وابحث عن نصّه الكامل في مصدرٍ موثوق قبل قراءته إن لم يكن مذكورًا هنا.</p>
    <div class="grid">
      ${khawass.adiya().list.map((a) => card({ title: a.name, k: a.attrib,
        body: `<div class="kv"><b>الغرض:</b> ${esc(a.purpose)}<br><b>البنية:</b> ${esc(a.structure)}</div>` +
          (a.fullText
            ? `<div class="kv" style="margin-top:.5rem;border-top:1px solid var(--line);padding-top:.4rem"><b>النصُّ الكامل:</b></div><pre class="recite-text">${esc(a.fullText)}</pre><div class="gloss">${esc(a.fullTextSource || "")}</div>`
            : `<div class="kv" style="margin-top:.5rem"><b>ماذا تفعل بهذا؟</b> هذا وصفٌ فقط لا نصٌّ كامل — النصُّ الكاملُ الموثوق غيرُ مؤكَّدٍ هنا، ابحث عنه في مجاميع الأوراد المطبوعة قبل قراءته.</div>`) })).join("")}</div>
    <h2>البخور والأعشاب والأحجار</h2>
    <p class="kv">مرجعٌ لموادَّ تُذكَر باسمها في عمليّاتٍ أخرى بالموقع (التسخير، الأوفاق) — راجعه لتعرف كيف تُستعمَل مادّةٌ بعينها وهل هي سامّة قبل شرائها أو حرقها.</p>
    <div class="warn">${esc(mat.safety)}</div>
    <div style="overflow-x:auto;margin-top:.5rem"><table class="tbl"><tr><th>المادّة</th><th>الاستعمال</th><th>سامّ؟</th><th>ملاحظة</th></tr>
      ${[...mat.incense, ...mat.herbs, ...mat.stones].map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.use || "")}</td>
        <td>${m.toxic ? "☠ نعم" : "لا"}</td><td>${esc(m.note || "")}</td></tr>`).join("")}</table></div>
    <h2>الفتوح الرباني (النقشبندي والجيلاني) — الطريقة اليوميّة</h2><div class="grid wide" id="futuh"></div>
    <h2>كتاب اسم الله الأعظم (القسم الثاني من السحر العظيم)</h2><div class="grid wide" id="asmazam"></div>`;
  (() => {
    const b = abjad.bookOfNames(c.ready ? c.name : "");
    $("#asmazam", main).innerHTML = card({
      title: esc(b.heading), k: "علمُ البسطِ والكعب",
      body: `<div class="kv gloss">${esc(b.premise)}</div>
        <div class="kv" style="margin-top:.4rem"><b>البسطان:</b> ${b.methods.map((m) => `${esc(m.name)} (${esc(m.attrib)})`).join(" · ")}</div>
        <div class="kv" style="margin-top:.4rem"><b>يُجمَع للعمل ١١ اسمًا:</b> ${b.elevenNames.map(esc).join(" · ")}. <span class="gloss">${esc(b.twelfthNameNote)}</span></div>
        <div class="kv" style="margin-top:.4rem"><b>طريقة الكعب:</b><ol class="kv">${b.kaabMethod.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        <span class="gloss">مثالٌ محلول: «${esc(b.kaabMethod.workedExample.name)}» ⇒ بسطٌ ${esc(b.kaabMethod.workedExample.bast)} ⇒ عدّة ${AR(b.kaabMethod.workedExample.count)} ⇒ كعب ${AR(b.kaabMethod.workedExample.kaab)} ⇒ «${esc(b.kaabMethod.workedExample.resultWord)}» (${esc(b.kaabMethod.workedExample.resultMeaning)}). ${esc(b.kaabMethod.terseNote)}</span></div>
        ${b.forName ? `<div class="kv" style="margin-top:.4rem"><b>لاسمك «${esc(b.forName.name)}»:</b> بسطُه ${esc(b.forName.bast)} — عدّةُ حروفِه ${AR(b.forName.letterCount)} ⇒ الكعبُ ${AR(b.forName.kaab)}. <span class="gloss">${esc(b.forName.note)}</span></div>` : ""}
        <div style="overflow-x:auto;margin-top:.4rem"><table class="tbl"><tr><th>اليوم</th><th>السيّد</th><th>الخديم</th></tr>
        ${Object.entries(b.dayServants).map(([d, s]) => `<tr><td>${esc(d)}</td><td>${esc(s.sayyid)}</td><td>${esc(s.khadim)}</td></tr>`).join("")}</table></div>`,
      reveal: b.note, source: b.source,
    });
    wireCards(main);
  })();
  (() => {
    const f = khawass.futuhRabbani();
    $("#futuh", main).innerHTML =
      card({
        title: "الوِرد اليوميّ", k: `صباحًا ومساءً · ${AR(f.wirdRepsTotal)} تكرارًا`,
        body: `<div class="kv">${esc(f.intro)}</div>
          <ol class="kv" style="margin-top:.4rem;line-height:1.9">
          ${f.wird.map((w) => `<li>${esc(w.text)} — <b>×${AR(w.count)}</b></li>`).join("")}
          <li>الدعاء: «${esc(f.dua.text)}» — <b>×${AR(f.dua.count)}</b></li></ol>
          <div class="gloss">${esc(f.wirdNote)}</div>`,
        reveal: f.raw, source: f.source,
      }) +
      card({
        title: f.jalsa.title, k: "ذكرٌ قلبيّ — جدول التنفيذ",
        body: `<div class="kv"><b>الوقت:</b> ${esc(f.jalsa.when)}</div>
          <ol class="kv" style="margin-top:.4rem;line-height:1.9">
          ${f.jalsa.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
          <div class="kv" style="margin-top:.4rem"><b>عند الوسوسة:</b> ${esc(f.jalsa.waswasa)}</div>
          <div class="gloss">${esc(f.jalsa.hadith)} — مرشدُ الطريقة: ${esc(f.murshid)}</div>`,
        reveal: `الدعوى في الكتاب: ${f.jalsa.claim}\n\n${f.raw}`, source: f.source,
      });
    wireCards(main);
  })();
  $("#mb", main).onclick = () => {
    const v = +$("#mv", main).value || 0;
    const m = khawass.matchName(v);
    $("#mo", main).innerHTML = m.mode === "تطابق"
      ? `تطابق: ${m.names.map((n) => esc(n.name)).join("، ")}`
      : `لا تطابق تامّ. الأقرب: ${m.nearest.map((n) => `${esc(n.name)} (${AR(n.value)})`).join("، ")}`;
  };
};

// 14ب) قراءة الكفّ ────────────────────────────────────────────────
PANELS.kaf = (main) => {
  const sc = kaf.schema();
  const sel = (id, opts, label) =>
    `<div class="fld"><label>${esc(label)}</label><select id="${id}">
       <option value="">— لم يتبيّنْ —</option>
       ${opts.map((o) => `<option value="${esc(o.key)}">${esc(o.ar)}</option>`).join("")}
     </select></div>`;
  const multi = (id, opts, label) =>
    `<div class="fld"><label>${esc(label)} <span class="gloss">(اختر ما ينطبق)</span></label>
       <div id="${id}" class="chips">${opts.map((o) => `<label class="chip"><input type="checkbox" value="${esc(o.key)}"> ${esc(o.ar)}</label>`).join("")}</div></div>`;

  main.innerHTML = `${head('kaf', 'قراءة الكفّ')}
    <p class="kv">المصدر: «علم قراءة اليد» — نجيب أفندي (مطبعة الهلال، ١٩٠٤، ملكيّة عامّة) + «أسرار علم الكف» — برنارد الأسطة. القراءةُ حتميّةٌ وكلُّ سطرٍ مربوطٌ بفصلِ الكتابِ وفقرتِه.</p>
    <h2>الوضعُ التلقائيّ — الكاميرا الحيّة</h2>
    <div id="kaf-cam">
      <div class="warn" id="kaf-camnote"></div>
      <div class="form"><button class="btn" id="k-camstart" hidden>افتحِ الكاميرا</button>
        <button class="btn" id="k-camforce" hidden>التقطِ الآن</button>
        <button class="btn sec" id="k-camstop" hidden>إيقاف</button></div>
      <div id="k-camwrap" hidden style="position:relative;max-width:520px">
        <video id="k-video" playsinline muted style="display:block;width:100%;border-radius:12px"></video>
        <canvas id="k-overlay" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:12px"></canvas>
        <div class="gloss" style="position:absolute;top:.4rem;right:0;left:0;text-align:center;color:#fff;text-shadow:0 1px 3px #000">طابِقْ كفَّك على الرسمة — النقاطُ الزرقاءُ ما تراه الكاميرا من يدك</div>
        <div id="k-guide" style="position:absolute;inset:auto 0 0 0;background:rgba(0,0,0,.6);color:#fff;padding:.5rem;text-align:center;border-radius:0 0 12px 12px;font-size:1.05rem"></div>
      </div>
      <div id="k-shot"></div>
    </div>
    <h2>الوضعُ اليدويّ — صِفْ ما ترى في كفّك</h2>
    <div class="form" style="flex-wrap:wrap">
      <div class="fld"><label>اليد</label><select id="k-hand"><option value="right">اليمنى (المكتسَب)</option><option value="left">اليسرى (الفطرة)</option></select></div>
      ${sel("k-type", sc.handTypes, "نوعُ اليد (شكلُ الأصابعِ والراحة)")}
      ${sel("k-texture", sc.textures, "ملمسُ اليد")}
      ${sel("k-palm", sc.palmSurfaces, "راحةُ اليد")}
    </div>
    <h3>الأصابع</h3><div class="form" style="flex-wrap:wrap" id="k-fingers"></div>
    ${multi("k-fingerset", sc.fingerSet, "وضعُ الأصابعِ مجتمعةً")}
    <h3>الإبهام</h3><div class="form" style="flex-wrap:wrap">
      <div class="fld"><label>السلامى الأولى (الإرادة)</label><select id="k-th1"><option value="">—</option><option value="large">كبيرةٌ / طويلة</option><option value="small">صغيرةٌ / قصيرة</option></select></div>
      <div class="fld"><label>السلامى الثانية (المنطق)</label><select id="k-th2"><option value="">—</option><option value="long">طويلةٌ ممتلئة</option><option value="short">قصيرةٌ ضامرة</option></select></div>
      <div class="fld"><label>زاوية الإبهام</label><select id="k-thang"><option value="">—</option><option value="open">منفتحةٌ واسعة</option><option value="closed">منضمّةٌ ضيّقة</option></select></div>
      <div class="fld"><label>كُرَةُ الإبهام (تلّ الزهرة)</label><select id="k-thball"><option value="">—</option><option value="full">مرتفعةٌ ممتلئة</option><option value="flat">مسطّحةٌ غائرة</option></select></div>
      <label class="chip"><input type="checkbox" id="k-thjoint"> المفصلُ العلويُّ بارزٌ عقديّ</label>
    </div>
    ${multi("k-nails", sc.nails, "الأظافر")}
    <h3>التلال السبعة <span class="gloss">(مرتفع / مسطّح / مفرط)</span></h3><div class="form" style="flex-wrap:wrap" id="k-mounts"></div>
    <h3>الخطوط</h3><div id="k-lines"></div>
    <div class="fld"><label>المثلّثُ العظيم</label><select id="k-tri"><option value="">—</option><option value="wideClear">صريحٌ واسعٌ منتظم</option><option value="narrowCrooked">ضيّقٌ معوجّ</option></select></div>
    <h3>خطوطٌ ثانويّة</h3><div class="form" style="flex-wrap:wrap">
      <label class="chip"><input type="checkbox" id="k-vg"> يظهرُ حزامُ الزهرة</label>
      <div class="fld"><label>عددُ خطوطِ الزواجِ الواضحة</label><input id="k-marr" type="number" min="0" max="6" placeholder="—" style="width:70px"></div>
      <div class="fld"><label>عددُ أساورِ الرسغِ الواضحة</label><input id="k-rasc" type="number" min="0" max="4" placeholder="—" style="width:70px"></div>
      <div class="fld"><label>المستطيل (بين القلبِ والرأس)</label><select id="k-quad"><option value="">—</option><option value="wide">واسعٌ منتظم</option><option value="narrow">ضيّقٌ مضغوط</option></select></div>
    </div>
    <div class="form"><button class="btn" id="k-go">اقرأِ الكفّ</button></div>
    <div id="k-out"></div>`;

  // fingers
  $("#k-fingers", main).innerHTML = sc.fingers.map((fg) =>
    `<div class="fld"><label>${esc(fg.ar)} <span class="gloss">(${esc(fg.planet)})</span></label>
       <select id="k-fg-${fg.key}"><option value="">—</option>${fg.states.map((s) => `<option value="${esc(s)}">${esc(s)}</option>`).join("")}</select></div>`).join("");
  // mounts
  $("#k-mounts", main).innerHTML = sc.mounts.map((m) =>
    `<div class="fld"><label>${esc(m.ar)}</label><select id="k-mt-${m.key}">
       <option value="">—</option><option value="full">مرتفعٌ ممتلئ</option><option value="flat">مسطّح/غائر</option><option value="excess">مفرطُ البروز</option></select></div>`).join("");
  // lines
  $("#k-lines", main).innerHTML = sc.lines.map((L) =>
    `<div class="kv" style="margin:.35rem 0"><b>${esc(L.ar)}</b>
       <label class="chip" style="margin-inline:.4rem"><input type="checkbox" class="k-ln-present" data-k="${esc(L.key)}"> ظاهرٌ في كفّي</label>
       <span class="gloss">الحالات:</span>
       ${L.states.map((s, i) => `<label class="chip"><input type="checkbox" class="k-ln-state" data-k="${esc(L.key)}" value="${esc(s)}"> ${esc(s.split("(")[0].trim())}</label>`).join(" ")}</div>`).join("");

  // ما أدخلَه المستخدمُ يدويًّا — يُستعمَلُ وحدَه في «اقرأ الكفّ»، ويُكمِّلُ نتيجةَ الكاميرا عند الالتقاط.
  const readManual = () => {
    const g = (id) => $("#" + id, main)?.value || "";
    const chk = (id) => !!$("#" + id, main)?.checked;
    const chips = (id) => [...main.querySelectorAll(`#${id} input:checked`)].map((c) => c.value);
    // حقلٌ عدديٌّ فارغ = «لم يُفحَص» (لا صفر): الصفرُ حكمٌ بأنّه لا يظهرُ شيء
    const numOrNull = (id) => { const v = g(id).trim(); return v === "" ? null : Math.max(0, Math.floor(+v) || 0); };
    return {
      hand: g("k-hand"), handType: g("k-type"), texture: g("k-texture"), palmSurface: g("k-palm"),
      fingers: Object.fromEntries(sc.fingers.map((fg) => [fg.key, { state: g("k-fg-" + fg.key) }])),
      fingerSet: chips("k-fingerset"),
      thumb: { firstPhalanx: g("k-th1"), secondPhalanx: g("k-th2"), angle: g("k-thang"), ball: g("k-thball"), joint: chk("k-thjoint") ? "knotty" : null },
      nails: chips("k-nails"),
      mounts: Object.fromEntries(sc.mounts.map((m) => [m.key, g("k-mt-" + m.key)]).filter(([, v]) => v)),
      lines: Object.fromEntries(sc.lines.map((L) => {
        const states = [...main.querySelectorAll(`.k-ln-state[data-k="${L.key}"]:checked`)].map((c) => c.value);
        // اختيارُ حالةٍ للخطِّ يعني أنّه ظاهر (كان يُتجاهَلُ إن لم يُعلَّمْ «ظاهر»)
        const present = !!main.querySelector(`.k-ln-present[data-k="${L.key}"]:checked`) || states.length > 0;
        return [L.key, { present, confidence: 1, states }];
      })),
      marks: [], // العلامات تحتاجُ تكبيرًا؛ الوضعُ اليدويُّ لا يجمعُها هنا
      secondary: { venusGirdle: chk("k-vg"), marriageCount: numOrNull("k-marr"), rascettes: numOrNull("k-rasc"), quadrangle: g("k-quad") || null },
      triangle: g("k-tri") || null,
    };
  };
  // دمجٌ: ما قاسته الكاميرا أوّلًا؛ وما لم تقِسْه (أو لم تتبيّنْه بثقة) يُكمَّلُ ممّا أدخلَه المستخدم.
  const mergeManual = (feats, man) => {
    feats.hand = man.hand;
    if (!feats.handType && man.handType) feats.handType = man.handType;
    if (man.texture) feats.texture = man.texture;
    if (man.palmSurface) feats.palmSurface = man.palmSurface;
    for (const k of ["index", "middle", "ring", "little"]) {
      if (!feats.fingers[k]?.state && man.fingers[k]?.state) feats.fingers[k] = man.fingers[k];
    }
    feats.fingerSet = [...new Set([...(feats.fingerSet || []), ...man.fingerSet])];
    for (const k of ["firstPhalanx", "secondPhalanx", "angle", "ball", "joint"]) {
      if (!feats.thumb[k] && man.thumb[k]) feats.thumb[k] = man.thumb[k];
    }
    feats.mounts = { ...feats.mounts, ...man.mounts };
    feats.nails = man.nails;
    const floor = kaf.CONFIDENCE_FLOOR ?? 0.45;
    for (const [k, ln] of Object.entries(man.lines)) {
      const c = feats.lines[k];
      if (ln.present && (!c || !c.present || (c.confidence ?? 0) < floor)) feats.lines[k] = ln;
    }
    feats.secondary = {
      venusGirdle: feats.secondary.venusGirdle || man.secondary.venusGirdle,
      marriageCount: man.secondary.marriageCount ?? feats.secondary.marriageCount,
      rascettes: man.secondary.rascettes ?? feats.secondary.rascettes,
      quadrangle: man.secondary.quadrangle || feats.secondary.quadrangle,
    };
    if (man.triangle) feats.triangle = man.triangle;
    return feats;
  };
  let lastCam = null; // آخرُ ما قاسته الكاميرا في هذه اللوحة
  $("#k-go", main).onclick = () => {
    // «اقرأِ الكفّ» بعد التقاطٍ بالكاميرا يُكمِّلُ نتيجتَها بالحقولِ اليدويّة (لا يرميها)
    const f = lastCam ? mergeManual(JSON.parse(JSON.stringify(lastCam)), readManual()) : readManual();
    let r;
    try { r = kaf.read(f); } catch (e) { $("#k-out", main).innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    try { localStorage.setItem("smk-last-kaf", JSON.stringify({ hand: r.hand, handType: f.handType, sectionsCount: r.sections.length, firstTitle: r.sections[0]?.title || "", savedAt: Date.now() })); } catch {}
    $("#k-out", main).innerHTML = `<div class="grid wide">
      ${card({ title: `قراءةُ الكفِّ ${esc(r.hand)}`, k: `${AR(r.sections.length)} بابًا`,
        body: r.sections.map((s) => `<div class="kv" style="margin:.5rem 0"><b>${esc(s.title)}</b><br>${s.body}${s.src ? `<br><span class="src">${esc(s.src)}</span>` : ""}</div>`).join(""),
        reveal: "المصادر: " + r.sources.map((x) => x.title).join(" · ") + "\n\n" + r.note })}
      ${r.honesty.length ? card({ title: "ما لم أتبيّنْه", body: `<ul class="kv">${r.honesty.map((h) => `<li>${esc(h)}</li>`).join("")}</ul><div class="gloss">القراءةُ لا تحكمُ على ما لم تُميِّزْه العينُ (أو الآلة) بثقة.</div>` }) : ""}
    </div>`;
    wireCards(main);
  };

  // ── وضعُ الكاميرا الحيّة ─────────────────────────────────────────
  const note = $("#kaf-camnote", main);
  const secure = (window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1")
    && location.protocol !== "file:";
  if (!secure) {
    note.innerHTML = `<b>التحليلُ التلقائيُّ بالكاميرا مُعطَّلٌ الآن.</b> المتصفّحُ يمنعُ الكاميرا عند فتحِ الملفِّ مباشرةً (<code>file://</code>). لتشغيلِه: أغلِقْ هذه الصفحة، ثمّ شغّلِ الملفَّ <code>افتح-قراءة-الكف.bat</code> (نافذةٌ سوداءُ صغيرةٌ تبقى مفتوحة) — سيفتحُ الموقعَ عبر عنوانٍ محلّيٍّ فتعملُ الكاميرا. حتى ذلك الحينِ استعملِ <b>الوضعَ اليدويّ</b> أدناه.`;
  } else {
    note.innerHTML = `تُفتَحُ الكاميرا، توجّهُك حتى تُصبِحَ الصورةُ صحيحةً، ثمّ تلتقطُ تلقائيًّا وتُحلّلُ شكلَ اليدِ والأصابعِ والخطوطِ الرئيسيّة. الصورةُ لا تُغادِرُ جهازك. (التلالُ والأظافرُ والعلاماتُ الدقيقةُ تُكمَّلُ من الوضعِ اليدويّ.)`;
    const btn = $("#k-camstart", main); btn.hidden = false;
    const forceBtn = $("#k-camforce", main);
    let vis = null, stream = null, stopLoop = null;
    // رقمُ المحاولةِ الجارية: أيُّ إيقافٍ (زرُّ إيقاف/مغادرةُ اللوحة) يرفعُه، فكلُّ خطوةٍ
    // غيرِ متزامنةٍ تنتهي بعدَه تعرفُ أنّها أُلغيت ولا تفتحُ الكاميرا على لوحةٍ لم تعُد ظاهرة.
    let attempt = 0;
    const releaseStream = () => { try { stream && stream.getTracks().forEach((t) => t.stop()); } catch {} stream = null; };
    const stopAll = () => {
      attempt++;
      try { stopLoop && stopLoop.stop(); } catch {}
      stopLoop = null;
      releaseStream();
      $("#k-camwrap", main).hidden = true; $("#k-camstop", main).hidden = true; forceBtn.hidden = true; btn.hidden = false;
    };
    panelCleanup = stopAll;
    $("#k-camstop", main).onclick = stopAll;
    // التقاطٌ يدويٌّ فوريّ: مخرجٌ دائمٌ متاحٌ إن تعذّر على الكشفِ الآليِّ تحقيقَ شروطِه لأيِّ
    // سببٍ (إضاءة/زاوية/جهاز لم نتوقّعْه) — لا يبقى المستخدمُ عالقًا بلا حيلة.
    forceBtn.onclick = () => { try { stopLoop && stopLoop.capture(); } catch {} };
    // عند أيِّ فشلٍ قبل اكتمالِ فتحِ الكاميرا: يُعادُ زرُّ "افتحِ الكاميرا" للظهورِ (لا يبقى
    // زرُّ "إيقاف" وحدَه ظاهرًا — فلا يُضطرُّ المستخدمُ لتخمينِ كيفيّةِ إعادةِ المحاولة).
    const failReset = (msg) => {
      $("#k-guide", main).textContent = msg;
      btn.hidden = false; $("#k-camwrap", main).hidden = true; $("#k-camstop", main).hidden = true; forceBtn.hidden = true;
    };
    const camError = (e) => {
      const n = e && e.name;
      if (n === "NotAllowedError" || n === "SecurityError") return "لم يُسمَحْ باستخدامِ الكاميرا — اسمحْ بها من أيقونةِ الكاميرا بجانبِ العنوان ثمّ أعِدِ المحاولة.";
      if (n === "NotFoundError" || n === "OverconstrainedError") return "لم تُوجَدْ كاميرا في هذا الجهاز.";
      if (n === "NotReadableError" || n === "AbortError") return "الكاميرا مشغولةٌ ببرنامجٍ آخر (Zoom/Teams/تبويبٍ آخر) — أغلِقْه ثمّ أعِدِ المحاولة.";
      return "تعذّرَ تشغيلُ الكاميرا: " + ((e && e.message) || e);
    };
    btn.onclick = async () => {
      const my = ++attempt;
      const cancelled = () => my !== attempt;
      btn.hidden = true; $("#k-shot", main).innerHTML = "";
      $("#k-guide", main).textContent = "جارٍ تحميلُ محرّكِ الرؤية… (أوّلَ مرّةٍ قد يستغرقُ حتى دقيقةٍ على اتّصالٍ بطيء)";
      $("#k-camwrap", main).hidden = false; $("#k-camstop", main).hidden = false;
      try { vis = await import("./kaf-vision.js"); }
      catch (e) { if (!cancelled()) failReset("تعذّرَ تحميلُ محرّكِ الرؤية — استعملِ الوضعَ اليدويّ."); return; }
      if (cancelled()) return;
      try { await vis.ensureLoaded(); }
      catch (e) { if (!cancelled()) failReset("تعذّرَ تجهيزُ النموذج: " + (e.message || e)); return; }
      if (cancelled()) return;
      const video = $("#k-video", main);
      let s;
      try { s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } } }); } // بلا ارتفاعٍ مفروض: فرضُه يقصُّ الكادرَ على الهاتفِ الطوليّ
      catch (e) { if (!cancelled()) failReset(camError(e)); return; }
      // أُلغيَ أثناء انتظارِ الإذن ⇒ أطفئِ الكاميرا فورًا بدلَ تركِها شاعلةً بلا لوحة
      if (cancelled()) { try { s.getTracks().forEach((t) => t.stop()); } catch {} return; }
      stream = s;
      // العكسُ (مرآة) للكاميرا الأماميّةِ فقط. سفاري الآيفون قد لا يُعيدُ facingMode في getSettings،
      // فكانت الكاميرا الخلفيّةُ تُعامَلُ أماميّةً وتظهرُ معكوسة. نستدلُّ بالاسم ثمّ بنوعِ الجهاز:
      // طلبنا الخلفيّة، والهواتفُ تملكُها؛ والحواسيبُ عادةً بكاميرا أماميّةٍ وحيدة.
      const track = stream.getVideoTracks()[0];
      let facing = track?.getSettings?.().facingMode;
      if (!facing) {
        const label = (track?.label || "").toLowerCase();
        if (/back|rear|environment|خلف/.test(label)) facing = "environment";
        else if (/front|user|facetime|أمام/.test(label)) facing = "user";
        else facing = (/Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform || ""))) ? "environment" : "user";
      }
      const mirrored = facing !== "environment";
      video.style.transform = mirrored ? "scaleX(-1)" : "none";
      try { video.srcObject = stream; await video.play(); }
      catch (e) { if (!cancelled()) { releaseStream(); failReset(camError(e)); } return; }
      if (cancelled()) return;
      vis.preloadOpenCV(); // يُحمَّلُ في خيطٍ منفصل — لا يمسُّ الكاميرا ولا الصفحة
      forceBtn.hidden = false;
      stopLoop = vis.runLiveCapture({
        video,
        overlay: $("#k-overlay", main),
        mirrored,
        getHand: () => $("#k-hand", main)?.value || "right",
        onGuide: (msgs, ok) => {
          const gEl = $("#k-guide", main); gEl.textContent = msgs.join(" · "); gEl.style.background = ok ? "rgba(20,110,40,.75)" : "rgba(0,0,0,.6)";
        },
        onShot: (feats, dataUrl) => {
          if (cancelled()) return; // أُوقِفَ أو غادرَ المستخدمُ أثناءَ تحليلِ الخطوط
          stopAll();
          lastCam = JSON.parse(JSON.stringify(feats)); // يُحفَظُ ليُكمَّلَ لاحقًا بالحقولِ اليدويّة
          feats = mergeManual(feats, readManual());
          let r; try { r = kaf.read(feats); } catch (e) { $("#k-shot", main).innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
          try { localStorage.setItem("smk-last-kaf", JSON.stringify({ hand: r.hand, handType: feats.handType, sectionsCount: r.sections.length, firstTitle: r.sections[0]?.title || "", savedAt: Date.now() })); } catch {}
          // ما لا تقيسُه الكاميرا (نوعُ اليدِ والخطوط) يُجمَعُ في توجيهٍ واحدٍ واضح بدلَ قائمةِ «لم أتبيّنْه»
          const lineNames = sc.lines.map((l) => l.ar);
          const camHonesty = r.honesty.filter((h) => !lineNames.some((n) => h.startsWith(n)) && !h.startsWith("نوعُ اليدِ"));
          const hint = feats.handHint;
          const typeAr = (k) => (sc.handTypes.find((h) => h.key === k) || {}).ar || k;
          const hintHtml = hint ? `<div class="kv" style="margin-top:.4rem"><b>ما قاستْه الكاميرا:</b> الراحةُ ${esc(hint.palmShape)}، والأصابعُ ${esc(hint.fingerLen)}${hint.fits.length ? ` — تتّسقُ هذه النِّسَبُ مع: ${hint.fits.map((k) => esc(typeAr(k))).join("، ")}` : ""}.
              <br><span class="gloss">نوعُ اليدِ في الكتبِ يُعرَفُ بشكلِ أطرافِ الأصابع (مربّعة/مخروطيّة/مدبّبة/مفلطحة) وعُقَدِ المفاصل — والكاميرا لا تقيسُها، فاخترِ النوعَ بنفسِك من «نوعُ اليد» تحت.</span></div>` : "";
          $("#k-shot", main).innerHTML = `<div class="grid wide">
            ${feats._err ? `<div class="warn">${esc(feats._err)}</div>` : ""}
            ${feats._linesNote ? `<div class="warn">${esc(feats._linesNote)}</div>` : ""}
            ${card({ title: "الصورةُ الملتقطة", body: `<img src="${dataUrl}" style="max-width:360px;width:100%;border-radius:10px">${hintHtml}` })}
            ${feats._creaseImage ? card({ title: "خطوطُ كفّك مُبرَزة", body: `<img src="${feats._creaseImage}" style="max-width:360px;width:100%;border-radius:10px">
              <div class="kv" style="margin-top:.4rem">هذه راحتُك مقوَّمةً (الأعلى عند قواعدِ الأصابع، والأسفل عند الرسغ، واليسارُ جهةُ الإبهام)، وأعمقُ تجاعيدِها بالأحمر.</div>
              <div class="gloss">الآلةُ تُبرِزُ التجاعيدَ لكنّها لا تُسمّيها: جُرِّب ذلك على كفٍّ حقيقيّةٍ واضحة فخلطت خطَّ الرأسِ بالقلب، والحكمُ بتسميةٍ خاطئةٍ تلفيق. حدِّدْ أنت ما تراه من الخطوطِ وحالاتِها في «الوضعِ اليدويّ» تحت، ثمّ اضغطْ «اقرأِ الكفّ» — تُضافُ إلى ما قاستْه الكاميرا هنا.</div>` }) : ""}
            ${card({ title: `قراءةُ الكفِّ ${esc(r.hand || "")}`, k: `${AR(r.sections.length)} بابًا`,
              body: r.sections.map((s) => `<div class="kv" style="margin:.5rem 0"><b>${esc(s.title)}</b><br>${s.body}${s.src ? `<br><span class="src">${esc(s.src)}</span>` : ""}</div>`).join(""),
              reveal: "المصادر: " + r.sources.map((x) => x.title).join(" · ") + "\n\n" + r.note })}
            ${card({ title: "أكمِلْ ما لا تقيسُه الكاميرا", body: `<ul class="kv">
                ${!feats.handType ? "<li>نوعُ اليد — من شكلِ أطرافِ أصابعِك (انظرِ الملاحظةَ تحتَ الصورة).</li>" : ""}
                <li>الخطوطُ وحالاتُها — بالاستعانةِ بصورةِ «خطوطُ كفّك مُبرَزة».</li>
                ${camHonesty.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
              <div class="gloss">املأْها في «الوضعِ اليدويّ» تحتَ ثمّ اضغطْ «اقرأِ الكفّ»: تُضافُ إلى ما قاستْه الكاميرا (لا تُلغيه).</div>` })}
          </div>`;
          wireCards(main);
        },
      });
    };
  }
};

// 15) نصّ الكتاب ───────────────────────────────────────────────────
PANELS.corpus = (main) => {
  const st = corpus.stats();
  main.innerHTML = `${head('corpus', 'نصّ الكتاب — بحث')}
    <p class="kv">${AR(st.chunks)} مقطعًا من نسخة الكبرى (OCR — يجد الموضع؛ الحروف قد لا تكون مضبوطة ١٠٠٪).</p>
    <div class="form"><input id="cq" placeholder="اكتب كلمةً أو عبارة…" value="الاسم الاعظم" style="min-width:340px"><button class="btn" id="cb">ابحث</button></div>
    <div id="cout"></div>`;
  const run = () => {
    const res = corpus.search($("#cq", main).value, { limit: 40 });
    $("#cout", main).innerHTML = res.total
      ? `<p class="kv">${AR(res.total)} نتيجة — أوّل ${AR(res.hits.length)}:</p>` + res.hits.map((h) =>
        `<div class="card"><div class="kv"><span class="src">${esc(h.src)} · ${esc(h.id)}</span></div><div style="margin-top:.3rem">${esc(h.snippet)}</div></div>`).join("")
      : `<p class="kv">لا نتائج.</p>`;
  };
  $("#cb", main).onclick = run;
  $("#cq", main).addEventListener("keydown", (e) => e.key === "Enter" && run());
  run();
};

// 16) الكُتيب ──────────────────────────────────────────────────────
PANELS.manual = (main) => {
  main.innerHTML = `<div class="manual"><h1>📘 الكُتيب — كيف تستخدم كلّ أداة</h1>
    <p class="kv">الفكرة العامّة: تُدخِل بياناتك مرّة في «بطاقتي» (يمين)، وكلّ أداةٍ تستعملها. فوق يمين مفتاح <b>«وضع الكشف»</b> — لمّا يكون مُفعَّلًا، تحت كلّ نتيجةٍ يظهر <b>الحساب خطوةً بخطوة</b>. وبعض النتائج فيها زرّ <b>«وجهًا لوجه»</b> يقلبها لعمودين: يمين ما يُقال للسائل، يسار الطريقةُ الحسابيّة.</p>
    ${MANUAL.map((m) => `<div class="tool"><h3>${esc(m.title)}</h3>
      <div class="lbl">ما هي</div><div>${esc(m.what)}</div>
      <div class="lbl" style="margin-top:.4rem">المدخلات</div><div>${esc(m.inputs)}</div>
      <div class="lbl" style="margin-top:.4rem">كيف تقرأ الناتج</div><div>${esc(m.output)}</div>
      ${m.debunk ? `<div class="lbl" style="margin-top:.4rem">وجه التفكيك</div><div>${esc(m.debunk)}</div>` : ""}</div>`).join("")}
  </div>`;
};

// 17) معلوماتٌ فقط (لا تُستخدَم) ─────────────────────────────────────
// كلُّ بطاقةٍ بالموقع لا عملَ فعليًّا لها (لا يومَ، لا استحضار، لا طباعة، لا
// غرض) تعيش هنا وحدها بدل أن تُبعثَر وسط أدواتٍ عمليّة فتُوهِم بأنّ لها عملًا.
// حُذفت من مكانها الأصليّ نهائيًّا (لا تكرار) — راجعها هنا فضولًا فقط.
PANELS.infoOnly = (main) => {
  const nonOpArch = spirits.ARCHANGELS.filter((e) => !ARCHANGELS_ACTIVE.includes(e));
  main.innerHTML = `${head('infoOnly', 'معلوماتٌ فقط (لا تُستخدَم)')}
    <p class="kv">كلُّ بطاقةٍ هنا اسمٌ أو صورةٌ أو حكايةٌ من الكتب — بحثنا في نصّ الكتاب نفسِه فلم نجد لها يومًا ولا بخورًا ولا طريقةَ كتابةٍ ولا غرضًا مرتبطًا باسمها تحديدًا. لا تحتاج تفعل شيئًا بأيّ بطاقةٍ هنا؛ هي للمعرفة والفضول فقط، لا استحضار ولا طباعة ولا عمل.</p>
    <h2>أسماءٌ دينيّةٌ بلا عملٍ سحريٍّ (من رؤساء الملائكة)</h2>
    <p class="kv">مذكورةٌ للتعريف فقط — إن سمّاها عملٌ ما بالخطأ فهذا وهمٌ، لا شيء موثَّقٌ باسمها في هذه الكتب.</p>
    <div class="grid" id="io1"></div>
    <h2>المردة والعفاريت المسمَّون (قصصٌ لا حقيقةَ لها)</h2>
    <p class="kv">شخصيّاتٌ من القَصص والتراث الشعبيّ فقط — لا استحضارَ ولا طباعةَ لأيٍّ منها.</p>
    <div class="grid" id="io2"></div>
    <h2>أبناء إبليس السبعة (يُستعاذ منهم لا يُستحضَرون)</h2>
    <p class="kv">هؤلاء شياطينُ يُستعاذ من شرّهم بذكر الله، لا كياناتٌ تُستحضَر أو يُستفاد منها — عكسُ كلّ ما سبق تمامًا.</p>
    <div class="grid" id="io3"></div>
    <h2>المربّع المؤطَّر (التطريف)</h2>
    <p class="kv"><b>«مؤطَّر» = محاطٌ بإطار:</b> مربّعٌ صغيرٌ سحريٌّ في المنتصف، محاطٌ بصفٍّ إضافيٍّ من الأرقام حوله من كلّ جهة، بحيث يصير المجموعُ الكليُّ مربّعًا أكبرَ لا يزال سحريًّا. عرضٌ توضيحيٌّ لطريقة بناءٍ من الكتاب فقط — ليس وفقًا جاهزًا لغرضٍ معيّن. إذا تريد وفقًا فعليًّا تكتبه لحاجةٍ معيّنة، ${navLink("awfaq", "افتح «الأوفاق ← الأغراض»")}.</p>
    <div class="grid" id="io4"></div>
    <h2>قدرة الخلاق: صور المثلث وتصنيف الأعداد</h2>
    <p class="kv">«قدرة الخلاق» اسمُ فصلٍ في الكتاب يبحث في طرق بناء المربّعات السحريّة حسب نوع الرتبة — عروضٌ رياضيّةٌ توضّح المبدأ فقط، ليست وفقًا لغرضٍ تكتبه بنفسك. الوفقُ الجاهز موجودٌ في «الأوفاق ← الأغراض».</p>
    <div class="grid" id="io5"></div>
    <h2>تفصيلُ طالع الرمل الكامل</h2>
    <p class="kv">هذه محسوبةٌ من اسمك وسؤالك الحاليَين (زي حكم الرمل نفسه)، لكنّها تفصيلٌ داعمٌ لا جوابٌ إضافيّ — حكمُك الفعليّ موجودٌ في «علم الرمل».</p>
    <div id="io6"></div>
    <h2>زايرجةُ العالم (طريقةُ البوني) — الطريقةُ الرابعة</h2>
    <p class="kv">محسوبةٌ من سؤالك، بس ناتجُها حروفٌ خامٌ لا بيتَ شعرٍ جاهز — تحتاج تأويل الممارس نفسِه، فلا تُعدّ جوابًا مباشرًا. الجوابُ المباشرُ من ثلاث طرقٍ أخرى موجودٌ في «الزايرجة».</p>
    <div id="io7"></div>
    <h2>الحروف المقطّعة (فواتح السور)</h2>
    <p class="kv">مرجعٌ تفسيريٌّ فقط يشرح لماذا افتُتحت بعضُ السور بهذه الحروف — لا عملَ ولا استعمال، فضولٌ فقط.</p>
    <div id="io8"></div>
    <h2>الجدول الأعظم للجفر الجامع (٢٨×٢٨)</h2>
    <p class="kv">بصراحة: جداولُ «الجفر الجامع» الأصليّة (مخطوطاتٌ قديمة) فريدةٌ وغيرُ منشورةٍ بصيغةٍ موحَّدة يمكن نسخُها هنا بدقّة — فحصنا نسخةً مصوَّرةً منها ولقيناها شبكةَ رموزَ معقَّدةً خاصّةً بتلك النسخة بالذات. الجدولُ الظاهرُ تحتُ لذلك <b>عرضٌ توضيحيٌّ</b> مبنيٌّ بقاعدةٍ رياضيّةٍ ثابتةٍ ومُعلَنة (لا نسخةٌ حرفيّةٌ عن أيّ مخطوط)، ليُبيّن شكلَ الفكرة (جدولٌ ٢٨×٢٨ حرفًا) فقط.</p>
    <div id="io12"></div>
    <h2>تفصيلُ السماء الفنّيّ (من «الفلك والساعات»)</h2>
    <p class="kv">محسوبةٌ من اللحظة الحاليّة، لكنّها تغذّي «حكم المسألة» و«جودة اليوم» داخليًّا فقط — لا توجيهَ عمليًّا مباشرًا فيها هي نفسها.</p>
    <div id="io9"></div>
    <h2>أحكام العالم عمومًا (الفصل / الطقس / الغلاء)</h2>
    <p class="kv">أحكامٌ عامّةٌ لا شخصيّة عن حال العالم حسب علم الفلك القديم — لا علاقةَ لها بسؤالك، اقرأها فضولًا فقط.</p>
    <div id="io10"></div>
    <h2>طالعُ مولدك وسماءُ لحظة سؤالك (من «القراءة الفلكيّة»)</h2>
    <p class="kv">محسوبةٌ من ميلادك ولحظة سؤالك، لكنّها تغذّي «التوقيتُ المختار» و«جوابُ المسألة» داخليًّا فقط — لا شيءَ تفعله بها مباشرة.</p>
    <div id="io11"></div>`;
  $("#io1", main).innerHTML = spiritCards(nonOpArch, "arch");
  $("#io2", main).innerHTML = spiritCards(spirits.MARADA, "marid");
  $("#io3", main).innerHTML = spiritCards(spirits.SONS_OF_IBLIS, "shaytan");
  $("#io4", main).innerHTML = [5, 7].map((n) => {
    const b = awfaq.borderedSquare(n);
    return card({ title: `مؤطَّر رتبة ${AR(n)}`, k: b.isMagic ? `∑=${AR(awfaq.verify(b.square).magic)}` : "تعذّر",
      body: numGrid(b.square) + `<div class="gloss">${esc(b.note)}</div>`,
      basis: `${esc(b.method)}: رتبةٌ داخليّةٌ (${AR(n - 2)}) وفقٌ تامٌّ، محاطةٌ بإطارٍ من أزواجٍ متكاملة (x مع n²+1−x) متقابلة، فتتّزن الأقطارُ تلقائيًّا.` });
  }).join("");
  $("#io5", main).innerHTML = [
    ...["نار", "هواء", "ماء", "تراب"].map((el) => {
      const ts = awfaq.triangleSquare(el);
      return card({ title: `صورة المثلث — ${esc(el)}`, k: `∑=${AR(ts.magic)}`,
        body: numGrid(ts.square), basis: esc(ts.orientNote) });
    }),
    (() => { const gt = awfaq.geometricTriangle();
      return card({ title: "المثلث الهندسيّ (وفق ضربيّ)", k: `∏=${AR(gt.product)}`,
        body: numGrid(gt.square) + `<div class="gloss">${esc(gt.note)}</div>`,
        basis: "كلُّ خانةٍ = ٢ مرفوعًا لأسٍّ من مربّع لو-شو ⇒ حاصلُ ضربِ كلِّ سطرٍ وعمودٍ وقطرٍ ثابتٌ، ومكعبُ الوسط مثلُه." }); })(),
    (() => {
      const rows = [4, 5, 6, 7, 8, 9, 10, 12].map((n) => { const c = awfaq.classifyNumber(n); return `${AR(n)}: <b>${esc(c.class)}</b>${c.circular ? " · دائريّ" : ""} · جبر: ${esc(String(c.acceptsJabr))}`; });
      return card({ title: "تصنيف الأعداد وقبول الجبر", body: `<div class="kv">${rows.join("<br>")}</div>`,
        basis: "زوجُ الزوج (قوى ٢) / زوجُ الفرد (٦،١٠…) / زوجُ الزوج والفرد (١٢،٢٠…) / فردٌ / دائريٌّ (آخرُه يعود لذاته بالتربيع). الفرديّةُ وزوجُ الفرد تقبلان التطريف. [قدرة الخلاق ص ١٢–٥٣]" });
    })(),
    ...[4, 5, 6, 7].map((n) => { const bf = awfaq.bookFigure(n);
      return card({ title: `صورة «قدرة الخلاق» — رتبة ${AR(n)}`, k: bf.isMagic ? `∑=${AR(bf.magic)}` : "—",
        body: numGrid(bf.figure) + `<div class="gloss">${esc(bf.note)}</div>` }); }),
  ].join("");
  (() => {
    const c = ctx();
    if (!c.question) { $("#io6", main).innerHTML = `<div class="kv">اختر سؤالًا من «بطاقتي» ليظهر تفصيلُ طالعك هنا.</div>`; return; }
    let r; try { r = raml.reading({ name: c.name, mother: c.mother, question: c.question, when: c.when }); } catch (e) { $("#io6", main).innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    const ch = r.chart;
    const line = (label, arr) => `<tr><th>${label}</th>${arr.map((f) => `<td>${esc(f.ar)}<br>${figCell(f)}</td>`).join("")}</tr>`;
    $("#io6", main).innerHTML = `<div class="grid wide">
      ${card({ title: "الطالع الكامل (١٦ شكلًا)",
        body: `<div style="overflow-x:auto"><table class="tbl">
          ${line("الأمّهات", ch.mothers)}${line("البنات", ch.daughters)}${line("المنقولات", ch.nieces)}
          <tr><th>الشاهدان</th><td colspan="2">${esc(ch.witnesses.right.ar)}</td><td colspan="2">${esc(ch.witnesses.left.ar)}</td></tr>
          <tr><th>القاضي</th><td colspan="4">${esc(ch.judge.ar)}</td></tr></table></div>
          <div class="gloss">• = فردة، •• = زوج. البنات = أعمدة الأمّهات، والمنقولات = جمع كلّ شكلين، وهكذا حتى القاضي. هذا هو التفصيلُ الذي اشتُقّ منه القاضي والشاهدان في حكمك بـ«علم الرمل».</div>` })}
      ${card({ title: "تسكين البيوت الستّةَ عشرَ (نهاية العمل — الطوخي)",
        body: `<div style="overflow-x:auto"><table class="tbl"><tr><th>#</th><th>البيت</th><th>الشكل</th><th>يخصّ</th></tr>
          ${ch.taskin16.map((h) => `<tr><td>${AR(h.pos)}</td><td>${esc(h.name)}</td><td>${esc(h.figure?.ar || "—")} ${h.figure ? figCell(h.figure) : ""}</td><td class="gloss">${esc((h.topic || "").slice(0, 60))}</td></tr>`).join("")}</table></div>
          <div class="gloss">١–١٢ بروجيّة، و١٣–١٦ للسائل والمسؤول وصافية الأمر (الميزان) والعاقبة. بيتُ الشعر الجامع:<br><span class="mono">${esc(raml.houses16().mnemonic)}</span></div>`,
        basis: esc(raml.houses16().note) })}
      ${card({ title: "القراءة الثلاثيّة — الماضي / الحاضر / المستقبل (المثلث)",
        body: `<div class="kv">
          <b>${esc(r.threePart.past.title)}</b> — من ${esc(r.threePart.past.from)}<br>
          الأشكال: ${r.threePart.past.figures.map(esc).join("، ")} ⇒ <b>${esc(r.threePart.past.mood)}</b><br><br>
          <b>${esc(r.threePart.present.title)}</b> — من ${esc(r.threePart.present.from)}<br>
          الأشكال: ${r.threePart.present.figures.map(esc).join("، ")} ⇒ <b>${esc(r.threePart.present.mood)}</b><br><br>
          <b>${esc(r.threePart.future.title)}</b> — من ${esc(r.threePart.future.from)}<br>
          الأشكال: ${r.threePart.future.figures.map(esc).join("، ")} ⇒ <b>${esc(r.threePart.future.mood)}</b></div>
          <div class="gloss">${esc(r.mizanRule)}</div>`,
        basis: esc(r.threePart.note) })}
    </div>`;
    wireCards(main);
  })();
  (() => {
    const c = ctx();
    if (!c.question) { $("#io7", main).innerHTML = `<div class="kv">اختر سؤالًا من «بطاقتي» ليظهر ناتجُ هذه الطريقة.</div>`; return; }
    let asc = 100; try { asc = falak.ascendant(c.now, c.lat, c.lon).longitude; } catch {}
    let zc; try { zc = zairja.operateClassical(c.question, { ascendantDegree: asc, when: c.now }); } catch (e) { $("#io7", main).innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    $("#io7", main).innerHTML = `<div class="grid wide">${card({
      title: "زايرجةُ العالم (طريقةُ البوني)",
      k: `طالع ${esc(zc.tali3)} · مفتاح ${AR(zc.miftah)}`,
      body: `<div class="kv">جملةُ الدخل ${AR(zc.jumla)}، والمفتاح ${AR(zc.miftah)}. أجريتُ جدولَ العمل من ٩ مواقع، فخرجت حروفُ الجواب:</div>
        <div class="big" style="font-size:1.12rem;letter-spacing:.25rem">${esc(zc.answerRaw)}</div>
        <div class="kv" style="margin-top:.4rem">وسرُّ الجواب (الباب ${AR(zc.secret.key)}) مفكوكًا: <span class="mono">${esc(zc.secret.decoded)}</span> — يُقرأ بالتفسير، والمعنى يُدخِلُه المشغِّل لا الآلة.</div>`,
      basis: "زايرجة ابن خلدون/البوني كما في كتاب الطوخي ج١ (نظرية) + ج٢ (مثال محلول): جملة الدخل + المفتاح + أنبوب الحساب (المجموع→الحاصل→%٨٤→السطر المعدّل→العادل المطلوب) لكلّ موقع ⇒ حرف.",
      reveal: `جدولُ العمل:\n${zc.rows.map((rw) => `الموقع ${rw.k}: مجموع ${rw.majmoo} → حاصل ${rw.hasil} → %٨٤ ${rw.rem84} → سطر معدّل ${rw.line} → عادل ${rw.adil} → «${rw.letter}»`).join("\n")}\n\n` + zc.note,
    })}</div>`;
    wireCards(main);
  })();
  (() => {
    const hm = khawass.hurufMuqattaa();
    $("#io8", main).innerHTML = `<div class="kv">${esc(hm.note)}</div>
      <div style="overflow-x:auto;margin-top:.5rem"><table class="tbl"><tr><th>الصيغة</th><th>السور</th></tr>
        ${hm.groups.map((g) => `<tr><td class="mono">${esc(g.form)}</td><td>${esc(g.surahs)}</td></tr>`).join("")}</table></div>`;
  })();
  (() => {
    const gt = jafr.grandTable();
    $("#io12", main).innerHTML = `<div class="kv">${esc(gt.note)}</div>
      <div style="overflow-x:auto;margin-top:.5rem"><table class="tbl mono" style="font-size:.72rem">
        ${gt.rows.map((row) => `<tr>${row.map((ch) => `<td style="text-align:center">${esc(ch)}</td>`).join("")}</tr>`).join("")}
      </table></div>`;
  })();
  (() => {
    const c = ctx();
    let sky; try { sky = falak.snapshot(c.now, c.lat, c.lon); } catch (e) { $("#io9", main).innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    $("#io9", main).innerHTML = `<div class="grid wide">
      ${card({ title: "مواقع الكواكب السبعة",
        body: `<table class="tbl"><tr><th>الكوكب</th><th>البرج</th><th>الدرجة</th><th>الوجه</th><th>الحدّ</th><th></th></tr>
        ${Object.entries(sky.planets).map(([n, p]) => `<tr><td>${esc(n)}</td><td>${esc(p.sign)}</td><td>${AR(p.degreeInSign.toFixed(1))}°</td>
          <td>${esc(p.face.ruler)}</td><td>${esc(p.term.ruler)}</td><td>${p.retrograde ? "راجع" : ""}</td></tr>`).join("")}</table>` })}
      ${card({ title: "البيوت الاثنا عشر", body: `<div style="overflow-x:auto"><table class="tbl">
        <tr><th>#</th><th>البيت</th><th>البرج</th><th>حاكمه</th><th>ساكنوه</th></tr>
        ${sky.houses.map((h) => `<tr><td>${AR(h.n)}</td><td>${esc(h.name)}</td><td>${esc(h.sign)}</td><td>${esc(h.ruler)}</td><td>${h.planets.map(esc).join("، ") || "—"}</td></tr>`).join("")}</table></div>`,
        basis: "بيوتٌ بأبراجٍ تامّة: الطالعُ هو البيت الأوّل، ثمّ كلُّ برجٍ بيتٌ. دلالةُ كلِّ بيتٍ ثابتةٌ من الجدول." })}
      ${card({ title: "الأنظار بين الكواكب", body: `<div class="kv">${sky.aspects.length ? sky.aspects.map((a) =>
        `${esc(a.a)} — ${esc(a.b)}: <b>${esc(a.name)}</b> (فضل ${AR(a.orb.toFixed(1))}°، ${a.applying ? "مقبل" : "مدبر"})`).join("<br>") : "لا أنظار ضمن الحدود"}</div>`,
        basis: "بصراحة: الطريقةُ الأصليّةُ (ليلي وكتب الاختيارات العربيّة) تُعطي كلَّ كوكبٍ مدًى خاصًّا به يُجمَع مع مدى الكوكب الآخر؛ هنا استُعمِل مدًى ثابتٌ لكلّ نوع نظرٍ تبسيطًا — مقاربٌ لا مطابقٌ حرفيًّا للأصل." })}
      ${card({ title: "سهام العرب", body: `<div class="kv">${Object.entries(sky.lots.lots).map(([n, l]) =>
        `${esc(n)}: <b>${esc(l.sign)} ${AR(l.degree.toFixed(1))}°</b> (البيت ${AR(l.house)}) — ${esc(l.topic)}`).join("<br>")}</div>
        <div class="gloss">الحساب ${esc(sky.lots.sect)}: طالع + (كوكب − كوكب).</div>` })}
      ${sky.specialDegrees ? card({ title: "درجاتُ البروج الخاصّة (أحكام الحكيم ج١ ص ١٥٨)", body: `<div class="kv">
        الطالع في <b>${esc(sky.specialDegrees.ascendant.sign)} ${AR(sky.specialDegrees.ascendant.degree)}°</b>: ${sky.specialDegrees.ascendant.labels.length ? "<b>" + sky.specialDegrees.ascendant.labels.map(esc).join("؛ ") + "</b>" : "درجةٌ عاديّة"}${sky.specialDegrees.ascendant.temperament ? " · " + esc(sky.specialDegrees.ascendant.temperament) : ""}<br>
        القمر في <b>${esc(sky.specialDegrees.moon.sign)} ${AR(sky.specialDegrees.moon.degree)}°</b>: ${sky.specialDegrees.moon.labels.length ? "<b>" + sky.specialDegrees.moon.labels.map(esc).join("؛ ") + "</b>" : "درجةٌ عاديّة"}</div>`,
        basis: `ثلاثةُ جداولَ من «أحكام الحكيم»: الدرجُ الزائدُ في السعادة (تقوية)، ودرجُ الآبار/العَمى (خذلانٌ واحتباس)، ودرجُ الزمانات (عاهةٌ إن حلّها نحسٌ). الدرجةُ عددٌ صحيحٌ ١..٣٠. ${esc(sky.specialDegrees.note)}` }) : ""}
      ${(() => { const n = sky.lunarNodes; return card({ title: "الرأسُ والذنب", body: `<div class="kv">
        الرأسُ (الجَوزَهر الصاعد) في <b>${esc(n.head.sign)} ${AR(n.head.degree.toFixed(0))}°</b> — طبعُه الزيادة.<br>
        الذنبُ (الهابط) في <b>${esc(n.tail.sign)} ${AR(n.tail.degree.toFixed(0))}°</b> — طبعُه النقص.</div>`,
        basis: `نقطتان متحرّكتان على أوجِ القمر (لا كوكبان). ${esc(n.note)} [أحكام الحكيم ج١ ص ١٥٤]` }); })()}
      ${(() => { const sc = falak.signCharacter(sky.ascendant.sign); return card({ title: `طبعُ الطالع — ${esc(sky.ascendant.sign)}`, body: `<div class="kv">
        ${sc.traits.length ? "خصالُه: <b>" + sc.traits.map(esc).join("، ") + "</b>." : "لا خصلةَ مخصوصة."}<br>
        فعلُ مثلَّثته: ${esc(sc.triplicityAction || "—")}.
        ${sc.skinDisease ? `<br>من بروج الأمراض الجلديّة (${esc(sc.skinDiseasesIfAfflicted)}) إن انتحس فيه القمرُ أو سهمُ السعادة.` : ""}</div>
        <div class="gloss" style="margin-top:.4rem">${esc(sc.note)}</div>`,
        basis: "بروجُ الفِطنة (جوزاء/سنبلة/ميزان)، النسيان (سرطان/عقرب/حوت)، الإدراك (حمل/أسد/قوس)، السماحة (جوزاء/سنبلة/ميزان/عقرب/قوس/حوت)؛ وأفعالُ المثلَّثات. [أحكام الحكيم ج١ ص ١٥٤–١٥٥]" }); })()}
    </div>`;
    $("#io10", main).innerHTML = `<div class="grid wide">
      ${(() => { const mf = sky.mundane; return card({ title: `فصلُ ${esc(mf.season)} — الحرّ والبرد`, body: `<div class="kv">
        ${mf.thermal.length ? mf.thermal.map(esc).join("<br>") : "لا أثرَ خاصٌّ لزحل/المريخ بالمثلَّثات الآن."}<br>
        <b>الطقس:</b> ${esc(mf.weather)}${mf.airyEmphasis ? " <span class=\"gloss\">(بروجٌ هوائيّة ⇒ يميل للرياح/البرد)</span>" : ""}</div>`,
        basis: `طالعُ ابتداءِ الفصل (نزولُ الشمس أوّلَ دقيقةٍ من برجٍ منقلب) + زحل/المريخ بالمثلَّثات + «فتحُ الباب». ${esc(mf.note)}` }); })()}
      ${(() => { const fb = sky.fathAlBab; return card({ title: "فتحُ الباب (نقلُ القمر النورَ)", body: `<div class="kv">
        ${fb.open ? fb.transfers.map((x) => `<b>${esc(x.from)} ← القمر → ${esc(x.to)}</b>: ${esc(x.meaning)}`).join("<br>")
          : "غيرُ مفتوحٍ الآن — لا نقلَ نورٍ بين زوجٍ متقابلِ البيوت."}</div>
        <div class="gloss">${esc(fb.open ? fb.transfers[0].seasonRule : "شرطُه: ينصرفُ القمرُ عن كوكبٍ ويتّصلُ بمقابلِه وهو في بيتِه.")}</div>` }); })()}
      ${(() => { const mf = sky.mundane; return card({ title: "الغلاءُ والرخص", k: esc(mf.prices.direction), body: `<div class="kv">
        القمرُ في <b>${esc(mf.prices.moonSign)}</b> (${esc(mf.prices.ascensionKind)} الطلوع) ⇒ سعرُ «<b>${esc(mf.prices.substance)}</b>» <b>${esc(mf.prices.direction)}</b>.</div>
        <div class="gloss">${esc(mf.prices.note)}</div>`,
        basis: "بروجٌ مستقيمةُ الطلوع (السرطان→القوس) ⇒ غلاءٌ لجوهرها؛ معوجةُ الطلوع (الجدي→الجوزاء) ⇒ رخص. [أحكام الحكيم ج٤ ص ٢٢]" }); })()}
      ${(() => { const oo = sky.orientalOccidental; return card({ title: "تشريقُ الكواكب وتغريبُها", body: `<div class="kv">${Object.entries(oo).filter(([, v]) => v.phase !== "—").map(([p, v]) => `${esc(p)}: <b>${esc(v.phase)}</b> — ${esc(v.note)}`).join("<br>")}</div>`,
        basis: "العلويّةُ (مريخ/مشتري/زحل) تقوى مشرِّقةً، والسفليّةُ (زهرة/عطارد) تقوى مغرِّبةً؛ والرجوعُ يُضعِف. [أحكام الحكيم ج١ الدرس ٢٧، ص ١٤٨–١٤٩]" }); })()}
      ${card({ title: "نقلُ النور وجمعُه", body: `<div class="kv">
        ${sky.translationOfLight.any ? sky.translationOfLight.transfers.map((x) => esc(x.text)).join("<br>") : "لا نقلَ نورٍ الآن."}<br>
        ${sky.collectionOfLight.any ? sky.collectionOfLight.collections.map((x) => esc(x.text)).join("<br>") : "لا جمعَ نورٍ الآن."}</div>`,
        basis: "نقلُ النور: كوكبٌ خفيفٌ منصرفٌ عن كوكبٍ متّصلٌ بآخرَ ⇒ ينقلُ النورَ بينهما. جمعُ النور: كوكبان أخفُّ حركةً يتّصلان بأثقلَ منهما ⇒ يجمعُ نورَهما. [أحكام الحكيم ج١ ص ١٤٩]" })}
    </div>
    <div class="gloss" style="margin-top:.5rem">${esc(sky.mundane.verdict)}</div>`;
    wireCards(main);
  })();
  (() => {
    const c = ctx();
    let r; try { r = prediction.reading({ name: c.name, mother: c.mother, question: c.question, when: c.birth, now: c.now, lat: c.lat, lon: c.lon }); } catch (e) { $("#io11", main).innerHTML = `<div class="warn">${esc(e.message)}</div>`; return; }
    const sky = r.sky;
    $("#io11", main).innerHTML = `<div class="grid wide">
      ${card({ title: "طالعُ المولد", k: fmtDateTime(c.birth),
        body: `<div class="kv">ربُّ يومِ مولدك: <b>${esc(sky.day.planet)}</b> (${esc(sky.day.weekday)}).<br>
          وُلدتَ في الساعةِ الكوكبيّة <b>#${AR(sky.hour.i)} ${esc(sky.hour.phase)}</b>، يحكمها <b>${esc(sky.hour.ruler)}</b>.<br>
          الطالعُ الصاعدُ على أفقِك: <b>${esc(sky.ascendant.sign)} ${AR(sky.ascendant.degreeInSign.toFixed(1))}°</b> (وجهُه ${esc(sky.ascendant.face.ruler)}، حدُّه ${esc(sky.ascendant.term.ruler)}).<br>
          والقمرُ في المنزلة <b>${AR(sky.moonMansion.number)} — ${esc(sky.moonMansion.name)}</b>؛ حرفُها «${esc(sky.moonMansion.letter)}»، كوكبُها ${esc(sky.moonMansion.letterPlanet || "—")}، ملَكُها ${esc(sky.moonMansion.letterAngel || "—")}، روحانيّتُها «${esc(sky.moonMansion.roohaniyya)}».</div>
          <div class="kv" style="margin-top:.4rem">قال في هذه المنزلة: ${esc(sky.moonMansion.sourceNote)}</div>`,
        basis: `تاريخُ وساعةُ المولد (${fmtDateTime(c.birth)}) + الإحداثيّات (${AR(c.lat)}، ${AR(c.lon)})، بحسابٍ فلكيٍّ دقيقٍ عبر astronomy-engine.` })}
      ${r.skyNow ? card({ title: "الحالُ الفلكيّةُ اليومَ", k: fmtDate(c.now),
        body: `<div class="kv">يومَ استشارتك (${fmtDate(c.now)}): ربُّ اليوم <b>${esc(r.skyNow.day.planet)}</b> (${esc(r.skyNow.day.weekday)})، والساعةُ الجاريةُ يحكمها <b>${esc(r.skyNow.hour.ruler)}</b>.<br>
          الطالعُ الصاعدُ الآن: <b>${esc(r.skyNow.ascendant.sign)} ${AR(r.skyNow.ascendant.degreeInSign.toFixed(1))}°</b>، والقمرُ في المنزلة <b>${AR(r.skyNow.moonMansion.number)} — ${esc(r.skyNow.moonMansion.name)}</b> (تُوافق: ${esc(r.skyNow.moonMansion.work)}).</div>`,
        basis: `لقطةٌ فلكيّةٌ دقيقةٌ للحظةِ فتحِ القراءة (${fmtDate(c.now)})، لا للمولد — عليها يُبنى حكمُ المسألةِ والتوقيت.` }) : ""}
    </div>`;
    wireCards(main);
  })();
  main.querySelectorAll(".imgslot").forEach((slot) => {
    const slug = slot.id.replace("slot-", "");
    const img = new Image();
    img.onload = () => { slot.innerHTML = ""; slot.appendChild(img); };
    img.onerror = () => {};
    img.src = `../assets/spirits/${slug}.png`;
  });
};

// ── إقلاع ────────────────────────────────────────────────────────────
function fillSelect(sel, groups) {
  if (!sel) return;
  for (const [group, items] of groups) {
    const og = document.createElement("optgroup");
    og.label = group;
    for (const it of items) {
      const o = document.createElement("option");
      const label = Array.isArray(it) ? it[0] : it;
      o.value = label; o.textContent = label; og.appendChild(o);
    }
    sel.appendChild(og);
  }
}
function refreshMeHint() {
  const c = ctx();
  const el = $("#me-hint");
  if (!el) return;
  const missing = [!c.name && "الاسم", !c.mother && "اسم الأمّ", !c.date && "تاريخ الميلاد", !c.city && !c.filled && "مدينة الميلاد"].filter(Boolean);
  const badLetters = c.filled && (!c.nameOk || !c.motherOk);
  let summaryText = "";
  if (!c.ready) {
    el.className = "me-hint" + (badLetters ? " bad" : "");
    el.textContent = badLetters
      ? "اكتبِ الاسمَ واسمَ الأمّ بحروفٍ عربيّة — الحسابُ حرفيٌّ عربيّ، واسمٌ بلا حرفٍ عربيٍّ يعطي قراءةً وهميّة."
      : "أكمِل: " + missing.join("، ") + " — ثمّ تعمل كلّ أدوات التحليل.";
  } else {
    const hh = +c.time.split(":")[0];
    const per = hh < 5 ? "فجرًا" : hh < 12 ? "صباحًا" : hh < 17 ? "ظهرًا" : hh < 20 ? "مساءً" : "ليلًا";
    const d = new Date(c.date + "T00:00:00");
    summaryText =
      `${c.name} — مواليد ${AR(d.getDate())} ${AR_MONTHS[d.getMonth()]} ${AR(d.getFullYear())}، الساعة ${AR(c.time)} ${per} في ${c.city || "إحداثيّاتٍ يدويّة"}` +
      ` · السؤال: ${c.question ? "«" + c.question + "»" : "لم يُختَر"}`;
    el.className = "me-hint ok";
    el.textContent = "البطاقة مكتملة — تُحفَظ تلقائيًّا في متصفّحك.";
  }
  const wrap = $("#ctx-target-wrap");
  if (wrap) wrap.hidden = !c.needsTarget;
  const sum = $("#me-summary");
  if (sum) sum.innerHTML = summaryText ? `${svgI("check")}<span>${esc(summaryText)}</span>` : "";
}
document.addEventListener("click", (e) => {
  const pb = e.target.closest(".printbtn");
  if (pb) {
    // يجمع كلّ SVG.printable السابق مباشرةً لزرّ الطباعة (قد يكون أكثر من واحد متتالٍ)
    // ويفتحها في نافذةٍ مستقلّةٍ للطباعة/الحفظ PDF، بدل طباعة الصفحة كاملةً.
    const svgs = [];
    let node = pb.previousElementSibling;
    while (node && node.tagName === "svg" && node.classList.contains("printable")) { svgs.unshift(node.outerHTML); node = node.previousElementSibling; }
    if (!svgs.length) return;
    const w = window.open("", "_blank", "width=500,height=650");
    if (!w) { alert("امنع المتصفّحُ فتحَ نافذةٍ جديدة — اسمح بالنوافذ المنبثقة لهذا الموقع وحاول مجدّدًا."); return; }
    w.document.write(`<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>طباعة</title>
      <style>body{margin:2rem;text-align:center;color:#000}svg{width:100%;max-width:340px;color:#000;margin:1rem auto;display:block}</style>
      </head><body>${svgs.join("")}<script>onload=()=>{print();}<\/script></body></html>`);
    w.document.close();
    return;
  }
  const a = e.target.closest("[data-nav]");
  if (a) { e.preventDefault(); route(a.dataset.nav); }
});
buildNav();
fillSelect($("#ctx-question"), QUESTION_GROUPS);
fillSelect($("#ctx-city"), CITY_GROUPS);
loadCtx();
refreshMeHint();
CTX_IDS.forEach((id) => {
  const el = $("#" + id);
  if (!el) return;
  el.addEventListener("input", () => { saveCtx(); refreshMeHint(); });
  // عند تغيير أيّ حقلٍ فعليًّا: أعِد بناء اللوحة الحالية لتظهر النتيجة فورًا
  el.addEventListener("change", () => { saveCtx(); refreshMeHint(); route(CURRENT); });
});
const meConfirm = $("#me-confirm");
$("#me-clear").addEventListener("click", () => { if (meConfirm) meConfirm.hidden = false; $("#me-confirm-no")?.focus(); });
$("#me-confirm-no")?.addEventListener("click", () => { if (meConfirm) meConfirm.hidden = true; });
$("#me-confirm-yes")?.addEventListener("click", () => {
  CTX_IDS.forEach((id) => { const el = $("#" + id); if (el) { el.value = ""; el.classList.remove("err"); } });
  const t = $("#ctx-time"); if (t) t.value = "12:00";
  try { localStorage.removeItem("smk-ctx"); } catch {}
  if (meConfirm) meConfirm.hidden = true;
  refreshMeHint();
  route(CURRENT);
  $("#ctx-name")?.focus();
});
// «تمّ»: يتحقّق ويُعلِّم الناقص، أو يفتح الجلسة الكاملة
$("#me-done")?.addEventListener("click", () => {
  const c = ctx();
  const marks = { "ctx-name": !c.name || !c.nameOk, "ctx-mother": !c.mother || !c.motherOk, "ctx-date": !c.date, "ctx-city": !c.filled && !c.city };
  let first = null;
  for (const [id, bad] of Object.entries(marks)) { const el = $("#" + id); if (!el) continue; el.classList.toggle("err", bad); if (bad && !first) first = el; }
  refreshMeHint();
  if (c.ready) route("session"); else { first?.focus(); $("#me-hint")?.scrollIntoView({ block: "center", behavior: "smooth" }); }
});
CTX_IDS.forEach((id) => $("#" + id)?.addEventListener("input", (e) => e.target.classList.remove("err")));

const revToggle = $("#revToggle"), revBtn = $("#revbtn");
revToggle.addEventListener("change", (e) => { document.body.classList.toggle("reveal-on", e.target.checked); revBtn?.setAttribute("aria-pressed", String(e.target.checked)); });
revBtn?.addEventListener("click", () => { revToggle.checked = !revToggle.checked; revToggle.dispatchEvent(new Event("change")); });
window.addEventListener("resize", () => {
  refreshMeHint();
  if (!isAppMode() && appEl()?.classList.contains("searching")) closeSearch();
  closeDrawerIfDesktop();
  clearTimeout(window.__decoT); window.__decoT = setTimeout(() => { try { renderDeco(); } catch {} }, 150);
});
function closeDrawerIfDesktop() { if (!isAppMode()) closeDrawer(); }
refreshMeHint();

// الدرج + الشريط العلويّ + التبويبات السفليّة
$("#burger")?.addEventListener("click", () => appEl()?.classList.add("drawer"));
$("#scrim")?.addEventListener("click", closeDrawer);
$("#backbtn")?.addEventListener("click", () => route("tools"));
$("#helpbtn")?.addEventListener("click", () => route("manual"));
document.querySelectorAll("#bnav [data-tab]").forEach((b) => b.addEventListener("click", () => (b.dataset.tab === "search" ? openSearch() : route(b.dataset.tab))));

// ── البحث العامّ: تبويباتٌ بالفئات، تنقّلٌ بالأسهم، وصفحةٌ كاملة على الموبايل ──
const qout = $("#qout"), qIn = $("#q");
const SP = { tab: "all", sel: 0, shown: [] };
const SP_TABS = [["all", "الكلّ"], ["tools", "الأدوات"], ["names", "الأسماء والأدعية"], ["khawass", "الخواصّ"], ["corpus", "نصّ الكتاب"]];
function searchRows(term) {
  const rows = [];
  for (const [, items] of NAV) for (const [id, label] of items)
    if (label.includes(term) || (BRIEF[id] || "").includes(term)) rows.push({ type: "tools", src: "أداة", text: plainLabel(label), go: id });
  try {
    const kw = khawass.search(term);
    kw.names.slice(0, 6).forEach((n) => rows.push({ type: "names", src: "اسم حسنى", text: `${n.name} — ${n.khassa}`, go: "khawass" }));
    kw.adiya.slice(0, 4).forEach((a) => rows.push({ type: "names", src: "دعاء", text: `${a.name} — ${a.purpose}`, go: "khawass" }));
    kw.surahs.slice(0, 5).forEach((s) => rows.push({ type: "khawass", src: "خواصّ", text: `${s.ref} — ${s.uses}`, go: "khawass" }));
  } catch {}
  try { corpus.search(term, { limit: 8 }).hits.forEach((h) => rows.push({ type: "corpus", src: "نصّ الكتاب", text: h.snippet, go: "corpus" })); } catch {}
  return rows;
}
const markTerm = (text, term) => esc(text).split(esc(term)).join(`<mark>${esc(term)}</mark>`);
function renderSearch() {
  const term = qIn.value.trim();
  const app = appEl();
  if (term.length < 2 && !app?.classList.contains("searching")) { qout.classList.remove("open"); qIn.setAttribute("aria-expanded", "false"); return; }
  const all = term.length < 2 ? [] : searchRows(term);
  const count = (k) => (k === "all" ? all.length : all.filter((r) => r.type === k).length);
  SP.shown = SP.tab === "all" ? all : all.filter((r) => r.type === SP.tab);
  SP.sel = Math.min(SP.sel, Math.max(0, SP.shown.length - 1));
  qout.innerHTML = `<div class="sp-tabs" role="tablist">${SP_TABS.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${SP.tab === k}">${l}<span class="c">${AR(count(k))}</span></button>`).join("")}</div>
    <div class="sp-list">${term.length < 2 ? `<div class="sp-empty">اكتبْ حرفين على الأقلّ للبحث في الأدوات والأسماء والخواصّ ونصّ الكتاب.</div>`
      : SP.shown.length ? SP.shown.map((r, i) => `<div class="row" role="option" data-i="${i}" aria-selected="${i === SP.sel}"><span class="src chip${r.type === "tools" ? " gold" : ""}">${esc(r.src)}</span><span class="txt">${markTerm(r.text, term)}</span></div>`).join("")
      : `<div class="sp-empty">لا نتائجَ لـ «${esc(term)}» في هذا التبويب. جرّبْ كلمةً أقصر، أو تبويبَ «الكلّ».</div>`}</div>
    <div class="sp-foot"><span>↑↓ للتنقّل</span><span>Enter للفتح</span><span>Esc للإغلاق</span></div>`;
  qout.classList.add("open");
  qIn.setAttribute("aria-expanded", "true");
}
function openSearch() {
  closeDrawer();
  if (isAppMode()) appEl()?.classList.add("searching");
  document.querySelectorAll("#bnav [data-tab]").forEach((b) => (b.dataset.tab === "search" ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current")));
  renderSearch();
  qIn.focus();
}
function closeSearch() {
  qout.classList.remove("open");
  qIn.setAttribute("aria-expanded", "false");
  const app = appEl();
  if (app?.classList.contains("searching")) { app.classList.remove("searching"); try { updateChrome(CURRENT); } catch {} }
}
function pickSearch(i) { const r = SP.shown[i]; if (!r) return; qIn.blur(); route(r.go); }
qIn.addEventListener("input", () => { SP.sel = 0; renderSearch(); });
qIn.addEventListener("focus", () => { if (qIn.value.trim().length >= 2) renderSearch(); });
qIn.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeSearch(); qIn.blur(); return; }
  if (!qout.classList.contains("open")) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); SP.sel = Math.max(0, Math.min(SP.shown.length - 1, SP.sel + (e.key === "ArrowDown" ? 1 : -1))); renderSearch(); qout.querySelector('[aria-selected="true"].row')?.scrollIntoView({ block: "nearest" }); }
  if (e.key === "Enter") { e.preventDefault(); pickSearch(SP.sel); }
});
qout.addEventListener("mousedown", (e) => { const tb = e.target.closest("[data-tab]"); if (tb) { e.preventDefault(); SP.tab = tb.dataset.tab; SP.sel = 0; renderSearch(); } });
qout.addEventListener("click", (e) => { const row = e.target.closest(".row[data-i]"); if (row) pickSearch(+row.dataset.i); });
$("#searchbtn")?.addEventListener("click", openSearch);
$("#scancel")?.addEventListener("click", () => { qIn.value = ""; closeSearch(); });
document.addEventListener("click", (e) => {
  if (appEl()?.classList.contains("searching")) return;
  if (!e.target.closest(".search") && !e.target.closest("#searchbtn") && !e.target.closest('#bnav [data-tab="search"]')) closeSearch();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
  const tag = document.activeElement?.tagName;
  if (e.key === "/" && tag !== "INPUT" && tag !== "SELECT" && tag !== "TEXTAREA" && !isAppMode()) { e.preventDefault(); qIn.focus(); }
});

let _startPanel = "home";
try { _startPanel = localStorage.getItem("smk-panel") || "home"; } catch {}
if (!SHELL_PAGES.includes(_startPanel) && !PANELS[_startPanel]) _startPanel = "home";
route(_startPanel);
