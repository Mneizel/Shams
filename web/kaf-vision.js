// web/kaf-vision.js — طبقةُ الرؤيةِ لقراءةِ الكفّ (المتصفّح فقط، أوفلاين).
//   • MediaPipe Hand Landmarker (vendor/mediapipe/): ٢١ نقطةً ⇒ شكلُ اليدِ والأصابعِ والإبهام.
//   • OpenCV.js (vendor/opencv.js) داخل kaf-cv-worker.js (خيطٌ منفصل): استخراجُ التجاعيدِ ⇒ الخطوطُ الرئيسيّة.
//   لا يعملُ على file:// — يلزمُ خادمٌ محلّيّ (افتح-قراءة-الكف.bat).

const MP_BASE = "../vendor/mediapipe";
let HL = null, FR = null, landmarker = null, landmarkerLoading = null;

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
      HL = mod.HandLandmarker; FR = mod.FilesetResolver;
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
// يُبدأ تحميلُه بعد فتحِ الكاميرا ويُستعمَلُ عند الالتقاط فقط؛ إن لم يجهزْ أو فشل، تُترَكُ
// الخطوطُ للوضعِ اليدويّ ويُصرَّحُ بذلك. (سببُ «تجمّدِ الصفحة» القديم: انظرْ تنبيهَ thenable في العامل.)
let cvWorker = null, cvState = "idle", cvWaiters = [], cvSeq = 0;
const cvPending = new Map();
function cvSettle(state) {
  cvState = state;
  const w = cvWaiters; cvWaiters = [];
  w.forEach((f) => f(state));
}
export function preloadOpenCV() {
  if (cvWorker || cvState === "failed") return;
  try { cvWorker = new Worker(new URL("./kaf-cv-worker.js", import.meta.url)); }
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
// يُرجِعُ {lines, note}: note نصُّ صراحةٍ إن لم تُحلَّلِ الخطوطُ آليًّا.
async function linesViaWorker(imageData, quad) {
  if (!cvWorker && cvState !== "failed") preloadOpenCV();
  const st = await cvWhenReady(15000);
  if (st !== "ready") return { lines: null, note: st === "timeout" ? "محرّكُ الخطوطِ لم يجهزْ بعدُ (اتّصالٌ أو جهازٌ بطيء) — الخطوطُ تُكمَّلُ من الوضعِ اليدويّ." : "تعذّرَ تشغيلُ محرّكِ الخطوطِ على هذا الجهاز — الخطوطُ تُكمَّلُ من الوضعِ اليدويّ." };
  const id = ++cvSeq;
  try {
    const out = await withTimeout(new Promise((resolve, reject) => {
      cvPending.set(id, { resolve, reject });
      cvWorker.postMessage({ id, imageData, quad }, [imageData.data.buffer]);
    }), 15000, "انتهت مهلةُ تحليلِ الخطوط");
    return { lines: out, note: null };
  } catch (e) {
    cvPending.delete(id);
    return { lines: null, note: "تعذّرَ تحليلُ الخطوطِ آليًّا (" + (e.message || e) + ") — تُكمَّلُ من الوضعِ اليدويّ." };
  }
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

/** حلقةٌ حيّة: تُقيِّمُ كلَّ إطارٍ وتُوجِّه، ثمّ تلتقطُ بسرعةٍ فورَ مطابقةِ اليدِ لرسمِ الدليل.
 *  تُعيدُ {stop, capture}: capture() تُتيحُ للمستخدمِ التقاطَ الصورةِ يدويًّا في أيّ لحظة
 *  (بآخرِ يدٍ رُصِدت، حتّى لو لم تكتملِ الشروطُ الآليّةُ بعدُ) — حتّى لا يبقى عالقًا بلا مخرجٍ
 *  إن تعذّر الاكتشافُ التلقائيُّ لأيِّ سببٍ (إضاءة/زاوية/جهاز) لم نتوقّعْه. */
export function runLiveCapture({ video, onGuide, onShot }) {
  let raf = 0, stableFrames = 0, lastLm = null, stopped = false, aborted = false;
  const NEED_STABLE = 4;
  const doShot = async (lm) => {
    stopped = true; cancelAnimationFrame(raf);
    // الإطارُ يُثبَّتُ فورًا لحظةَ الالتقاط (الصورةُ المعروضةُ والمحلَّلةُ هي نفسُها)
    const dataUrl = grab(video);
    let feats;
    if (!lm) {
      feats = baseFeatures();
      feats._err = "لم تُرصَدْ يدٌ في هذه اللحظة — التُقِطت الصورةُ بلا تحليلٍ آليّ، أكمِلِ الوضعَ اليدويّ.";
    } else {
      try { feats = extractFeatures(lm, video); }
      catch (e) { feats = baseFeatures(); feats._err = String(e && e.message || e); }
      const frame = frameImageData(video);
      if (frame && !feats._err) {
        onGuide(["تمّ الالتقاط — جارٍ تحليلُ الخطوط…"], true);
        const W = video.videoWidth, H = video.videoHeight;
        const quad = [
          lerp(lm[P.IDX_MCP], lm[P.THUMB_CMC], 0.15),   // أعلى اليسار (جهةُ الإبهام)
          lm[P.PINKY_MCP],                                // أعلى اليمين
          lerp(lm[P.WRIST], lm[P.PINKY_MCP], 0.15),       // أسفل اليمين
          lm[P.WRIST],                                    // أسفل اليسار
        ].map((p) => [p.x * W, p.y * H]);
        const { lines, note } = await linesViaWorker(frame, quad);
        if (lines) feats.lines = lines;
        if (note) feats._linesNote = note;
      }
    }
    if (aborted) return; // أُوقِفَ/غادرَ المستخدمُ أثناءَ التحليل — لا تُعرَضُ نتيجةٌ على لوحةٍ أخرى
    onShot(feats, dataUrl, lm);
  };
  // التحليلُ ثقيلٌ على المعالج: لا يُعادُ على نفسِ الإطار، ولا أكثرَ من ~١٥ مرّةً بالثانية —
  // وإلّا يخنقُ الصفحةَ (بطءٌ وتقطّعٌ ظاهر) دونَ أيِّ فائدةٍ إضافيّة.
  const MIN_GAP_MS = 66;
  let lastVideoTime = -1, lastRun = 0, failStreak = 0, lastLmAt = 0;
  async function tick() {
    if (stopped) return;
    const now = performance.now();
    if (video.readyState < 2 || video.currentTime === lastVideoTime || now - lastRun < MIN_GAP_MS) {
      raf = requestAnimationFrame(tick); return;
    }
    lastVideoTime = video.currentTime; lastRun = now;
    let res, threw = false;
    try { res = landmarker.detectForVideo(video, now); } catch { res = null; threw = true; }
    failStreak = threw ? failStreak + 1 : 0;
    const msgs = []; let ok = true;
    const lm = res && res.landmarks && res.landmarks[0];
    if (failStreak >= 15) {
      // التحليلُ نفسُه يفشلُ مرارًا (ليس غيابَ يد) — لا نوهمُ المستخدمَ بأنّه "لا يرى يده"
      msgs.push("تعذّرَ تحليلُ صورةِ الكاميرا على هذا الجهاز — اضغطْ «التقطِ الآن» أو استعملِ الوضعَ اليدويّ"); ok = false; stableFrames = 0;
    } else if (!lm) { msgs.push("لا ألمحُ يدك — ارفعْها أمامَ الكاميرا وباطنُ الكفِّ نحوَها"); ok = false; stableFrames = 0; }
    else {
      const xs = lm.map((p) => p.x), ys = lm.map((p) => p.y);
      const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
      const span = Math.max(w, h);
      if (span < 0.35) { msgs.push("قرِّبْ يدك قليلًا"); ok = false; }
      else if (span > 1.05) { msgs.push("أبعِدْ يدك قليلًا"); ok = false; }
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      if (Math.abs(cx - 0.5) > 0.3 || Math.abs(cy - 0.5) > 0.3) { msgs.push("اجعلْ يدك في وسطِ الإطار"); ok = false; }
      const palmZ = (lm[P.WRIST].z + lm[P.MID_MCP].z) / 2;
      const tipZ = (lm[P.MID_TIP].z + lm[P.IDX_TIP].z + lm[P.RING_TIP].z) / 3;
      if (tipZ - palmZ > 0.09) { msgs.push("افردْ كفّك ولا تُطبِقِ الأصابع"); ok = false; }
      const spread = angle(lm[P.IDX_TIP], lm[P.MID_MCP], lm[P.PINKY_TIP]);
      if (spread < 12) { msgs.push("افتحْ أصابعك قليلًا"); ok = false; }
      if (lastLm) {
        let mv = 0; for (let i = 0; i < 21; i++) mv += dist(lm[i], lastLm[i]); mv /= 21;
        // الإطاراتُ المحلَّلةُ الآن متباعدةٌ (~٦٦ م.ث) فالعتبةُ أوسعُ قليلًا لتقابلَ نفسَ الثبات
        if (mv > 0.035) { msgs.push("ثبِّتْ يدك لحظة…"); ok = false; }
      }
      lastLm = lm; lastLmAt = now;
      const bright = sampleBrightness(video, cx, cy);
      if (bright != null && bright < 40) { msgs.push("الإضاءةُ ضعيفة — اقتربْ من نور"); ok = false; }
    }
    if (ok) {
      stableFrames++;
      if (stableFrames >= NEED_STABLE) { doShot(lm); return; }
    } else stableFrames = 0;
    onGuide(msgs.length ? msgs : ["ممتاز — أبقِ يدك ثابتة"], ok);
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  return {
    stop: () => { stopped = true; aborted = true; cancelAnimationFrame(raf); },
    // نقاطُ اليدِ تُستعمَلُ فقط إن رُصِدت في آخرِ نصفِ ثانية — وإلّا فالصورةُ الحاليّةُ لا تطابقُها
    // وتحليلُها بنقاطٍ قديمةٍ قراءةٌ مُلفَّقة؛ فتُلتقَطُ الصورةُ بلا تحليلٍ آليٍّ ويُصرَّحُ بذلك.
    capture: () => { if (!stopped) doShot(performance.now() - lastLmAt < 500 ? lastLm : null); },
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

  f._debug = { ratio: +ratio.toFixed(2), fLen };
  return f;
}

function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }
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
