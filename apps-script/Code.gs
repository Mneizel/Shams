// apps-script/Code.gs — Google Apps Script (مجّانيّ)
// ١) يستقبلُ إجابات «صار / لم يصر» و«صح / مش صح» من الموقع ويكتبُ كلَّ إجابةٍ سطرًا في Google Sheet.
// ٢) مرّةً في اليوم (مشغّلٌ زمنيّ) يرسلُ إجاباتِ اليوم ملفًّا واحدًا إلى مستودع GitHub خاصّ ليتعلّمَ منها المحرّك.
// المفتاحُ GITHUB_TOKEN في «خصائص السكربت» (Project Settings → Script Properties) — لا يصلُ إلى المتصفّح.
//   GITHUB_TOKEN  مفتاحٌ دقيقُ الصلاحيّة: Contents = Read and write على مستودع الإجابات وحدَه
//   GH_OWNER      مثلًا Mneizel
//   GH_REPO       مثلًا shams-feedback   (Private)

const KINDS = ["month", "marriage"];
const TOPICS = ["all", "work", "money", "love", "health", "study"];
const COLS = ["at", "kind", "person", "ok", "topic", "month", "score", "fams", "state", "first", "age", "sent"];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("answers");
  if (!sh) { sh = ss.insertSheet("answers"); sh.appendRow(COLS); sh.setFrozenRows(1); }
  return sh;
}

/** يتحقّقُ من شكل الإجابة ويُبقي الحقولَ المعروفةَ فقط (لا أسماءَ ولا تواريخَ ميلاد) */
function clean_(b) {
  if (!b || typeof b !== "object" || KINDS.indexOf(b.kind) < 0) return null;
  if (typeof b.person !== "string" || !/^[0-9a-f]{16}$/.test(b.person) || typeof b.ok !== "boolean") return null;
  const r = { at: new Date().toISOString(), kind: b.kind, person: b.person, ok: b.ok, topic: "", month: "", score: "", fams: "", state: "", first: "", age: "" };
  if (b.kind === "month") {
    if (TOPICS.indexOf(b.topic) < 0 || typeof b.month !== "string" || !/^\d{4}-\d{2}$/.test(b.month)) return null;
    r.topic = b.topic; r.month = b.month;
    r.score = isFinite(b.score) ? Math.round(b.score * 100) / 100 : 0;
    const f = {};
    Object.keys(b.fams || {}).forEach(function (k) { if (/^[a-z+]{2,20}$/.test(k) && isFinite(b.fams[k])) f[k] = Math.round(b.fams[k] * 100) / 100; });
    r.fams = JSON.stringify(f);
  } else {
    if (typeof b.state !== "string" || b.state.length > 30) return null;
    r.state = b.state; r.first = (b.first === null || isNaN(b.first)) ? "" : Math.trunc(b.first);
  }
  if (isFinite(b.age) && b.age >= 0 && b.age < 130) r.age = Math.trunc(b.age);
  return r;
}

function doPost(e) {
  const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  try {
    const raw = (e && e.postData && e.postData.contents) || "";
    if (raw.length > 2000) return out({ ok: false, error: "too large" });
    const r = clean_(JSON.parse(raw));
    if (!r) return out({ ok: false, error: "bad shape" });
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { sheet_().appendRow(COLS.map(function (c) { return c === "sent" ? "" : r[c]; })); } finally { lock.releaseLock(); }
    return out({ ok: true });
  } catch (err) { return out({ ok: false, error: String(err) }); }
}

/** يُشغَّلُ يوميًّا: يرسلُ الإجاباتِ غيرَ المرسَلة ملفًّا واحدًا إلى GitHub ويعلّمُها «sent» */
function pushToGitHub() {
  const p = PropertiesService.getScriptProperties();
  const token = p.getProperty("GITHUB_TOKEN"), owner = p.getProperty("GH_OWNER"), repo = p.getProperty("GH_REPO");
  if (!token || !owner || !repo) throw new Error("ضعْ GITHUB_TOKEN و GH_OWNER و GH_REPO في خصائص السكربت");
  const sh = sheet_(), data = sh.getDataRange().getValues(), head = data[0], iSent = head.indexOf("sent");
  const rows = [], idx = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][iSent]) continue;
    const o = {}; head.forEach(function (h, j) { if (h !== "sent") o[h] = data[i][j]; });
    if (o.fams) { try { o.fams = JSON.parse(o.fams); } catch (x) { o.fams = {}; } }
    o.ok = o.ok === true || o.ok === "TRUE" || o.ok === "true";
    if (o.at instanceof Date) o.at = o.at.toISOString();
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

/** شغّلْها مرّةً واحدةً يدويًّا: تنشئُ المشغّلَ اليوميّ (الساعة ٣ فجرًا) */
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === "pushToGitHub") ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("pushToGitHub").timeBased().everyDays(1).atHour(3).create();
}
