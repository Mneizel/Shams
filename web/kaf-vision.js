// web/kaf-vision.js — طبقةُ الرؤيةِ لقراءةِ الكفّ (المتصفّح فقط، أوفلاين).
//   • MediaPipe Hand Landmarker (vendor/mediapipe/): ٢١ نقطةً ⇒ شكلُ اليدِ والأصابعِ والإبهام.
//   • OpenCV.js (vendor/opencv.js): استخراجُ التجاعيدِ ⇒ الخطوطُ الرئيسيّةُ الثلاثة.
//   لا يعملُ على file:// — يلزمُ خادمٌ محلّيّ (افتح-قراءة-الكف.bat).

const MP_BASE = "../vendor/mediapipe";
const CV_URL = "../vendor/opencv.js";
let HL = null, FR = null, landmarker = null, cvReady = null;

function withTimeout(promise, ms, msg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms)),
  ]);
}

export async function ensureLoaded() {
  if (!landmarker) {
    // مهلةٌ زمنيّةٌ صريحة: تحميلُ ملفِّ اليد (٧ م.ب) قد يتعطّلُ على شبكةٍ بطيئة/متقطّعة
    // بلا أيِّ خطإٍ يُلتقَط — فتبقى الواجهةُ عالقةً على "جارٍ التحميل" إلى الأبد.
    landmarker = await withTimeout((async () => {
      const mod = await import(`${MP_BASE}/vision_bundle.mjs`);
      HL = mod.HandLandmarker; FR = mod.FilesetResolver;
      const fileset = await FR.forVisionTasks(`${MP_BASE}`);
      return HL.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${MP_BASE}/hand_landmarker.task` },
        numHands: 1, runningMode: "VIDEO",
        minHandDetectionConfidence: 0.6, minTrackingConfidence: 0.6,
      });
    })(), 25000, "انتهت مهلةُ تحميلِ نموذجِ اليد (تحقّقْ من الاتّصال)");
  }
  return landmarker;
}

// يُستدعى من app.js بعد أن تُصبحَ الكاميرا تعملُ فعلًا (بعد نجاحِ video.play()) —
// لا من ensureLoaded — حتّى لا يتزامنَ تجميدُ OpenCV.js الرئيسيُّ مع لحظةِ فتحِ
// الكاميرا الحرجة. إن لم يجهزْ OpenCV بعدُ وقتَ الالتقاط، تُترَكُ الخطوطُ للوضعِ اليدويّ.
export function preloadOpenCV() {
  if (!cvReady) cvReady = loadOpenCV().catch(() => null);
  return cvReady;
}

function loadOpenCV() {
  return new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) return resolve(window.cv);
    const TIMEOUT = 20000;
    const t0 = Date.now();
    let settled = false;
    const finish = (fn, val) => { if (settled) return; settled = true; fn(val); };
    // تُستدعى فورًا (لا تنتظرُ onload) حتّى تُطبَّقَ المهلةُ الزمنيّةُ فعليًّا
    // حتّى لو تعطّل تحميلُ الملفِّ أو لم يُطلَق onload/onerror أبدًا (شبكةٌ بطيئة/معطَّلة).
    const poll = () => {
      if (settled) return;
      if (window.cv && window.cv.Mat) return finish(resolve, window.cv);
      if (Date.now() - t0 > TIMEOUT) return finish(reject, new Error("انتهت مهلةُ تهيئةِ OpenCV.js"));
      setTimeout(poll, 150);
    };
    const s = document.createElement("script");
    s.src = CV_URL; s.async = true;
    s.onload = () => {
      // بُناتُ docs.opencv.org: قد يكونُ cv وعدًا (Promise) أو كائنَ Module فيه onRuntimeInitialized.
      const c = window.cv;
      if (c && typeof c.then === "function") {
        c.then((m) => { window.cv = m; finish(resolve, m); }, (e) => finish(reject, e));
      } else if (c && !c.Mat) {
        c.onRuntimeInitialized = () => finish(resolve, window.cv);
      }
    };
    s.onerror = () => finish(reject, new Error("تعذّرَ تحميلُ OpenCV.js"));
    document.head.appendChild(s);
    poll();
  });
}

// نقاطُ MediaPipe الـ٢١
const P = { WRIST: 0, THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  IDX_MCP: 5, IDX_PIP: 6, IDX_DIP: 7, IDX_TIP: 8, MID_MCP: 9, MID_PIP: 10, MID_DIP: 11, MID_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16, PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function angle(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
  const d = (v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y) || 1);
  return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
}

/** حلقةٌ حيّة: تُقيِّمُ كلَّ إطارٍ وتُوجِّه، ثمّ تلتقطُ لمّا تستقرُّ الجودةُ ~نصفَ ثانية. */
export function runLiveCapture({ video, onGuide, onShot }) {
  let raf = 0, stableFrames = 0, lastLm = null, stopped = false;
  const NEED_STABLE = 14;
  async function tick() {
    if (stopped) return;
    let res;
    try { res = landmarker.detectForVideo(video, performance.now()); } catch { res = null; }
    const msgs = []; let ok = true;
    const lm = res && res.landmarks && res.landmarks[0];
    if (!lm) { msgs.push("لا ألمحُ يدك — ارفعْها أمامَ الكاميرا وباطنُ الكفِّ نحوَها"); ok = false; stableFrames = 0; }
    else {
      const xs = lm.map((p) => p.x), ys = lm.map((p) => p.y);
      const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
      const span = Math.max(w, h);
      if (span < 0.45) { msgs.push("قرِّبْ يدك قليلًا"); ok = false; }
      else if (span > 0.95) { msgs.push("أبعِدْ يدك قليلًا"); ok = false; }
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      if (Math.abs(cx - 0.5) > 0.22 || Math.abs(cy - 0.5) > 0.22) { msgs.push("اجعلْ يدك في وسطِ الإطار"); ok = false; }
      const palmZ = (lm[P.WRIST].z + lm[P.MID_MCP].z) / 2;
      const tipZ = (lm[P.MID_TIP].z + lm[P.IDX_TIP].z + lm[P.RING_TIP].z) / 3;
      if (tipZ - palmZ > 0.06) { msgs.push("افردْ كفّك ولا تُطبِقِ الأصابع"); ok = false; }
      const spread = angle(lm[P.IDX_TIP], lm[P.MID_MCP], lm[P.PINKY_TIP]);
      if (spread < 18) { msgs.push("افتحْ أصابعك قليلًا"); ok = false; }
      if (lastLm) {
        let mv = 0; for (let i = 0; i < 21; i++) mv += dist(lm[i], lastLm[i]); mv /= 21;
        if (mv > 0.012) { msgs.push("ثبِّتْ يدك لحظة…"); ok = false; }
      }
      lastLm = lm;
      const bright = sampleBrightness(video, cx, cy);
      if (bright != null && bright < 55) { msgs.push("الإضاءةُ ضعيفة — اقتربْ من نور"); ok = false; }
    }
    if (ok) {
      stableFrames++;
      if (stableFrames >= NEED_STABLE) {
        stopped = true; cancelAnimationFrame(raf);
        const dataUrl = grab(video);
        let feats;
        try { feats = extractFeatures(lm, video); }
        catch (e) { feats = baseFeatures(); feats._err = String(e && e.message || e); }
        onShot(feats, dataUrl, lm);
        return;
      }
    } else stableFrames = 0;
    onGuide(msgs.length ? msgs : ["ممتاز — أبقِ يدك ثابتة"], ok);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return () => { stopped = true; cancelAnimationFrame(raf); };
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
    const g = _sc.getContext("2d");
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
export function extractFeatures(lm, video) {
  const f = baseFeatures();
  const palmLen = dist(lm[P.WRIST], lm[P.MID_MCP]) || 1;
  const palmWid = dist(lm[P.IDX_MCP], lm[P.PINKY_MCP]);
  const ratio = palmWid / palmLen;
  const fLen = {
    index: dist(lm[P.IDX_TIP], lm[P.IDX_MCP]) / palmLen,
    middle: dist(lm[P.MID_TIP], lm[P.MID_MCP]) / palmLen,
    ring: dist(lm[P.RING_TIP], lm[P.RING_MCP]) / palmLen,
    little: dist(lm[P.PINKY_TIP], lm[P.PINKY_MCP]) / palmLen,
  };
  const longFingers = fLen.middle > 0.95;
  if (ratio >= 0.92 && !longFingers) f.handType = "square";
  else if (ratio >= 0.92 && longFingers) f.handType = "spatulate";
  else if (ratio < 0.72 && longFingers) f.handType = "psychic";
  else if (ratio < 0.80 && fLen.middle > 0.9) f.handType = "philosophic";
  else if (ratio < 0.82 && !longFingers) f.handType = "primitive";
  else f.handType = "conic";

  f.fingers.index = { state: fLen.index / fLen.middle > 0.92
    ? "طويلةٌ (تقاربُ الوسطى أو تتجاوزُ منتصفَ سلاماها الطرفيّة)"
    : fLen.index / fLen.middle < 0.78 ? "قصيرةٌ (لا تبلغُ مفصلَ السلامى الطرفيّةِ للوسطى)"
    : "قمّتُها عريضةٌ مربّعة" };
  const midStraight = angle(lm[P.MID_MCP], lm[P.MID_PIP], lm[P.MID_TIP]) > 160;
  f.fingers.middle = { state: fLen.middle > 1.08 ? "طويلةٌ جدًّا (أطولُ من المعتادِ بوضوح)"
    : !midStraight ? "مقوَّسةٌ منحنية"
    : fLen.middle < 0.85 ? "قصيرةٌ (أقصرُ بوضوح)" : "معتدلةُ الطولِ مستقيمة" };
  f.fingers.ring = { state: fLen.ring / fLen.index > 1.02 ? "مساويةٌ للسبّابة أو أطول"
    : fLen.ring / fLen.index < 0.9 ? "أقصرُ من السبّابة"
    : "طويلةٌ (تبلغُ منتصفَ سلامى السبّابةِ الطرفيّةِ أو أكثر)" };
  const pinkyReach = dist(lm[P.PINKY_TIP], lm[P.RING_DIP]) < dist(lm[P.RING_DIP], lm[P.RING_PIP]);
  f.fingers.little = { state: fLen.little > 0.78 ? "طويلةٌ (تبلغُ مفصلَ السلامى الطرفيّةِ للبنصر)"
    : !pinkyReach ? "لا تبلغُ مفصلَ البنصر" : "قصيرةٌ" };

  const spread = angle(lm[P.IDX_TIP], lm[P.WRIST], lm[P.PINKY_TIP]);
  if (spread > 34) f.fingerSet.push("wideGaps");
  else if (spread < 20) f.fingerSet.push("tightGaps");

  const thumbAng = angle(lm[P.THUMB_TIP], lm[P.THUMB_CMC], lm[P.IDX_MCP]);
  const ph1 = dist(lm[P.THUMB_TIP], lm[P.THUMB_IP]);
  const ph2 = dist(lm[P.THUMB_IP], lm[P.THUMB_MCP]);
  f.thumb = {
    firstPhalanx: ph1 / palmLen > 0.16 ? "large" : ph1 / palmLen < 0.11 ? "small" : "",
    secondPhalanx: ph2 >= ph1 * 0.95 ? "long" : "short",
    angle: thumbAng > 42 ? "open" : thumbAng < 26 ? "closed" : "",
    ball: null, joint: null,
  };

  f.lines = detectLinesCV(lm, video) || f.lines;
  f._debug = { ratio: +ratio.toFixed(2), fLen };
  return f;
}

// ── استخراجُ التجاعيدِ بـ OpenCV.js ⇒ الخطوطُ الثلاثةُ الرئيسيّة ──────
function detectLinesCV(lm, video) {
  const none = () => ({ present: false, confidence: 0, states: [] });
  const out = { life: none(), head: none(), heart: none(), fate: none(), sun: none(), health: none() };
  const cv = window.cv;
  if (!cv || !cv.Mat) return out; // OpenCV لم يُحمَّلْ ⇒ تُترَكُ للوضعِ اليدويّ

  const N = 320;
  let full, roi, gray, clahe, bh, th, morphed, contours, hierarchy, se;
  try {
    // رباعيُّ الراحةِ من النقاط: من نقطةٍ بين الإبهامِ والسبّابةِ (أعلى يسار) إلى الرسغ.
    const src = [
      lerp(lm[P.IDX_MCP], lm[P.THUMB_CMC], 0.15),   // أعلى اليسار (جهةُ الإبهام)
      lm[P.PINKY_MCP],                                // أعلى اليمين
      lerp(lm[P.WRIST], lm[P.PINKY_MCP], 0.15),       // أسفل اليمين
      lm[P.WRIST],                                    // أسفل اليسار
    ].map((p) => [p.x * video.videoWidth, p.y * video.videoHeight]);
    full = cv.imread(frameToCanvas(video));
    const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [].concat(...src));
    const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, N, 0, N, N, 0, N]);
    const M = cv.getPerspectiveTransform(srcTri, dstTri);
    roi = new cv.Mat();
    cv.warpPerspective(full, roi, M, new cv.Size(N, N), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());
    srcTri.delete(); dstTri.delete(); M.delete();

    gray = new cv.Mat();
    cv.cvtColor(roi, gray, cv.COLOR_RGBA2GRAY);
    clahe = new cv.Mat();
    const cl = new cv.CLAHE(2.5, new cv.Size(8, 8));
    cl.apply(gray, clahe); cl.delete();
    // black-hat: يُبرِزُ الوديانَ الداكنةَ الرفيعةَ (التجاعيد)
    bh = new cv.Mat();
    se = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(9, 9));
    cv.morphologyEx(clahe, bh, cv.MORPH_BLACKHAT, se);
    th = new cv.Mat();
    cv.threshold(bh, th, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
    morphed = new cv.Mat();
    const se2 = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(5, 5));
    cv.morphologyEx(th, morphed, cv.MORPH_CLOSE, se2); se2.delete();

    contours = new cv.MatVector(); hierarchy = new cv.Mat();
    cv.findContours(morphed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const segs = [];
    for (let i = 0; i < contours.size(); i++) {
      const c = contours.get(i);
      const len = cv.arcLength(c, false);
      if (len < N * 0.28) { c.delete(); continue; }
      const r = cv.boundingRect(c);
      const m = cv.moments(c, false);
      const cx = m.m00 ? m.m10 / m.m00 : r.x + r.width / 2;
      const cy = m.m00 ? m.m01 / m.m00 : r.y + r.height / 2;
      const horiz = r.width >= r.height;
      const closed = isLoop(c, cv);
      segs.push({ len: len / N, cx: cx / N, cy: cy / N, w: r.width / N, h: r.height / N, horiz, closed });
      c.delete();
    }

    // تصنيفُ المقاطعِ إلى نطاقاتٍ تشريحيّة (الإحداثيّات: ٠ أعلى، ١ أسفل؛ ٠ يسار=الإبهام)
    const inBand = (s, y0, y1) => s.cy >= y0 && s.cy <= y1;
    const heartSegs = segs.filter((s) => s.horiz && inBand(s, 0.12, 0.36) && s.w > 0.35);
    const headSegs = segs.filter((s) => s.horiz && inBand(s, 0.36, 0.6) && s.w > 0.35);
    const lifeSegs = segs.filter((s) => !s.horiz || s.h > 0.35).filter((s) => s.cx < 0.5 && s.cy > 0.25 && s.h > 0.3);
    const fateSegs = segs.filter((s) => !s.horiz && s.h > 0.4 && s.cx > 0.35 && s.cx < 0.72);

    out.heart = buildLine(heartSegs, "heart");
    out.head = buildLine(headSegs, "head");
    out.life = buildLine(lifeSegs, "life");
    out.fate = buildLine(fateSegs, "fate");
  } catch (e) {
    // فشلُ الأنبوبِ ⇒ تُترَكُ الخطوطُ فارغةً («لم يتبيّنْ»)
  } finally {
    [full, roi, gray, clahe, bh, th, morphed, hierarchy, se].forEach((m) => { try { m && m.delete && m.delete(); } catch {} });
    try { contours && contours.delete(); } catch {}
  }
  return out;

  function buildLine(bandSegs, which) {
    if (!bandSegs.length) return none();
    const total = bandSegs.reduce((a, s) => a + s.len, 0);
    const longest = Math.max(...bandSegs.map((s) => s.len));
    const pieces = bandSegs.length;
    const hasLoop = bandSegs.some((s) => s.closed);
    const states = [];
    // طول
    if (which === "life") states.push(longest > 0.7 ? "طويلٌ عميقٌ واضحٌ متّصل" : "قصيرٌ");
    else if (which === "head") states.push(longest > 0.7 ? "مستقيمٌ واضحٌ طويل" : "قصيرٌ");
    else if (which === "heart") states.push(longest > 0.6 ? "طويلٌ عميقٌ واضح" : "قصيرٌ");
    else if (which === "fate") states.push(longest > 0.55 ? "واضحٌ مستقيمٌ يصلُ إلى تلِّ زحل" : "متقطّعٌ");
    // اتّصال
    if (pieces >= 3) {
      if (which === "life") states.push("متقطّعٌ");
      else if (which === "head") states.push("منكسرٌ / متقطّع");
      else if (which === "heart") states.push("متقطّعٌ / به كسور");
    }
    if (hasLoop) {
      if (which === "life") states.push("به جزيرةٌ");
      else if (which === "head") states.push("به جزيرة");
      else if (which === "heart") states.push("متقطّعٌ / به كسور");
    }
    const conf = Math.max(0.3, Math.min(0.82, 0.3 + total * 0.35 + longest * 0.3));
    return { present: true, confidence: +conf.toFixed(2), states: uniq(states) };
  }
}

function uniq(a) { return [...new Set(a)]; }
function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
function isLoop(cnt, cv) {
  const n = cnt.data32S.length / 2;
  if (n < 8) return false;
  const x0 = cnt.data32S[0], y0 = cnt.data32S[1];
  const xe = cnt.data32S[(n - 1) * 2], ye = cnt.data32S[(n - 1) * 2 + 1];
  return Math.hypot(x0 - xe, y0 - ye) < 12;
}
let _fc = null;
function frameToCanvas(video) {
  if (!_fc) _fc = document.createElement("canvas");
  _fc.width = video.videoWidth; _fc.height = video.videoHeight;
  _fc.getContext("2d").drawImage(video, 0, 0);
  return _fc;
}

export function stopStream(stream) {
  try { stream && stream.getTracks().forEach((t) => t.stop()); } catch {}
}
