// apps-script/Code.gs — Google Apps Script (مجّانيّ)
// ١) يستقبلُ إجابات «صار / لم يصر» و«صح / مش صح» من الموقع ويكتبُ كلَّ إجابةٍ سطرًا في Google Sheet.
// ٢) مرّةً في اليوم (مشغّلٌ زمنيّ) يرسلُ إجاباتِ اليوم ملفًّا واحدًا إلى مستودع GitHub خاصّ ليتعلّمَ منها المحرّك.
// المفتاحُ GITHUB_TOKEN في «خصائص السكربت» (Project Settings → Script Properties) — لا يصلُ إلى المتصفّح.
//   GITHUB_TOKEN  مفتاحٌ دقيقُ الصلاحيّة: Contents = Read and write على مستودع الإجابات وحدَه
//   GH_OWNER      مثلًا Mneizel
//   GH_REPO       مثلًا shams-feedback   (Private)

const KINDS = ["month", "marriage", "ask", "trait", "palm"];
const DAILY_MAX = 80;   // أقصى عددِ إجاباتٍ للشخص الواحد في اليوم (حمايةٌ من الإجابات الوهميّة المتكرّرة)
const TOPICS = ["all", "work", "money", "love", "health", "study"];
const COLS = ["at", "name", "mother", "date", "time", "city", "resCity", "kind", "ok", "topic", "month", "item", "said", "q", "score", "fams", "meths", "lines", "state", "first", "quiz", "age", "sex", "ver", "person", "sent"];
const TEXT = ["at", "name", "mother", "date", "time", "city", "resCity", "month", "item", "said", "q", "fams", "meths", "lines", "state", "ver", "person", "sent"];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("answers");
  // ورقةٌ بعناوينَ قديمة ⇒ يُعادُ تسميتُها وتُنشأُ ورقةٌ جديدةٌ بالأعمدة الحاليّة (لا يضيعُ شيء)
  if (sh && sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].join("|") !== COLS.join("|")) { sh.setName("answers_old_" + Date.now()); sh = null; }
  if (!sh) { sh = ss.insertSheet("answers", 0); sh.appendRow(COLS); sh.setFrozenRows(1); }
  // الأعمدةُ النصّيّة تبقى نصًّا: Sheets يحوّلُ «0000…» إلى 0 و«2026-09» إلى تاريخ
  TEXT.forEach(function (c) { sh.getRange(1, COLS.indexOf(c) + 1, sh.getMaxRows(), 1).setNumberFormat("@"); });
  return sh;
}

/** يتحقّقُ من شكل الإجابة ويُبقي الحقولَ المعروفةَ فقط */
function clean_(b) {
  if (!b || typeof b !== "object" || KINDS.indexOf(b.kind) < 0) return null;
  if (typeof b.person !== "string" || !/^[0-9a-f]{16}$/.test(b.person) || typeof b.ok !== "boolean") return null;
  const r = { at: new Date().toISOString(), kind: b.kind, person: b.person, ok: b.ok };
  COLS.forEach(function (c) { if (!(c in r)) r[c] = ""; });
  const txt = (v, n) => (typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").trim().slice(0, n) : "");
  const nums = (o, re) => { const f = {}; Object.keys(o || {}).forEach(function (k) { if (re.test(k) && isFinite(o[k])) f[k] = Math.round(o[k] * 100) / 100; }); return JSON.stringify(f); };
  r.name = txt(b.name, 40); r.said = txt(b.said, 300);
  // معطياتُ الميلاد لإعادة القراءة نفسها عند التشخيص
  r.mother = txt(b.mother, 40); r.city = txt(b.city, 60); r.resCity = txt(b.resCity, 60);
  r.date = /^\d{4}-\d{2}-\d{2}$/.test(b.date || "") ? b.date : "";
  r.time = /^\d{2}:\d{2}$/.test(b.time || "") ? b.time : "";
  r.sex = b.sex === "f" ? "f" : b.sex === "m" ? "m" : "";
  r.ver = /^[0-9a-z.-]{1,20}$/i.test(b.ver || "") ? b.ver : "";
  const keys = (a) => JSON.stringify((Array.isArray(a) ? a : []).filter(function (k) { return typeof k === "string" && /^[a-z0-9_]{2,24}$/.test(k); }).slice(0, 20));
  if (b.kind === "trait" || b.kind === "palm") {
    r.item = txt(b.item, 80); if (!r.item) return null;
    r.lines = keys(b.lines);
    // حالك: لكلّ كتابٍ أصاب (+١) أو أخطأ (−١) — في «أحيانًا» يُصدَّقُ كتابُ الجهة المختارة ويُكذَّبُ كتابُ الأخرى
    if (b.kind === "trait") r.meths = nums(b.meths, /^[a-z0-9_]{2,24}$/);
  } else if (b.kind === "month" || b.kind === "ask") {
    if (TOPICS.indexOf(b.topic) < 0 || typeof b.month !== "string" || !/^\d{4}-\d{2}$/.test(b.month)) return null;
    r.topic = b.topic; r.month = b.month;
    r.score = isFinite(b.score) ? Math.round(b.score * 100) / 100 : "";
    r.fams = nums(b.fams, /^[a-z+]{2,20}$/);
    r.meths = nums(b.meths, /^[a-z+]{2,20}:[a-z+]{2,20}$/);
    if (b.kind === "ask") r.q = txt(b.q, 200);
    r.item = txt(b.item, 80);            // جملةٌ واحدةٌ من الشهر (إن أُجيب عنها وحدَها)
    r.quiz = b.quiz === true ? true : "";  // من «الاختبار السريع» (أشهرٌ اختارها العارف)
  } else {
    if (typeof b.state !== "string" || b.state.length > 30) return null;
    r.state = b.state; r.first = (b.first === null || isNaN(b.first)) ? "" : Math.trunc(b.first);
    r.lines = keys(b.lines);
    // تاريخُ الزواج الحقيقيّ (سنة، أو سنة-شهر، أو سنة-شهر-يوم) أو «لم يتزوّج»، وأصابت/أخطأت لكلّ طريقة (+١/−١)
    r.item = /^\d{4}(-\d{2}(-\d{2})?)?$/.test(b.item || "") || b.item === "لم يتزوّج" ? b.item : "";
    r.meths = nums(b.meths, /^[a-z0-9]{2,20}$/);
  }
  if (isFinite(b.age) && b.age >= 0 && b.age < 130) r.age = Math.trunc(b.age);
  return r;
}

function doPost(e) {
  const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  try {
    const raw = (e && e.postData && e.postData.contents) || "";
    if (raw.length > 5000) return out({ ok: false, error: "too large" });
    const r = clean_(JSON.parse(raw));
    if (!r) return out({ ok: false, error: "bad shape" });
    // حدٌّ يوميٌّ لكلّ شخص
    const cache = CacheService.getScriptCache(), ck = "n:" + r.person + ":" + r.at.slice(0, 10), n = +(cache.get(ck) || 0);
    if (n >= DAILY_MAX) return out({ ok: false, error: "daily limit" });
    cache.put(ck, String(n + 1), 21600);
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { sheet_().appendRow(COLS.map(function (c) { return c === "sent" ? "" : TEXT.indexOf(c) >= 0 && r[c] !== "" ? "'" + r[c] : r[c]; })); } finally { lock.releaseLock(); }
    return out({ ok: true });
  } catch (err) { return out({ ok: false, error: String(err) }); }
}

/** يُشغَّلُ يوميًّا: يرسلُ الإجاباتِ غيرَ المرسَلة ملفًّا واحدًا إلى GitHub ويعلّمُها «sent»، ثمّ يحدّثُ ورقةَ التقرير */
function pushToGitHub() {
  try { buildReport(); } catch (x) { console.error("report: " + x); }
  const p = PropertiesService.getScriptProperties();
  const token = p.getProperty("GITHUB_TOKEN"), owner = p.getProperty("GH_OWNER"), repo = p.getProperty("GH_REPO");
  if (!token || !owner || !repo) throw new Error("ضعْ GITHUB_TOKEN و GH_OWNER و GH_REPO في خصائص السكربت");
  const sh = sheet_(), data = sh.getDataRange().getValues(), head = data[0], iSent = head.indexOf("sent");
  const rows = [], idx = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][iSent]) continue;
    const o = {}; head.forEach(function (h, j) { if (h !== "sent") o[h] = data[i][j]; });
    ["fams", "meths", "lines"].forEach(function (k) { if (o[k]) { try { o[k] = JSON.parse(o[k]); } catch (x) { o[k] = {}; } } });
    o.ok = o.ok === true || o.ok === "TRUE" || o.ok === "true";
    if (o.at instanceof Date) o.at = o.at.toISOString();
    if (o.month instanceof Date) o.month = Utilities.formatDate(o.month, "UTC", "yyyy-MM");
    o.person = String(o.person);
    if (!/^[0-9a-f]{16}$/.test(o.person)) continue;   // سطرٌ تالف (بصمةٌ حوّلها Sheets رقمًا) لا يُرسَل
    rows.push(o); idx.push(i + 1);
  }
  if (!rows.length) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const path = "feedback/" + stamp.slice(0, 7) + "/" + stamp + ".json";
  const res = UrlFetchApp.fetch("https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + path, {
    method: "put", muteHttpExceptions: true, contentType: "application/json",
    headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json" },
    payload: JSON.stringify({ message: "feedback " + rows.length + " answers", content: Utilities.base64Encode(JSON.stringify(rows, null, 1), Utilities.Charset.UTF_8) }),
  });
  if (res.getResponseCode() >= 300) throw new Error("GitHub " + res.getResponseCode() + ": " + res.getContentText().slice(0, 200));
  idx.forEach(function (r) { sh.getRange(r, iSent + 1).setValue(stamp); });
}

const AR_FAM = { periods: "أزمنةُ العمر", sky: "مرورُ الكواكب", numbers: "علمُ الأرقام", name: "الاسم", divination: "الرملُ والجفر", question: "لحظةُ السؤال", horary: "علمُ المسائل", "periods+sky": "الخطُّ الزمنيّ" };
const AR_METH = { firdaria: "الفردارات", profection: "الانتهاء", tasyir: "التسيير", qisma: "القاسم", revolution: "تحويلُ السنة", sky: "مرورُ المشتري وزحل والمريخ", venus: "مرورُ الزهرة", house: "المشتري وزحل في البيوت", eclipse: "الكسوف", raml: "الرمل", jafr: "الجفر", numbers: "الأرقام", name: "الاسم" };
const AR_MARR = { prof7: "الانتهاء إلى السابع", profvenus: "الانتهاء إلى الزهرة/سهم الزواج", firdaria: "فترةُ الزهرة", firdariamars: "فترةُ المريخ", dirlum: "تسييرُ النيّر إلى الزهرة", dirmc: "تسييرُ وسط السماء إلى الزهرة", jupiter: "عبورُ المشتري", ptolemy: "قاعدةُ بطليموس (مبكّر/متأخّر)" };
const AR_LINE = {"chart":"مزاجُ الخريطة","name":"مزاجُ حروفِ الاسم","manners":"دليلُ الأخلاق","sign":"برجُ دليلِ الأخلاق","wit":"عطاردُ والقمر","ptol_signs":"بروجُ عطاردَ والقمر","ptol_ruler":"حاكمُ النفس","ptol_moon":"حالُ القمر","am_asc":"طالعُ المولد (أبو معشر)","name_sign":"برجُ الاسم (كشف المكتوم)","asc_degree":"درجةُ الطالع (كتاب الدرج)","birth_number":"رقمُ يوم الميلاد (Cheiro)","th_social":"الطالعُ وصاحبُه (الثمرة)","th_merc":"عطاردُ في بُرجَي زحلَ أو المريخ (الثمرة)","dalil":"مرتبةُ الطالع (دليل الحيران)"};
const AR_TOPIC = { all: "عامّ", work: "شغل", money: "فلوس", love: "حبّ وزواج", health: "صحّة", study: "دراسة" };

/** ورقةُ «report»: كم إجابة، وأيُّ علمٍ وطريقةٍ وكتابٍ يصيبُ — مقارنةً بالصدفة — وتقييمُ التعلّم */
function buildReport() {
  const sh = sheet_(), data = sh.getDataRange().getValues(), head = data[0];
  const col = (n) => head.indexOf(n), rows = data.slice(1);
  const J = (v) => { try { return v ? JSON.parse(String(v).replace(/^'/, "")) : {}; } catch (x) { return {}; } };
  const L = (v) => { const x = J(v); return Array.isArray(x) ? x : []; };
  const okOf = (v) => v === true || v === "TRUE" || v === "true";
  const strong = (r) => { const sc = +r[col("score")]; return isFinite(sc) && Math.abs(sc) >= 0.45; };
  // نسبةُ «صار» العامّة (أساسُ المقارنة بالصدفة) ونسبةُ «فيّ» في حالك
  const ar = rows.filter(function (r) { return (r[col("kind")] === "month" || r[col("kind")] === "ask") && strong(r); });
  const P = ar.length ? ar.filter(function (r) { return okOf(r[col("ok")]); }).length / ar.length : 0.5;
  const tr = rows.filter(function (r) { return r[col("kind")] === "trait" && String(r[col("item")]).indexOf("(لا ") < 0; });
  const Y = tr.length ? tr.filter(function (r) { return okOf(r[col("ok")]); }).length / tr.length : 0.5;
  const t = {}, add = (grp, key, hit, exp) => { const g = (t[grp] = t[grp] || {}); const x = (g[key] = g[key] || [0, 0, 0]); hit ? x[0]++ : x[1]++; x[2] += exp; };
  const people = {};
  const quiz = [0, 0];
  rows.forEach(function (r) {
    const kind = r[col("kind")], ok = okOf(r[col("ok")]); people[r[col("person")]] = 1;
    if (kind === "month" || kind === "ask") {
      if (!strong(r)) return;   // «عاديّ»: لا يُحتسَب
      const sc = +r[col("score")];
      add("topic", r[col("topic")], ok, P);
      if (okOf(r[col("quiz")])) { if (ok) quiz[0]++; else quiz[1]++; }
      const f = J(r[col("fams")]), m = J(r[col("meths")]);
      Object.keys(f).forEach(function (k) { if (f[k]) { const ag = Math.sign(f[k]) === Math.sign(sc); add("fam", k, ok === ag, ag ? P : 1 - P); } });
      Object.keys(m).forEach(function (k) { if (m[k]) { const ag = Math.sign(m[k]) === Math.sign(sc); add("meth", k, ok === ag, ag ? P : 1 - P); } });
    } else if (kind === "marriage") {
      add("marr_state", r[col("state")], ok, 0.5);
      const mm = J(r[col("meths")]);
      if (Object.keys(mm).length) Object.keys(mm).forEach(function (k) { add("marr", k, mm[k] > 0, 0.5); });
      else L(r[col("lines")]).forEach(function (k) { add("marr", k, ok, 0.5); });
    } else if (kind === "trait") {
      const choice = String(r[col("item")]).indexOf("(لا ") >= 0;
      add("trait", String(r[col("said")] || r[col("item")]), ok, choice ? 0.5 : Y);
      const tv = J(r[col("meths")]);
      if (Object.keys(tv).length) Object.keys(tv).forEach(function (k) { add("line", k, tv[k] > 0, choice ? 0.5 : Y); });
      else L(r[col("lines")]).forEach(function (k) { add("line", k, ok, Y); });
    } else if (kind === "palm") add("palm", r[col("item")], ok, 0.5);
  });
  // تقييمُ التعلّم من GitHub (الإصابةُ قبل الأوزان وبعدها)
  let ev = null;
  try {
    const owner = PropertiesService.getScriptProperties().getProperty("GH_OWNER");
    const txt = UrlFetchApp.fetch("https://raw.githubusercontent.com/" + owner + "/Shams/main/data/feedback-learned.data.js", { muteHttpExceptions: true }).getContentText();
    const mm = txt.match(/export const LEARNED = ([\s\S]*);\s*$/); ev = mm ? (JSON.parse(mm[1]).eval || null) : null;
  } catch (x) {}
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let rep = ss.getSheetByName("report"); if (!rep) rep = ss.insertSheet("report", 1); rep.clear();
  const pc = (x) => Math.round(100 * x) + "%";
  const out = [["تقريرُ التعلّم", "", "", "", "", "", ""], ["آخرُ تحديث", new Date().toISOString().slice(0, 16).replace("T", " "), "", "", "", "", ""],
    ["عددُ الإجابات", rows.length, "عددُ الأشخاص", Object.keys(people).length, "", "", ""],
    ["نسبةُ «صار» العامّة", pc(P), "(الصدفةُ التي تُقاسُ عليها كلُّ طريقة)", "", "", "", ""],
    ["إصابةُ العارف في «الاختبار السريع»", quiz[0] + quiz[1] ? pc(quiz[0] / (quiz[0] + quiz[1])) : "—", "(أشهرٌ اختارها العارفُ لا الذاكرة — الأصدقُ)", quiz[0] + quiz[1], "", "", ""],
    ["تقييمُ التعلّم (GitHub)", ev ? ("قبل الأوزان " + ev.before + "% ← بعدها " + ev.after + "%") : "— لا تقييمَ بعد —", ev ? (ev.rejected ? "لم تُعتمَدِ الأوزانُ الجديدة (لم تُحسِّن)" : "اعتُمدت") : "", ev ? ev.answers : "", "", "", ""],
    ["", "", "", "", "", "", ""]];
  const section = (title, grp, label) => {
    out.push([title, "صحّ", "غلط", "نسبةُ الإصابة", "المتوقَّعُ بالصدفة", "فوقَ الصدفة", "عددُ الإجابات"]);
    const g = t[grp] || {};
    const lift = (x) => (x[0] - x[2]) / (x[0] + x[1]);
    const ks = Object.keys(g).sort(function (a, b) { return lift(g[a]) - lift(g[b]); });
    if (!ks.length) out.push(["— لا إجاباتَ بعد —", "", "", "", "", "", ""]);
    ks.forEach(function (k) { const x = g[k], n = x[0] + x[1]; const l = Math.round(100 * lift(x)); out.push([label(k), x[0], x[1], pc(x[0] / n), pc(x[2] / n), (l > 0 ? "+" : "") + l + "%", n]); });
    out.push(["", "", "", "", "", "", ""]);
  };
  section("العائلات (العارف) — الأضعفُ أوّلًا", "fam", function (k) { return AR_FAM[k] || k; });
  section("الطرق داخل العائلات", "meth", function (k) { const p = k.split(":"); return (AR_FAM[p[0]] || p[0]) + " ← " + (AR_METH[p[1]] || p[1]); });
  section("المواضيع", "topic", function (k) { return AR_TOPIC[k] || k; });
  section("الزواج: الحكم", "marr_state", function (k) { return k; });
  section("الزواج: الطرق", "marr", function (k) { return AR_MARR[k] || k; });
  section("حالك: الكتب/الخطوط", "line", function (k) { return AR_LINE[k] || k; });
  section("حالك: الصفات", "trait", function (k) { return k; });
  section("الكفّ: الأبواب", "palm", function (k) { return k; });
  out.push(["ملاحظة", "«فوقَ الصدفة» هو المهمّ: طريقةٌ نسبتُها ٧٥٪ والصدفةُ ٧٥٪ لا تصيبُ شيئًا. الأشهرُ العاديّةُ لا تُحتسَب، ولا يتغيّرُ وزنٌ قبل ٢٠ إجابةً من ٥ أشخاص.", "", "", "", "", ""]);
  rep.getRange(1, 1, out.length, 7).setValues(out);
  rep.getRange(1, 1).setFontWeight("bold").setFontSize(14);
  rep.setColumnWidth(1, 320);
}

/** يعيدُ إجاباتِ شخصٍ واحدٍ ببصمته (بلا اسمٍ ولا معطياتِ ميلاد) ليتعلّمَ الموقعُ منها على أيّ جهاز */
function doGet(e) {
  const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  const pid = String((e && e.parameter && e.parameter.p) || "");
  if (!/^[0-9a-f]{16}$/.test(pid)) return out({ ok: false, error: "bad person" });
  const sh = sheet_(), data = sh.getDataRange().getValues(), head = data[0], col = (n) => head.indexOf(n);
  const J = (v) => { try { return v ? JSON.parse(String(v).replace(/^'/, "")) : null; } catch (x) { return null; } };
  const KEEP = ["kind", "topic", "month", "item", "score", "fams", "meths", "lines", "state", "first", "quiz", "at"];
  const recs = data.slice(1).filter(function (r) { return String(r[col("person")]).replace(/^'/, "") === pid; }).slice(-300).map(function (r) {
    const o = {};
    KEEP.forEach(function (k) { const v = r[col(k)]; if (v === "" || v === undefined || v === null) return; o[k] = ["fams", "meths", "lines"].indexOf(k) >= 0 ? J(v) : (v instanceof Date ? v.toISOString() : String(v).replace(/^'/, "")); });
    o.ok = r[col("ok")] === true || r[col("ok")] === "TRUE" || r[col("ok")] === "true";
    if (o.score !== undefined) o.score = +o.score;
    if (o.quiz !== undefined) o.quiz = o.quiz === "true" || o.quiz === "TRUE";
    return o;
  });
  return out({ ok: true, recs: recs });
}

/** شغّلْها مرّةً واحدةً يدويًّا: تنشئُ المشغّلَ اليوميّ (الساعة ٣ فجرًا) */
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "pushToGitHub") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("pushToGitHub").timeBased().everyDays(1).atHour(3).create();
}
