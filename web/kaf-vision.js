// web/kaf-vision.js — طبقةُ الرؤيةِ لقراءةِ الكفّ (المتصفّح فقط، أوفلاين).
//   • MediaPipe Hand Landmarker (vendor/mediapipe/): ٢١ نقطةً ⇒ شكلُ اليدِ والأصابعِ والإبهام.
//   • OpenCV.js (vendor/opencv.js) داخل kaf-cv-worker.js (خيطٌ منفصل): إبرازُ تجاعيدِ الراحةِ في صورة.
//   لا يعملُ على file:// — يلزمُ خادمٌ محلّيّ (افتح-قراءة-الكف.bat).

import { measureShape, handTypeFrom, TIP_AR, FINGER_AR } from "./kaf-shape.js?v=2026-10-02e";
const MP_BASE = "../vendor/mediapipe";
export const KAF_VER = "2026-10-02e";
let HL = null, FR = null, IS = null, landmarker = null, landmarkerLoading = null;

function withTimeout(promise, ms, msg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

export async function ensureLoaded() {
  if (landmarker) return landmarker;
  // التحميلُ الجاري يُحفَظ: إن انتهت المهلةُ وأعادَ المستخدمُ المحاولة، ينتظرُ نفسَ التحميلِ
  // (الذي قد يكونُ قاربَ الاكتمال) بدلَ بدءِ تحميلٍ ثانٍ موازٍ لنحوِ ١٧ م.ب.
  if (!landmarkerLoading) {
    landmarkerLoading = (async () => {
      const mod = await import(`${MP_BASE}/vision_bundle.mjs`);
      HL = mod.HandLandmarker; FR = mod.FilesetResolver; IS = mod.InteractiveSegmenter;
      const fileset = await FR.forVisionTasks(`${MP_BASE}`);
      return HL.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${MP_BASE}/hand_landmarker.task` },
        numHands: 1, runningMode: "VIDEO",
        minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.6,
      });
    })().then((l) => (landmarker = l), (e) => { landmarkerLoading = null; throw e; });
  }
  // مهلةٌ صريحة حتى لا تبقى الواجهةُ عالقةً بلا رسالة؛ ٦٠ ث تكفي اتّصالًا بطيئًا لأوّلِ تحميل.
  return withTimeout(landmarkerLoading, 60000, "انتهت مهلةُ تحميلِ نموذجِ اليد — تحقّقْ من الاتّصال ثمّ أعِدِ المحاولة (يُكمِلُ من حيثُ وصل)");
}

// OpenCV.js يعملُ في خيطٍ منفصل (kaf-cv-worker.js) فلا يمسُّ الصفحةَ ولا الكاميرا مهما ثقُل.
// يُبدأ تحميلُه بعد فتحِ الكاميرا ويُستعمَلُ عند الالتقاط فقط لإبرازِ تجاعيدِ الراحةِ في صورة؛
// تسميةُ الخطوطِ وحالاتُها يحدّدُها المستخدمُ في الوضعِ اليدويّ (انظرْ تعليلَ ذلك في العامل).
// (سببُ «تجمّدِ الصفحة» القديم: انظرْ تنبيهَ thenable في العامل.)
let cvWorker = null, cvState = "idle", cvWaiters = [], cvSeq = 0;
const cvPending = new Map();
function cvSettle(state) {
  cvState = state;
  const w = cvWaiters; cvWaiters = [];
  w.forEach((f) => f(state));
}
export function preloadOpenCV() {
  if (cvWorker || cvState === "failed") return;
  try { cvWorker = new Worker(new URL("./kaf-cv-worker.js?v=" + KAF_VER, import.meta.url)); }
  catch { cvSettle("failed"); return; }
  cvState = "loading";
  cvWorker.onmessage = (e) => {
    const d = e.data || {};
    if ("ready" in d) { cvSettle(d.ready ? "ready" : "failed"); return; }
    const p = cvPending.get(d.id);
    if (p) { cvPending.delete(d.id); d.error ? p.reject(new Error(d.error)) : p.resolve(d.out); }
  };
  cvWorker.onerror = () => {
    cvSettle("failed");
    cvPending.forEach((p) => p.reject(new Error("تعطّلَ عاملُ OpenCV"))); cvPending.clear();
  };
}
function cvWhenReady(ms) {
  if (cvState === "ready" || cvState === "failed") return Promise.resolve(cvState);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve("timeout"), ms);
    cvWaiters.push((s) => { clearTimeout(t); resolve(s); });
  });
}
// يُرجِعُ {image, note}: صورةُ الراحةِ بتجاعيدِها المُبرَزة (رابطُ data:) أو نصُّ صراحةٍ إن تعذّرت.
async function creasesViaWorker(imageData, quad, drawPaths = true) {
  if (!cvWorker && cvState !== "failed") preloadOpenCV();
  const st = await cvWhenReady(15000);
  if (st !== "ready") return { image: null, note: st === "timeout" ? "محرّكُ إبرازِ الخطوطِ لم يجهزْ بعدُ (اتّصالٌ أو جهازٌ بطيء)." : "تعذّرَ تشغيلُ محرّكِ إبرازِ الخطوطِ على هذا الجهاز." };
  const id = ++cvSeq;
  try {
    const out = await withTimeout(new Promise((resolve, reject) => {
      cvPending.set(id, { resolve, reject });
      cvWorker.postMessage({ id, imageData, quad, drawPaths }, [imageData.data.buffer]);
    }), 15000, "انتهت مهلةُ إبرازِ الخطوط");
    const base = { width: out.width, height: out.height, data: new Uint8ClampedArray(out.data) };
    return { image: drawPaths ? toDataUrl(base) : null, base, lines: out.lines || null, note: null };
  } catch (e) {
    cvPending.delete(id);
    return { image: null, note: "تعذّرَ إبرازُ الخطوط (" + (e.message || e) + ")." };
  }
}

function toDataUrl(base) {
  const c = document.createElement("canvas");
  c.width = base.width; c.height = base.height;
  c.getContext("2d").putImageData(new ImageData(base.data, base.width, base.height), 0, 0);
  return c.toDataURL("image/jpeg", 0.88);
}
// ألوانُ الخطوطِ في الصورة (تطابقُ مفتاحَ الألوانِ في الواجهة)
export { TIP_AR, FINGER_AR };
export const LINE_COLORS = { heart: "#eb1e5a", head: "#1e78ff", life: "#14aa3c", fate: "#f0a000" };
function drawLinePaths(base, paths) {
  const c = document.createElement("canvas");
  c.width = base.width; c.height = base.height;
  const g = c.getContext("2d");
  g.putImageData(new ImageData(base.data, base.width, base.height), 0, 0);
  g.lineWidth = 4; g.lineCap = "round"; g.lineJoin = "round";
  for (const [k, pts] of Object.entries(paths)) {
    if (!pts || pts.length < 2) continue;
    g.strokeStyle = LINE_COLORS[k] || "#fff";
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke();
  }
  return c.toDataURL("image/jpeg", 0.9);
}
// kaf-lines.js سكربتٌ عاديّ يُعرِّفُ self.KafLines (يُستعمَلُ هنا لدمجِ اللقطات، وفي العاملِ للتحليل)
let _klLoading = null;
function loadKafLines() {
  if (self.KafLines) return Promise.resolve(self.KafLines);
  if (!_klLoading) _klLoading = import("./kaf-lines.js?v=" + KAF_VER).then(() => self.KafLines || null, () => null);
  return _klLoading;
}

const LINE_KEYS = ["heart", "head", "life", "fate"];
/** يحلّلُ خطوطَ عدّةِ إطاراتٍ لليدِ نفسِها ويدمجُها بالإجماع، ويكتبُ في feats: lines و_linePaths
 *  و_creaseImage و_linesDiag (لماذا قُرِئ ما قُرِئ، ولماذا رُفِض ما رُفِض) و_linesNote عند التعذّر. */
async function linesFromFrames(frames, feats, onProgress, isAborted = () => false) {
  const results = [];
  const diag = { frames: frames.length, analysed: 0, contrast: [], flat: 0, worker: null, rejected: {} };
  let shown = null;
  for (let k = 0; k < frames.length && !isAborted(); k++) {
    onProgress && onProgress(k, frames.length);
    const r = await creasesViaWorker(frames[k].img, frames[k].quad, false);
    if (r.note) { diag.worker = r.note; if (!feats._linesNote) feats._linesNote = r.note; }
    if (r.lines && r.lines.error) { diag.worker = "خطأٌ في محلّلِ الخطوط: " + r.lines.error; continue; }
    if (r.lines) {
      results.push(r.lines); diag.analysed++;
      const q = r.lines.quality || {};
      if (q.contrast != null) diag.contrast.push(q.contrast);
      if (q.tooFlat) diag.flat++;
      for (const lk of LINE_KEYS) { const ms = r.lines[lk] && r.lines[lk].measures; const why = ms && (ms.rejected || ms.weakWhy); if (why) (diag.rejected[lk] = diag.rejected[lk] || []).push(why); }
      if (!shown) shown = r;
    } else if (!r.note) diag.worker = "لم يُرجِعْ محلّلُ الخطوطِ نتيجة (ملفٌّ قديمٌ مخزَّن؟ أعِدْ تحميلَ الصفحة).";
  }
  if (results.length >= 2) {
    const KL = await loadKafLines();
    const agree = results.length >= 4 ? 0.75 : 1; // ٣ من ٤ فأكثر، أو كلُّها إن قلَّ العدد
    const c = KL ? KL.consensus(results, agree) : null;
    if (c) {
      for (const lk of LINE_KEYS) {
        const L = c[lk];
        feats.lines[lk] = L.present === true
          ? { present: true, confidence: L.confidence, states: L.states, source: "camera", unstable: L.unstable, weak: !!L.weak }
          : { present: false, confidence: 0, states: [], source: "camera", unclear: L.present === null };
      }
      feats._linePaths = Object.fromEntries(LINE_KEYS.map((lk) => [lk, c[lk].present === true ? c[lk].path : null]));
      feats._linesFrames = results.length;
    } else diag.worker = diag.worker || "تعذّرَ تحميلُ دمجِ اللقطات.";
  } else if (!feats._linesNote) {
    feats._linesNote = diag.worker || "لم تكفِ اللقطاتُ الواضحةُ لتحليلِ الخطوطِ بثبات — أعِدِ المحاولة أو أكمِلْها يدويًّا.";
  }
  if (diag.analysed && diag.flat === diag.analysed) {
    feats._linesNote = `الصورةُ لا تُظهِرُ تجاعيدَ الكفِّ بوضوحٍ كافٍ (تباينُ التجاعيد ${Math.max(...diag.contrast).toFixed(1)}، والمطلوبُ ٦ فأكثر) — صوِّرْ بكاميرا الجهاز، والكفُّ تملأُ الصورة، بضوءٍ قريبٍ من جانبِ اليد.`;
  }
  feats._linesDiag = diag;
  if (shown && shown.base) feats._creaseImage = drawLinePaths(shown.base, feats._linePaths || {});
}

// ── حدودُ اليد (قناعٌ بالبكسل) من نموذج Magic Touch ───────────────────
// يُعطى نقطةً في وسطِ الراحة فيُرجِعُ حدودَ اليدِ بأصابعِها؛ منها يُقاسُ شكلُ أطرافِ الأصابعِ (نوعُ اليد
// في الكتب) وعرضُ الراحةِ الحقيقيّ. الحكمُ نفسُه هندسةٌ في kaf-shape.js.
let segmenter = null, segLoading = null;
async function ensureSegmenter() {
  await ensureLoaded();
  if (segmenter) return segmenter;
  if (!IS) throw new Error("مكتبةُ الرؤيةِ لا تدعمُ تحديدَ حدودِ اليد");
  if (!segLoading) {
    segLoading = (async () => {
      const fileset = await FR.forVisionTasks(`${MP_BASE}`);
      return IS.createFromOptions(fileset, { baseOptions: { modelAssetPath: `${MP_BASE}/magic_touch.tflite` }, outputCategoryMask: false, outputConfidenceMasks: true });
    })().then((x) => (segmenter = x), (e) => { segLoading = null; throw e; });
  }
  return withTimeout(segLoading, 60000, "انتهت مهلةُ تجهيزِ نموذجِ حدودِ اليد");
}
async function segmentHand(source, px, W, H) {
  const seg = await ensureSegmenter();
  const ids = [0, 5, 9, 13, 17];
  const c = { x: ids.reduce((a, i) => a + px[i].x, 0) / ids.length / W, y: ids.reduce((a, i) => a + px[i].y, 0) / ids.length / H };
  return withTimeout(new Promise((resolve) => {
    seg.segment(source, { keypoint: { x: c.x, y: c.y } }, (r) => {
      const cm = r.confidenceMasks && r.confidenceMasks[r.confidenceMasks.length - 1];
      if (!cm) { resolve(null); return; }
      const f = cm.getAsFloat32Array(), out = new Uint8Array(f.length);
      for (let i = 0; i < f.length; i++) out[i] = f[i] > 0.5 ? 1 : 0;
      resolve({ data: out, w: cm.width, h: cm.height }); // يُنسَخُ داخلَ الاستدعاء: القناعُ لا يبقى بعده
    });
  }), 20000, "انتهت مهلةُ تحديدِ حدودِ اليد");
}
/** يقيسُ شكلَ اليدِ من القناع ويكتبُه في feats (نوعُ اليد، شكلُ الأطراف، العُقد، عرضُ الراحة). */
function shapeFromMask(mask, px, W, H) {
  const sx = mask.w / W, sy = mask.h / H;
  return measureShape(mask.data, mask.w, mask.h, px.map((p) => ({ x: p.x * sx, y: p.y * sy })));
}
function applyShape(feats, shape) {
  const ht = handTypeFrom(shape, feats._debug && feats._debug.fLen);
  feats._shape = shape;
  const merged = Object.values(shape.fingers).filter((f) => /ملتصق/.test(f.why || "")).length;
  if (merged >= 2) feats._shapeNote = "أصابعُك متلاصقةٌ في الصورة فلم يُقَسْ شكلُ أطرافِها (نوعُ اليد) — صوِّرْ والأصابعُ مفرودةٌ متباعدةٌ قليلًا.";
  feats._handTypeWhy = ht.why;
  if (ht.type) feats.handType = ht.type;
  if (shape.palmRatio) {
    feats.handHint = feats.handHint || { fits: [] };
    feats.handHint.palmShape = shape.palmRatio >= 0.98 ? "عريضةٌ تقاربُ المربّع" : shape.palmRatio < 0.8 ? "متطاولةٌ نحيلة" : "معتدلةُ العرض";
    feats.handHint.palmRatio = shape.palmRatio;
  }
  feats.handHint = feats.handHint || { fits: [] };
  feats.handHint.tips = Object.fromEntries(Object.entries(shape.fingers).map(([k, f]) => [k, f.shape]));
  const kn = Object.values(shape.fingers).map((f) => f.knot).filter((v) => v != null);
  if (kn.length >= 3 && kn.filter((k) => k >= 1.15).length >= 3) feats.fingerSet = [...new Set([...(feats.fingerSet || []), "knotty"])];
}
// صورةُ التحقّق: حدودُ اليدِ كما رآها النموذج، مرسومةً على الصورة
function maskOutline(source, mask, W, H, maxSide = 700) {
  const s = Math.min(1, maxSide / Math.max(W, H));
  const c = document.createElement("canvas"); c.width = Math.round(W * s); c.height = Math.round(H * s);
  const g = c.getContext("2d"); g.drawImage(source, 0, 0, c.width, c.height);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data;
  const at = (x, y) => { const mx = Math.min(mask.w - 1, Math.floor(x / c.width * mask.w)), my = Math.min(mask.h - 1, Math.floor(y / c.height * mask.h)); return mask.data[my * mask.w + mx]; };
  for (let y = 1; y < c.height - 1; y++) for (let x = 1; x < c.width - 1; x++) {
    const o = (y * c.width + x) * 4, v = at(x, y);
    if (!v) { d[o] *= 0.4; d[o + 1] *= 0.4; d[o + 2] *= 0.4; continue; }
    if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) { d[o] = 40; d[o + 1] = 230; d[o + 2] = 120; }
  }
  g.putImageData(id, 0, 0);
  return c.toDataURL("image/jpeg", 0.85);
}

// ── صورةُ كاميرا الجهاز (الطريقةُ الأدقّ) ───────────────────────────
// صورةُ تطبيقِ الكاميرا نفسِه: دقّةٌ كاملة، تركيزٌ تلقائيٌّ على الكفّ، ومعالجةٌ أنظف من إطارِ بثِّ
// الفيديو المضغوط. هي نفسُ نوعِ الصورِ التي ضُبِطَت عليها قراءةُ الخطوط (صورُ كفٍّ حقيقيّة).
let imgLandmarker = null, imgLoading = null;
async function ensureImageLandmarker() {
  await ensureLoaded(); // يجهّزُ مكتبةَ MediaPipe نفسَها
  if (imgLandmarker) return imgLandmarker;
  if (!imgLoading) {
    imgLoading = (async () => {
      const fileset = await FR.forVisionTasks(`${MP_BASE}`);
      return HL.createFromOptions(fileset, { baseOptions: { modelAssetPath: `${MP_BASE}/hand_landmarker.task` }, numHands: 1, runningMode: "IMAGE", minHandDetectionConfidence: 0.5 });
    })().then((l) => (imgLandmarker = l), (e) => { imgLoading = null; throw e; });
  }
  return withTimeout(imgLoading, 60000, "انتهت مهلةُ تجهيزِ نموذجِ اليدِ للصور");
}
async function loadPhoto(file, maxSide = 1600) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const sc = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); // المتصفّحُ يطبّقُ اتّجاهَ الصورة (EXIF)
    return c;
  } finally { URL.revokeObjectURL(url); }
}
/** يحلّلُ صورةً أو صورتين لكفٍّ واحدة. يُعيدُ {feats, dataUrl, problems} أو {error}. */
export async function analyzePhotos(files, onProgress = () => {}) {
  onProgress("جارٍ تجهيزُ محرّكِ الرؤية…");
  await ensureImageLandmarker();
  preloadOpenCV();
  const shots = [], problems = [];
  for (let i = 0; i < files.length; i++) {
    const tag = files.length > 1 ? ` (الصورة ${i + 1})` : "";
    onProgress(`جارٍ قراءةُ الصورة${tag}…`);
    let c; try { c = await loadPhoto(files[i]); } catch { problems.push("تعذّرَ فتحُ الصورة" + tag); continue; }
    const W = c.width, H = c.height;
    let res; try { res = imgLandmarker.detect(c); } catch (e) { problems.push("تعذّرَ تحليلُ الصورة" + tag); continue; }
    const lm = res.landmarks && res.landmarks[0];
    if (!lm) { problems.push("لم أجدْ كفًّا في الصورة" + tag + " — صوِّرْ باطنَ الكفِّ كاملًا والأصابعُ ظاهرة."); continue; }
    const px = lm.map((p) => ({ x: p.x * W, y: p.y * H }));
    if (!(px[P.MID_TIP].y < px[P.MID_MCP].y && px[P.MID_MCP].y < px[P.WRIST].y)) { problems.push("اجعلِ الأصابعَ نحوَ أعلى الصورة" + tag + "."); continue; }
    const det = detectHand(px, res.handednesses && res.handednesses[0] && res.handednesses[0][0] && res.handednesses[0][0].categoryName);
    if (det.backOfHand) { problems.push("الصورةُ" + tag + " تُظهِرُ ظهرَ الكفّ — صوِّرْ باطنَها."); continue; }
    if (d2(px[P.WRIST], px[P.MID_MCP]) / Math.max(W, H) < 0.16) { problems.push("الكفُّ صغيرةٌ في الصورة" + tag + " — قرِّبِ الهاتفَ حتى تملأَ الكفُّ معظمَ الصورة."); continue; }
    if (shots.length && shots[0].hand !== det.hand) { problems.push("الصورةُ" + tag + " ليدٍ غيرِ يدِ الصورةِ الأولى — أُهمِلَت."); continue; }
    shots.push({ c, lm, wlm: res.worldLandmarks && res.worldLandmarks[0], px, W, H, hand: det.hand });
  }
  if (!shots.length) return { error: problems.join(" · ") || "لم تصلحْ أيُّ صورةٍ للتحليل." };
  const s0 = shots[0];
  const feats = extractFeatures(s0.lm, s0.wlm, s0.W, s0.H);
  feats.hand = s0.hand;
  // حدودُ اليدِ وشكلُها
  try {
    onProgress("جارٍ تحديدُ حدودِ يدِك…");
    let merged = null;
    for (let i = 0; i < shots.length; i++) {
      const mask = await segmentHand(shots[i].c, shots[i].px, shots[i].W, shots[i].H);
      if (!mask) continue;
      if (i === 0) feats._maskImage = maskOutline(shots[0].c, mask, shots[0].W, shots[0].H);
      const sh = shapeFromMask(mask, shots[i].px, shots[i].W, shots[i].H);
      if (!merged) merged = sh;
      else for (const k of Object.keys(merged.fingers)) {
        if (merged.fingers[k].shape !== sh.fingers[k].shape) merged.fingers[k] = { ...merged.fingers[k], shape: null, why: "اختلفَ شكلُه بين الصورتين" };
      }
    }
    if (merged) applyShape(feats, merged);
  } catch (e) { feats._shapeNote = "تعذّرَ تحديدُ حدودِ اليد: " + (e.message || e); }
  // صورتان: حالةُ الإصبعِ تُثبَتُ فقط إن اتّفقت فيهما
  for (let i = 1; i < shots.length; i++) {
    const f2 = extractFeatures(shots[i].lm, shots[i].wlm, shots[i].W, shots[i].H);
    for (const k of ["index", "middle", "ring", "little"]) {
      if (feats.fingers[k] && (!f2.fingers[k] || f2.fingers[k].state !== feats.fingers[k].state)) delete feats.fingers[k];
    }
  }
  // لكلِّ صورة: المربّعُ الأصليّ + ٣ إزاحاتٍ صغيرة (خطأُ موضعِ النقاطِ نفسِه بضعةُ بكسلات) —
  // ما لا يثبتُ أمامَ إزاحةٍ بقدرِ خطأِ القياس لا يُقال.
  const JIT = [[1, 0, 0], [1.03, 0.015, 0], [0.97, -0.015, 0.015], [1, 0, -0.02]];
  const frames = [];
  for (const sh of shots) {
    const q = palmQuad(sh.px);
    const cx = q.reduce((a, p) => a + p[0], 0) / 4, cy = q.reduce((a, p) => a + p[1], 0) / 4;
    const qw = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
    for (const [sc, dx, dy] of JIT) {
      const img = sh.c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, sh.W, sh.H);
      frames.push({ img, quad: q.map(([x, y]) => [cx + (x - cx) * sc + dx * qw, cy + (y - cy) * sc + dy * qw]) });
    }
  }
  await linesFromFrames(frames, feats, (k, n) => onProgress(`جارٍ تحليلُ خطوطِ كفّك (${k + 1} من ${n})…`));
  const prev = document.createElement("canvas");
  const ps = Math.min(1, 900 / Math.max(s0.W, s0.H));
  prev.width = Math.round(s0.W * ps); prev.height = Math.round(s0.H * ps);
  prev.getContext("2d").drawImage(s0.c, 0, 0, prev.width, prev.height);
  return { feats, dataUrl: prev.toDataURL("image/jpeg", 0.85), problems };
}

// نقاطُ MediaPipe الـ٢١
const P = { WRIST: 0, THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  IDX_MCP: 5, IDX_PIP: 6, IDX_DIP: 7, IDX_TIP: 8, MID_MCP: 9, MID_PIP: 10, MID_DIP: 11, MID_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16, PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20 };
// ── دليلُ اليدِ المرسوم ─────────────────────────────────────────────────
// قالبُ كفٍّ يمنى باطنُها نحو الكاميرا، أصابعُها مفرودةٌ للأعلى والإبهامُ منفرج — نقاطُه وحدودُه مأخوذةٌ
// من صورةِ كفٍّ حقيقيّة (حدودُها بنموذجِ تحديدِ اليد، ثمّ تنعيمٌ خفيف)، بإحداثيّاتِ «صندوقِ اليد» (٠..١).
// الكاميرا «ترى» الباطن ⇒ إبهامُ اليمنى على يمينِ الصورة (واليسرى انعكاسُها). كلُّ الحسابِ
// بإحداثيّاتِ الصورةِ نفسِها؛ العكسُ (المرآة) للعرضِ فقط.
const TPL_RIGHT = [
  [0.4253, 0.8948], [0.6278, 0.788], [0.7665, 0.6424], [0.8539, 0.525], [0.9496, 0.443],   // الرسغ، الإبهام
  [0.5192, 0.4222], [0.5358, 0.2586], [0.5418, 0.1657], [0.5433, 0.0806],   // السبّابة
  [0.379, 0.4201], [0.3575, 0.2341], [0.3416, 0.123], [0.3281, 0.037],   // الوسطى
  [0.2597, 0.4579], [0.2192, 0.2883], [0.2045, 0.1896], [0.1917, 0.1076],   // البنصر
  [0.1464, 0.5227], [0.0888, 0.3914], [0.0636, 0.309], [0.0375, 0.2309],   // الخنصر
];
// حدودُ اليدِ نفسِها (مفتوحةٌ عند الرسغ) — تُرسَمُ دليلًا بدلَ هيكلِ الخطوط
const TPL_OUTLINE = [[0.6773,0.9787],[0.6794,0.9674],[0.675,0.9538],[0.6702,0.9402],[0.6661,0.9266],[0.6625,0.9129],[0.6597,0.8993],[0.6584,0.8857],[0.6603,0.872],[0.6676,0.8588],[0.6799,0.847],[0.693,0.8362],[0.7051,0.8241],[0.7167,0.8111],[0.7285,0.7981],[0.7403,0.7859],[0.7527,0.7735],[0.7662,0.7606],[0.7789,0.7474],[0.7912,0.7341],[0.8039,0.7214],[0.816,0.7085],[0.827,0.6949],[0.8371,0.6813],[0.8454,0.6676],[0.8522,0.654],[0.858,0.6404],[0.8641,0.6268],[0.8707,0.6131],[0.8778,0.5995],[0.8856,0.5859],[0.8949,0.5722],[0.9052,0.5586],[0.9155,0.545],[0.9254,0.5314],[0.9362,0.5177],[0.9481,0.5041],[0.9605,0.4907],[0.9747,0.4784],[0.9895,0.4669],[0.9997,0.4549],[1.0,0.4419],[0.9907,0.4295],[0.9761,0.4211],[0.959,0.4168],[0.9417,0.4154],[0.9244,0.4164],[0.9071,0.4194],[0.8903,0.4235],[0.8736,0.4292],[0.8573,0.437],[0.8416,0.4461],[0.8257,0.4558],[0.8116,0.4669],[0.7987,0.4785],[0.7862,0.4908],[0.7746,0.5041],[0.7641,0.5177],[0.755,0.5314],[0.7452,0.5449],[0.7321,0.5568],[0.7161,0.5655],[0.6991,0.5671],[0.6831,0.5593],[0.6699,0.546],[0.6588,0.5323],[0.6479,0.5187],[0.6377,0.5051],[0.6282,0.4915],[0.6197,0.4778],[0.6116,0.4642],[0.6035,0.4506],[0.5974,0.437],[0.5938,0.4233],[0.5911,0.4097],[0.5895,0.3961],[0.589,0.3824],[0.5898,0.3688],[0.5913,0.3552],[0.5934,0.3416],[0.5951,0.3279],[0.5966,0.3143],[0.5985,0.3007],[0.5994,0.2871],[0.5991,0.2734],[0.5992,0.2598],[0.6002,0.2462],[0.6002,0.2325],[0.6002,0.2189],[0.6002,0.2053],[0.6,0.1917],[0.5989,0.178],[0.5977,0.1644],[0.5968,0.1508],[0.5957,0.1372],[0.5942,0.1235],[0.5928,0.1099],[0.5911,0.0963],[0.5872,0.0826],[0.58,0.0692],[0.5678,0.0575],[0.5519,0.0504],[0.5346,0.0497],[0.5184,0.0549],[0.5065,0.0653],[0.5002,0.0787],[0.4967,0.0924],[0.4946,0.106],[0.4932,0.1196],[0.4925,0.1333],[0.4923,0.1469],[0.4909,0.1605],[0.488,0.1741],[0.485,0.1878],[0.4826,0.2014],[0.4805,0.215],[0.4788,0.2286],[0.4769,0.2423],[0.4742,0.2559],[0.4711,0.2695],[0.4681,0.2832],[0.4656,0.2968],[0.4639,0.3104],[0.4623,0.324],[0.4603,0.3376],[0.4527,0.3486],[0.4408,0.3499],[0.4338,0.3405],[0.4331,0.327],[0.4326,0.3133],[0.4315,0.2997],[0.4304,0.2861],[0.4293,0.2725],[0.4279,0.2588],[0.4268,0.2452],[0.4248,0.2316],[0.4232,0.2179],[0.4212,0.2043],[0.4192,0.1907],[0.4172,0.1771],[0.4146,0.1634],[0.4117,0.1498],[0.4087,0.1362],[0.4056,0.1226],[0.4022,0.1089],[0.3989,0.0953],[0.3953,0.0817],[0.3916,0.068],[0.3881,0.0544],[0.3845,0.0408],[0.3788,0.0272],[0.3687,0.0141],[0.3538,0.0043],[0.3366,0.0],[0.3193,0.0014],[0.3034,0.0082],[0.2926,0.0196],[0.2888,0.033],[0.2881,0.0466],[0.2881,0.0603],[0.2882,0.0739],[0.289,0.0875],[0.2905,0.1011],[0.2923,0.1148],[0.2933,0.1284],[0.2933,0.142],[0.2933,0.1556],[0.2933,0.1693],[0.2933,0.1829],[0.2934,0.1965],[0.2941,0.2102],[0.2955,0.2238],[0.2967,0.2374],[0.2982,0.251],[0.2993,0.2647],[0.3001,0.2783],[0.3013,0.2919],[0.303,0.3055],[0.305,0.3192],[0.3067,0.3328],[0.3082,0.3464],[0.3078,0.3588],[0.3036,0.361],[0.2985,0.3513],[0.2957,0.3377],[0.2925,0.324],[0.289,0.3104],[0.2851,0.2968],[0.281,0.2832],[0.2777,0.2695],[0.2744,0.2559],[0.2713,0.2423],[0.2678,0.2286],[0.2645,0.215],[0.2615,0.2014],[0.2589,0.1878],[0.2567,0.1741],[0.255,0.1605],[0.2532,0.1469],[0.251,0.1333],[0.2494,0.1196],[0.2476,0.106],[0.2432,0.0924],[0.2337,0.0809],[0.2188,0.0738],[0.2017,0.072],[0.1849,0.0757],[0.1707,0.0844],[0.1618,0.0964],[0.1575,0.1099],[0.1561,0.1235],[0.1548,0.1372],[0.1536,0.1508],[0.1534,0.1644],[0.1534,0.178],[0.1534,0.1917],[0.1534,0.2053],[0.1534,0.2189],[0.1534,0.2325],[0.1539,0.2462],[0.1554,0.2598],[0.1576,0.2734],[0.1601,0.2871],[0.1626,0.3007],[0.1651,0.3143],[0.1681,0.3279],[0.1716,0.3416],[0.1758,0.3552],[0.18,0.3688],[0.1839,0.3824],[0.1877,0.3961],[0.1912,0.4097],[0.1908,0.4233],[0.1828,0.434],[0.1723,0.4331],[0.1642,0.4214],[0.1573,0.4077],[0.1508,0.3941],[0.1444,0.3805],[0.1378,0.3669],[0.1313,0.3532],[0.1248,0.3396],[0.1185,0.326],[0.1132,0.3124],[0.1089,0.2987],[0.1047,0.2851],[0.1,0.2715],[0.095,0.2578],[0.0903,0.2442],[0.0852,0.2306],[0.0774,0.2172],[0.0647,0.2066],[0.0483,0.2018],[0.0314,0.2034],[0.0161,0.2115],[0.0055,0.2238],[0.001,0.2374],[0.0,0.251],[0.0,0.2647],[0.0009,0.2783],[0.0027,0.2919],[0.0057,0.3055],[0.0092,0.3192],[0.0124,0.3328],[0.015,0.3464],[0.0184,0.3601],[0.0228,0.3737],[0.0277,0.3873],[0.0323,0.4009],[0.0368,0.4146],[0.0412,0.4282],[0.0456,0.4418],[0.0501,0.4554],[0.0545,0.4691],[0.0589,0.4827],[0.0631,0.4963],[0.0672,0.51],[0.0704,0.5236],[0.0719,0.5372],[0.073,0.5508],[0.0744,0.5645],[0.0761,0.5781],[0.0787,0.5917],[0.0817,0.6053],[0.0854,0.619],[0.0893,0.6326],[0.0929,0.6462],[0.0968,0.6599],[0.1011,0.6735],[0.1055,0.6871],[0.1104,0.7007],[0.1156,0.7144],[0.121,0.728],[0.1269,0.7416],[0.1336,0.7552],[0.1408,0.7689],[0.1483,0.7825],[0.1565,0.7961],[0.1651,0.8098],[0.1745,0.8234],[0.1843,0.837],[0.1939,0.8506],[0.2027,0.8643],[0.2102,0.8779],[0.2169,0.8915],[0.2231,0.9051],[0.2285,0.9188],[0.2329,0.9324],[0.236,0.946],[0.2381,0.9597],[0.2395,0.9733],[0.2408,0.9869],[0.2425,1.0]];
const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const PALM = [0, 1, 5, 9, 13, 17];
const KEY = [0, 4, 5, 8, 9, 12, 13, 16, 17, 20];
const BOX_ASPECT = 0.7866; // عرضُ صندوقِ اليد ÷ ارتفاعِه

/** موضعُ القالبِ بالبكسل داخلَ إطارٍ W×H: وسطَ الإطار، بأكبرِ حجمٍ يتّسعُ له طولًا وعرضًا. */
export function templatePx(hand, W, H) {
  const boxH = Math.min(0.82 * H, (0.9 * W) / BOX_ASPECT);
  const boxW = boxH * BOX_ASPECT;
  const left = (W - boxW) / 2, top = (H - boxH) / 2;
  const map = ([x, y]) => ({ x: left + (hand === "left" ? 1 - x : x) * boxW, y: top + y * boxH });
  return { pts: TPL_RIGHT.map(map), boxH, outline: TPL_OUTLINE.map(map) };
}

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mean = (arr) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);

/** يُقيِّمُ مطابقةَ اليدِ المرصودةِ (بكسل) للقالب، ويُعيدُ أولى رسائلِ التوجيهِ اللازمة.
 *  dirSign: ‎+1 إن كان العرضُ غيرَ معكوس، ‎-1 إن كان معكوسًا (لتصحيحِ «يمين/يسار» على الشاشة). */
export function assessFit(px, tpl, hand, dirSign = 1) {
  const { pts: T, boxH } = tpl;
  const handAr = hand === "left" ? "اليسرى" : "اليمنى";
  // ١) الأصابعُ للأعلى
  if (!(px[P.MID_TIP].y < px[P.MID_MCP].y && px[P.MID_MCP].y < px[P.WRIST].y)) {
    return { ok: false, msg: "وجّهْ أصابعَك نحوَ الأعلى كما في الرسمة" };
  }
  // ٢) الباطنُ نحو الكاميرا، واليدُ المختارة (الإبهامُ في جهتِه من الرسمة)
  const thumbSide = Math.sign(px[P.THUMB_TIP].x - px[P.PINKY_MCP].x);
  const wantSide = Math.sign(T[P.THUMB_TIP].x - T[P.PINKY_MCP].x);
  if (thumbSide !== wantSide) {
    return { ok: false, msg: `أرِ الكاميرا باطنَ كفّك ${handAr} (لا ظهرَها)` };
  }
  // ٣) الحجم
  const s = d2(px[P.WRIST], px[P.MID_TIP]) / (d2(T[P.WRIST], T[P.MID_TIP]) || 1);
  if (s < 0.82) return { ok: false, msg: "قرِّبْ يدك من الكاميرا حتى تملأَ الرسمة" };
  if (s > 1.2) return { ok: false, msg: "أبعِدْ يدك قليلًا عن الكاميرا" };
  // ٤) الموضع
  const cD = { x: mean(KEY.map((i) => px[i].x)), y: mean(KEY.map((i) => px[i].y)) };
  const cT = { x: mean(KEY.map((i) => T[i].x)), y: mean(KEY.map((i) => T[i].y)) };
  const dx = (cD.x - cT.x) / boxH * dirSign, dy = (cD.y - cT.y) / boxH;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 0.1) {
    if (Math.abs(dx) >= Math.abs(dy)) return { ok: false, msg: dx > 0 ? "حرِّكْ يدك قليلًا إلى اليسار" : "حرِّكْ يدك قليلًا إلى اليمين" };
    return { ok: false, msg: dy > 0 ? "ارفعْ يدك قليلًا إلى الأعلى" : "أنزِلْ يدك قليلًا إلى الأسفل" };
  }
  // ٥) الشكلُ نفسُه (فردُ الأصابعِ كالرسمة)
  const err = mean(KEY.map((i) => d2(px[i], T[i]))) / boxH;
  if (err > 0.16) return { ok: false, msg: "طابِقْ أصابعَك وإبهامَك على الرسمة", err };
  return { ok: true, msg: "ممتاز — أبقِ يدك ثابتة", err };
}

function drawOverlay(canvas, video, tpl, px, ok, mirrored) {
  if (!canvas) return;
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (!cw || !ch) return;
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
  }
  const g = canvas.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);
  const W = video.videoWidth || 1, H = video.videoHeight || 1;
  const map = (p) => ({ x: (mirrored ? W - p.x : p.x) / W * cw, y: p.y / H * ch });
  const T = tpl.pts.map(map);
  const unit = tpl.boxH / H * ch;
  // القالب: حدودُ يدٍ حقيقيّة — تعبئةٌ خفيفةٌ وخطٌّ واضح (متقطّعٌ أبيض، ثمّ أخضرُ متّصلٌ عند المطابقة)
  const O = (tpl.outline || []).map(map);
  if (O.length > 2) {
    g.save();
    g.beginPath(); O.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath();
    g.fillStyle = ok ? "rgba(61,220,106,.22)" : "rgba(255,255,255,.12)"; g.fill();
    g.beginPath(); O.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
    g.lineJoin = "round"; g.lineCap = "round";
    g.shadowColor = "rgba(0,0,0,.55)"; g.shadowBlur = 4;
    g.strokeStyle = ok ? "#3ddc6a" : "rgba(255,255,255,.95)"; g.lineWidth = Math.max(2.5, unit * 0.008);
    g.setLineDash(ok ? [] : [10, 7]); g.stroke(); g.setLineDash([]);
    g.restore();
  }
  // ما تراه الكاميرا من يدِك الآن
  if (px) {
    const D = px.map(map);
    // نقاطٌ صغيرةٌ فقط (لا خطوطٌ متقاطعة): أطرافُ الأصابعِ ومفاصلُها كما تراها الكاميرا الآن
    g.fillStyle = ok ? "#3ddc6a" : "#00c8ff";
    g.strokeStyle = "rgba(0,0,0,.45)"; g.lineWidth = 1;
    D.forEach((p) => { g.beginPath(); g.arc(p.x, p.y, 3.2, 0, Math.PI * 2); g.fill(); g.stroke(); });
  }
}

// مربّعُ الراحة للخطوط (متوازي أضلاعٍ من مفاصلِ الأصابعِ حتى مستوى الرسغ، بعرضِ الكفِّ كاملًا).
// الزاويةُ الأولى جهةُ السبّابة/الإبهام ⇒ في الصورةِ المقوَّمة يكونُ الإبهامُ يسارًا دائمًا، لأيِّ يد.
export function palmQuad(px) {
  const I = px[P.IDX_MCP], K = px[P.PINKY_MCP], Wr = px[P.WRIST], M = px[P.MID_MCP];
  const ax = { x: K.x - I.x, y: K.y - I.y }, dn = { x: Wr.x - M.x, y: Wr.y - M.y };
  const TL = { x: I.x - ax.x * 0.12, y: I.y - ax.y * 0.12 };
  const TR = { x: K.x + ax.x * 0.12, y: K.y + ax.y * 0.12 };
  const k = 0.92; // حتى ما قبلَ الرسغِ بقليل: نقطةُ الرسغِ في مركزِه، وما بعدَها خارجَ الراحة
  return [TL, TR, { x: TR.x + dn.x * k, y: TR.y + dn.y * k }, { x: TL.x + dn.x * k, y: TL.y + dn.y * k }].map((p) => [p.x, p.y]);
}

/** حلقةٌ حيّة: ترسمُ دليلَ اليدِ ونقاطَ اليدِ المرصودة، توجّهُ حتى تنطبقَ اليدُ على الدليل،
 *  ثمّ تلتقطُ وحدَها بعد ثباتٍ قصير. تُعيدُ {stop, capture}؛ capture() التقاطٌ يدويٌّ احتياطيّ. */
// اليدُ تُعرَفُ آليًّا: في إطارِ الكاميرا الخامِ (غيرِ المعكوس) والباطنُ نحوَها والأصابعُ للأعلى، إبهامُ
// اليمنى على يمينِ الصورة وإبهامُ اليسرى على يسارِها (تحقّقنا على ٤ صورٍ حقيقيّة: يدان × صورتان).
// تصنيفُ MediaPipe نفسُه (Left/Right) يطابقُ ذلك للباطن؛ فإن خالفه فالأرجحُ أنّ الظاهرَ ظهرُ الكفّ.
export function detectHand(px, mpLabel) {
  const geom = px[P.THUMB_TIP].x > px[P.PINKY_MCP].x ? "right" : "left";
  const mp = (mpLabel || "").toLowerCase();
  const backOfHand = (mp === "left" || mp === "right") && mp !== geom;
  return { hand: geom, backOfHand };
}

export function runLiveCapture({ video, overlay, mirrored = false, getHand = () => null, onGuide, onShot }) {
  let raf = 0, stableFrames = 0, stopped = false, aborted = false;
  let lastPx = null, lastLm = null, lastWlm = null, lastLmAt = 0;
  let handVotes = [], curHand = "right", backVotes = [];
  // نقاطُ اليدِ في إطاراتِ الثباتِ المتتالية: تُؤخَذُ متوسّطَها عند الالتقاط، فلا يقلبُ اهتزازُ
  // إطارٍ واحدٍ حكمًا على حدٍّ فاصل (طولُ إصبعٍ مقابلَ آخر).
  let stableBuf = [];
  const avgPts = (list) => list[0].map((_, j) => ({
    x: mean(list.map((l) => l[j].x)), y: mean(list.map((l) => l[j].y)), z: mean(list.map((l) => l[j].z || 0)),
  }));
  const NEED_STABLE = 8;      // ≈ نصفُ ثانيةٍ على ~١٥ تحليلًا بالثانية
  const MIN_GAP_MS = 66;      // لا أكثرَ من ~١٥ تحليلًا بالثانية، ولا يُعادُ التحليلُ على نفسِ الإطار
  let lastVideoTime = -1, lastRun = 0, failStreak = 0;

  // الالتقاط: عدّةُ لقطاتٍ متتالية (≈ ثانية)، تُحلَّلُ خطوطُ كلٍّ منها، ولا يُثبَتُ من الخطوطِ إلّا ما
  // اتّفقت عليه أغلبُها — اللقطةُ الواحدةُ قد تُطيلُ خطًّا أو تقطعُه بفعلِ ظلٍّ أو اهتزاز (جُرِّب على
  // صورتين لليدِ نفسِها: طولُ خطِّ القلبِ ٠٫٨٩ في إحداهما و٠٫٤٦ في الأخرى قبل الإجماع).
  const SHOTS = 4, SHOT_GAP_MS = 140;
  const doShot = async (lm, wlm, hand) => {
    stopped = true; cancelAnimationFrame(raf);
    const W = video.videoWidth, H = video.videoHeight;
    const dataUrl = grab(video);                    // الإطارُ يُثبَّتُ لحظةَ الالتقاط
    let feats;
    if (!lm) {
      feats = baseFeatures();
      feats._err = "لم تُرصَدْ يدٌ في هذه اللحظة — التُقِطت الصورةُ بلا تحليلٍ آليّ، أكمِلِ الوضعَ اليدويّ.";
    } else {
      try { feats = extractFeatures(lm, wlm, W, H); }
      catch (e) { feats = baseFeatures(); feats._err = String(e && e.message || e); }
      feats.hand = hand || null;
      if (!feats._err) {
        try {
          const fc = document.createElement("canvas"); fc.width = W; fc.height = H; fc.getContext("2d").drawImage(video, 0, 0);
          const lpx = lm.map((p) => ({ x: p.x * W, y: p.y * H }));
          onGuide(["تمّ الالتقاط — جارٍ تحديدُ حدودِ يدِك…"], true);
          const mask = await segmentHand(fc, lpx, W, H);
          if (mask) { feats._maskImage = maskOutline(fc, mask, W, H); applyShape(feats, shapeFromMask(mask, lpx, W, H)); }
        } catch (e) { feats._shapeNote = "تعذّرَ تحديدُ حدودِ اليد: " + (e.message || e); }
        const frames = [];
        for (let k = 0; k < SHOTS && !aborted; k++) {
          if (k) await new Promise((r) => setTimeout(r, SHOT_GAP_MS));
          let flm = lm;
          if (k) { try { const rr = landmarker.detectForVideo(video, performance.now()); flm = rr && rr.landmarks && rr.landmarks[0]; } catch { flm = null; } }
          if (!flm) continue;
          const img = frameImageData(video);
          if (img) frames.push({ img, quad: palmQuad(flm.map((p) => ({ x: p.x * W, y: p.y * H }))) });
        }
        await linesFromFrames(frames, feats, (k, n) => onGuide([`تمّ الالتقاط — جارٍ تحليلُ خطوطِ كفّك (${k + 1} من ${n})…`], true), () => aborted);
      }
    }
    if (aborted) return; // أُوقِفَ أو غادرَ المستخدمُ أثناءَ التحليل
    onShot(feats, dataUrl, lm);
  };

  async function tick() {
    if (stopped) return;
    const now = performance.now();
    if (video.readyState < 2 || video.currentTime === lastVideoTime || now - lastRun < MIN_GAP_MS) {
      raf = requestAnimationFrame(tick); return;
    }
    lastVideoTime = video.currentTime; lastRun = now;
    const W = video.videoWidth, H = video.videoHeight;
    const forced = getHand();
    const hand = forced === "left" || forced === "right" ? forced : curHand;
    let tpl = templatePx(hand, W, H);
    let res, threw = false;
    try { res = landmarker.detectForVideo(video, now); } catch { res = null; threw = true; }
    failStreak = threw ? failStreak + 1 : 0;
    const lm = res && res.landmarks && res.landmarks[0];
    const wlm = res && res.worldLandmarks && res.worldLandmarks[0];
    let msg, ok = false, px = null;
    if (failStreak >= 15) {
      // التحليلُ نفسُه يفشلُ مرارًا (ليس غيابَ يد) — لا نوهمُ المستخدمَ بأنّه «لا يرى يده»
      msg = "تعذّرَ تحليلُ صورةِ الكاميرا على هذا الجهاز — اضغطْ «التقطِ الآن» أو استعملِ الوضعَ اليدويّ";
    } else if (!lm) {
      msg = "ضعْ كفّك أمامَ الكاميرا — الباطنُ نحوَها والأصابعُ للأعلى — وطابِقْها على الرسمة";
    } else {
      px = lm.map((p) => ({ x: p.x * W, y: p.y * H }));
      // اليدُ آليًّا: تصويتٌ على آخرِ ٧ إطاراتٍ كي لا يتأرجحَ القالبُ بين اليدين
      const det = detectHand(px, res.handednesses && res.handednesses[0] && res.handednesses[0][0] && res.handednesses[0][0].categoryName);
      handVotes.push(det.hand); if (handVotes.length > 7) handVotes.shift();
      backVotes.push(det.backOfHand); if (backVotes.length > 7) backVotes.shift();
      const rightN = handVotes.filter((h) => h === "right").length;
      if (!(forced === "left" || forced === "right")) {
        const next = rightN * 2 > handVotes.length ? "right" : "left";
        if (next !== curHand) { curHand = next; tpl = templatePx(curHand, W, H); }
      }
      const handNow = forced === "left" || forced === "right" ? forced : curHand;
      const fit = backVotes.filter(Boolean).length >= 5
        ? { ok: false, msg: "أرِ الكاميرا باطنَ كفّك (لا ظهرَها)" }
        : assessFit(px, tpl, handNow, mirrored ? -1 : 1);
      msg = fit.msg; ok = fit.ok;
      if (ok && lastPx) {
        const mv = mean(KEY.map((i) => d2(px[i], lastPx[i]))) / tpl.boxH;
        if (mv > 0.025) { ok = false; msg = "ثبِّتْ يدك لحظة…"; }
      }
      if (ok) {
        const c = px[P.MID_MCP];
        const bright = sampleBrightness(video, c.x / W, c.y / H);
        if (bright != null && bright < 40) { ok = false; msg = "الإضاءةُ ضعيفة — اقتربْ من نور"; }
      }
      lastPx = px; lastLm = lm; lastWlm = wlm; lastLmAt = now;
    }
    drawOverlay(overlay, video, tpl, px, ok, mirrored);
    if (ok) {
      stableFrames++;
      stableBuf.push({ lm, wlm });
      if (stableFrames >= NEED_STABLE) {
        const wl = stableBuf.map((s) => s.wlm).filter((w) => w && w.length === 21);
        doShot(avgPts(stableBuf.map((s) => s.lm)), wl.length === stableBuf.length ? avgPts(wl) : null, forced === "left" || forced === "right" ? forced : curHand);
        return;
      }
      msg = `ممتاز — أبقِ يدك ثابتة… ${"●".repeat(stableFrames)}${"○".repeat(NEED_STABLE - stableFrames)}`;
    } else { stableFrames = 0; stableBuf = []; }
    onGuide([msg], ok);
    raf = requestAnimationFrame(tick);
  }
  // يُرسَمُ الدليلُ فورَ ظهورِ الفيديو، قبلَ أوّلِ تحليل
  if (video.videoWidth) drawOverlay(overlay, video, templatePx(getHand() === "left" ? "left" : "right", video.videoWidth, video.videoHeight), null, false, mirrored);
  const handNowFor = () => { const f = getHand(); return f === "left" || f === "right" ? f : curHand; };
  raf = requestAnimationFrame(tick);
  return {
    stop: () => { stopped = true; aborted = true; cancelAnimationFrame(raf); },
    // نقاطُ اليدِ تُستعمَلُ فقط إن رُصِدت في آخرِ نصفِ ثانية — وإلّا فالصورةُ الحاليّةُ لا تطابقُها
    // وتحليلُها بنقاطٍ قديمةٍ قراءةٌ مُلفَّقة؛ فتُلتقَطُ الصورةُ بلا تحليلٍ آليٍّ ويُصرَّحُ بذلك.
    capture: () => {
      if (stopped) return;
      const fresh = performance.now() - lastLmAt < 500;
      doShot(fresh ? lastLm : null, fresh ? lastWlm : null, handNowFor());
    },
  };
}

function grab(video) {
  const c = document.createElement("canvas");
  c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext("2d").drawImage(video, 0, 0);
  return c.toDataURL("image/jpeg", 0.85);
}
let _sc = null;
function sampleBrightness(video, nx, ny) {
  try {
    if (!_sc) _sc = document.createElement("canvas");
    _sc.width = 40; _sc.height = 40;
    const g = _sc.getContext("2d", { willReadFrequently: true });
    g.drawImage(video, nx * video.videoWidth - 20, ny * video.videoHeight - 20, 40, 40, 0, 0, 40, 40);
    const d = g.getImageData(0, 0, 40, 40).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += (d[i] + d[i + 1] + d[i + 2]) / 3;
    return s / (d.length / 4);
  } catch { return null; }
}

function baseFeatures() {
  const none = () => ({ present: false, confidence: 0, states: [] });
  return {
    hand: null, handType: null, texture: null, palmSurface: null,
    fingers: {}, fingerSet: [], thumb: {}, nails: [], mounts: {},
    lines: { life: none(), head: none(), heart: none(), fate: none(), sun: none(), health: none() },
    marks: [], secondary: { venusGirdle: false, marriageCount: null, rascettes: null, quadrangle: null }, triangle: null,
  };
}

// ── الملامحُ الهندسيّةُ من ٢١ نقطة ────────────────────────────────
// تُقاسُ النِّسَبُ على إحداثيّاتِ MediaPipe العالميّة (ثلاثيّةِ الأبعاد بالأمتار): لا تتأثّرُ بشكلِ
// إطارِ الكاميرا (عريض/طويل) ولا ببُعدِ اليد. (كانت تُقاسُ على إحداثيّاتٍ مُطبَّعةٍ بعرضِ الإطارِ
// وطولِه معًا — فيَمُطُّ الإطارُ العريضُ اليدَ عرضًا والطويلُ طولًا، ويتبدّلُ «نوعُ اليد» بتبدّلِ الجهاز.)
// إن غابت الإحداثيّاتُ العالميّة تُستعمَلُ إحداثيّاتُ الصورةِ بعد تحويلِها إلى بكسلاتٍ حقيقيّة.
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
function ang3(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
  const n = Math.hypot(v1.x, v1.y, v1.z) * Math.hypot(v2.x, v2.y, v2.z) || 1;
  return Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y + v1.z * v2.z) / n))) * 180 / Math.PI;
}
const pathLen = (pts, ids) => ids.slice(1).reduce((s, id, i) => s + d3(pts[ids[i]], pts[id]), 0);

export function extractFeatures(lm, wlm, W = 1, H = 1) {
  const f = baseFeatures();
  const pts = (wlm && wlm.length === 21) ? wlm : lm.map((p) => ({ x: p.x * W, y: p.y * H, z: (p.z || 0) * W }));
  const palmLen = d3(pts[P.WRIST], pts[P.MID_MCP]) || 1;
  // عرضُ الراحةِ الفعليّ أعرضُ من المسافةِ بين مركزَيْ مفصلَيِ السبّابةِ والخنصر بنحوِ إصبع (حافّتا الكفّ)
  const palmWid = d3(pts[P.IDX_MCP], pts[P.PINKY_MCP]) * 1.25;
  const ratio = palmWid / palmLen;
  // طولُ الإصبعِ مسارًا عبرَ مفاصلِه (لا خطًّا مستقيمًا) فلا يُنقِصُه انثناءٌ خفيف
  const L = {
    index: pathLen(pts, [P.IDX_MCP, P.IDX_PIP, P.IDX_DIP, P.IDX_TIP]),
    middle: pathLen(pts, [P.MID_MCP, P.MID_PIP, P.MID_DIP, P.MID_TIP]),
    ring: pathLen(pts, [P.RING_MCP, P.RING_PIP, P.RING_DIP, P.RING_TIP]),
    little: pathLen(pts, [P.PINKY_MCP, P.PINKY_PIP, P.PINKY_DIP, P.PINKY_TIP]),
  };
  const fLen = Object.fromEntries(Object.entries(L).map(([k, v]) => [k, v / palmLen]));
  // نوعُ اليد: الكتبُ تميّزُه بشكلِ أطرافِ الأصابع (مربّعة/مخروطيّة/مدبّبة/مفلطحة) وعُقَدِ المفاصل
  // وغلظِ الراحةِ وطراوتِها — ولا شيءَ من ذلك تقيسُه نقاطُ اليد. فلا تحكمُ الكاميرا بالنوع (كانت
  // تشتقُّه من نسبةٍ واحدةٍ فتصِمُ اليدَ «بدائيّةً: عنفٌ وبطءُ فهم» لفرقِ ٠٫٠١)، بل تصفُ ما تقيسُه
  // من نِسَب، وتذكرُ ما يتّسقُ معها من الأنواع، ويختارُ المستخدمُ النوعَ من أطرافِ أصابعِه.
  const palmShape = ratio >= 0.92 ? "عريضةٌ تقاربُ المربّع" : ratio < 0.75 ? "متطاولةٌ نحيلة" : "معتدلةُ العرض";
  const fingerLen = fLen.middle > 1.0 ? "طويلةٌ نسبةً إلى الراحة" : fLen.middle < 0.8 ? "قصيرةٌ نسبةً إلى الراحة" : "معتدلةُ الطول";
  const fits = [];
  if (ratio >= 0.9) fits.push("square", "spatulate");
  if (fLen.middle < 0.8) fits.push("primitive");
  if (ratio < 0.75 && fLen.middle > 1.0) fits.push("psychic");
  f.handHint = { palmShape, fingerLen, fits };
  f.handType = null;

  // دقّةُ أطوالِ الأصابعِ من نقاطِ اليدِ نحوُ ±٥٪ (قِيسَت الكفُّ الحقيقيّةُ نفسُها مرّتين بحجمين:
  // نسبةُ البنصرِ إلى السبّابة ١٫٠٦ ثمّ نحوُ ١٫٠٠). فلا يُحكَمُ إلّا حين يتجاوزُ الفرقُ هذا الخطأَ
  // بوضوح، ويُسكَتُ عمّا دونه — لا «مساويةٌ للبنصر» على فرقِ ٢٪ كما كان.
  // السبّابة: الطولُ فقط — شكلُ القمّةِ (عريضةٌ/مدبّبة) لا يُقاس، فلا يُدّعى.
  const iM = L.index / L.middle;
  const indexState = iM > 0.95 ? "طويلةٌ (تقاربُ الوسطى أو تتجاوزُ منتصفَ سلاماها الطرفيّة)"
    : iM < 0.78 ? "قصيرةٌ (لا تبلغُ مفصلَ السلامى الطرفيّةِ للوسطى)" : null;
  if (indexState) f.fingers.index = { state: indexState };

  // «مقوَّسةٌ منحنية» في الكتبِ = إصبعٌ معوجٌّ يميلُ إلى جانب، لا الانثناءُ الطبيعيُّ نحوَ الراحة
  // (كان يُقاسُ بزاويةِ المفصلِ ثلاثيّةِ الأبعاد، فتُوسَمُ كلُّ يدٍ مرتخيةٍ قليلًا «مقوّسة: استسلامٌ وعجز»).
  // يُقاسُ هنا الميلُ الجانبيُّ في مستوى الصورة: بُعدُ مفصلَيِ الإصبعِ عن الخطِّ الواصلِ بين قاعدتِه وطرفِه.
  const lateral = (a, b, c, d) => {
    const A = { x: lm[a].x * W, y: lm[a].y * H }, D = { x: lm[d].x * W, y: lm[d].y * H };
    const len = Math.hypot(D.x - A.x, D.y - A.y) || 1;
    const off = (i) => Math.abs((D.x - A.x) * (A.y - lm[i].y * H) - (A.x - lm[i].x * W) * (D.y - A.y)) / len;
    return Math.max(off(b), off(c)) / len;
  };
  const midCrook = lateral(P.MID_MCP, P.MID_PIP, P.MID_DIP, P.MID_TIP);
  f.fingers.middle = { state: fLen.middle > 1.08 ? "طويلةٌ جدًّا (أطولُ من المعتادِ بوضوح)"
    : midCrook > 0.1 ? "مقوَّسةٌ منحنية"
    : fLen.middle < 0.82 ? "قصيرةٌ (أقصرُ بوضوح)"
    : midCrook < 0.05 ? "معتدلةُ الطولِ مستقيمة" : null };
  if (!f.fingers.middle.state) delete f.fingers.middle;

  const rI = L.ring / L.index;
  const ringState = rI >= 1.04 ? "مساويةٌ للسبّابة أو أطول" : rI < 0.9 ? "أقصرُ من السبّابة" : null;
  if (ringState) f.fingers.ring = { state: ringState };

  // الخنصر: هل يبلغُ مفصلَ السلامى الطرفيّةِ للبنصر لو ضُمّت الأصابعُ مستقيمة؟ يُقارَنُ بالإسقاطِ
  // على محورِ اليد (الرسغ ⇐ مفصلِ الوسطى): قاعدةُ الخنصر + طولُه مقابلَ قاعدةِ البنصر + طولِه حتى مفصلِه.
  const ax = { x: pts[P.MID_MCP].x - pts[P.WRIST].x, y: pts[P.MID_MCP].y - pts[P.WRIST].y, z: (pts[P.MID_MCP].z || 0) - (pts[P.WRIST].z || 0) };
  const axN = Math.hypot(ax.x, ax.y, ax.z) || 1;
  const proj = (p) => ((p.x - pts[P.WRIST].x) * ax.x + (p.y - pts[P.WRIST].y) * ax.y + ((p.z || 0) - (pts[P.WRIST].z || 0)) * ax.z) / axN;
  const pinkyReachAt = proj(pts[P.PINKY_MCP]) + L.little;
  const ringDipAt = proj(pts[P.RING_MCP]) + pathLen(pts, [P.RING_MCP, P.RING_PIP, P.RING_DIP]);
  // هامشٌ بقدرِ خطأِ القياس: يُحكَمُ بالبلوغِ أو عدمِه فقط حين يكونُ الفرقُ واضحًا
  const reachD = (pinkyReachAt - ringDipAt) / palmLen;
  const littleState = fLen.little < 0.55 ? "قصيرةٌ"
    : reachD >= 0.03 ? "طويلةٌ (تبلغُ مفصلَ السلامى الطرفيّةِ للبنصر)"
    : reachD <= -0.05 ? "لا تبلغُ مفصلَ البنصر" : null;
  if (littleState) f.fingers.little = { state: littleState };

  // الإبهام: لا يُحكَمُ عليه آليًّا. نقطتا مفصلِه وطرفِه في MediaPipe لا تُطابقان حدودَ السُّلامَيات
  // بدقّةِ المقارنةِ المطلوبة (جُرِّب على كفٍّ حقيقيّة: نسبةٌ ٠٫٧٧ لإبهامٍ سلاماه متقاربتان بالعين)،
  // وزاويتُه تعكسُ الوضعيّةَ المطلوبةَ لا طبيعةَ اليد. يُكمَّلُ كلُّه من الوضعِ اليدويّ.
  const thumbRatio = d3(pts[P.THUMB_TIP], pts[P.THUMB_IP]) / (d3(pts[P.THUMB_IP], pts[P.THUMB_MCP]) || 1);
  f.thumb = { firstPhalanx: "", secondPhalanx: "", angle: "", ball: null, joint: null };

  f._debug = { ratio: +ratio.toFixed(2), fLen, thumbRatio: +thumbRatio.toFixed(2), midCrook: +midCrook.toFixed(3), world: pts === wlm };
  return f;
}

// بكسلاتُ الإطارِ الحاليّ (تُرسَلُ إلى عاملِ OpenCV لتحليلِ الخطوط)
function frameImageData(video) {
  try {
    const w = video.videoWidth, h = video.videoHeight;
    if (!w || !h) return null;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(video, 0, 0);
    return g.getImageData(0, 0, w, h);
  } catch { return null; }
}

export function stopStream(stream) {
  try { stream && stream.getTracks().forEach((t) => t.stop()); } catch {}
}
