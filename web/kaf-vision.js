// web/kaf-vision.js — طبقةُ الرؤيةِ لقراءةِ الكفّ (المتصفّح فقط، أوفلاين).
//   • MediaPipe Hand Landmarker (vendor/mediapipe/): ٢١ نقطةً ⇒ شكلُ اليدِ والأصابعِ والإبهام.
//   • OpenCV.js (vendor/opencv.js) داخل kaf-cv-worker.js (خيطٌ منفصل): إبرازُ تجاعيدِ الراحةِ في صورة.
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
// يُرجِعُ {image, note}: صورةُ الراحةِ بتجاعيدِها المُبرَزة (رابطُ data:) أو نصُّ صراحةٍ إن تعذّرت.
async function creasesViaWorker(imageData, quad) {
  if (!cvWorker && cvState !== "failed") preloadOpenCV();
  const st = await cvWhenReady(15000);
  if (st !== "ready") return { image: null, note: st === "timeout" ? "محرّكُ إبرازِ الخطوطِ لم يجهزْ بعدُ (اتّصالٌ أو جهازٌ بطيء)." : "تعذّرَ تشغيلُ محرّكِ إبرازِ الخطوطِ على هذا الجهاز." };
  const id = ++cvSeq;
  try {
    const out = await withTimeout(new Promise((resolve, reject) => {
      cvPending.set(id, { resolve, reject });
      cvWorker.postMessage({ id, imageData, quad }, [imageData.data.buffer]);
    }), 15000, "انتهت مهلةُ إبرازِ الخطوط");
    const c = document.createElement("canvas");
    c.width = out.width; c.height = out.height;
    c.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(out.data), out.width, out.height), 0, 0);
    return { image: c.toDataURL("image/jpeg", 0.88), note: null };
  } catch (e) {
    cvPending.delete(id);
    return { image: null, note: "تعذّرَ إبرازُ الخطوط (" + (e.message || e) + ")." };
  }
}

// نقاطُ MediaPipe الـ٢١
const P = { WRIST: 0, THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  IDX_MCP: 5, IDX_PIP: 6, IDX_DIP: 7, IDX_TIP: 8, MID_MCP: 9, MID_PIP: 10, MID_DIP: 11, MID_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16, PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20 };
// ── دليلُ اليدِ المرسوم ─────────────────────────────────────────────────
// قالبُ كفٍّ يمنى باطنُها نحو الكاميرا، أصابعُها للأعلى متجاورةً والإبهامُ منفرج — مأخوذٌ من نقاطِ
// MediaPipe على صورةِ كفٍّ حقيقيّة (لا أرقامٍ مُتخيَّلة)، بإحداثيّاتِ «صندوقِ اليد» (٠..١).
// الكاميرا «ترى» الباطن ⇒ إبهامُ اليمنى على يمينِ الصورة (واليسرى انعكاسُها). كلُّ الحسابِ
// بإحداثيّاتِ الصورةِ نفسِها؛ العكسُ (المرآة) للعرضِ فقط.
const TPL_RIGHT = [
  [0.34, 0.97], [0.69, 0.90], [0.85, 0.73], [0.87, 0.58], [0.93, 0.46],   // الرسغ، الإبهام
  [0.64, 0.51], [0.64, 0.33], [0.63, 0.22], [0.60, 0.13],                 // السبّابة
  [0.44, 0.51], [0.44, 0.30], [0.44, 0.17], [0.42, 0.06],                 // الوسطى
  [0.26, 0.54], [0.26, 0.34], [0.26, 0.22], [0.26, 0.12],                 // البنصر
  [0.07, 0.60], [0.07, 0.44], [0.07, 0.35], [0.10, 0.26],                 // الخنصر
];
const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
const PALM = [0, 1, 5, 9, 13, 17];
const KEY = [0, 4, 5, 8, 9, 12, 13, 16, 17, 20];
const BOX_ASPECT = 0.5; // عرضُ صندوقِ اليد ÷ ارتفاعِه

/** موضعُ القالبِ بالبكسل داخلَ إطارٍ W×H: وسطَ الإطار، بأكبرِ حجمٍ يتّسعُ له طولًا وعرضًا. */
export function templatePx(hand, W, H) {
  const boxH = Math.min(0.82 * H, (0.9 * W) / BOX_ASPECT);
  const boxW = boxH * BOX_ASPECT;
  const left = (W - boxW) / 2, top = (H - boxH) / 2;
  const pts = TPL_RIGHT.map(([x, y]) => ({ x: left + (hand === "left" ? 1 - x : x) * boxW, y: top + y * boxH }));
  return { pts, boxH };
}

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mean = (arr) => arr.reduce((s, v) => s + v, 0) / (arr.length || 1);

/** يُقيِّمُ مطابقةَ اليدِ المرصودةِ (بكسل) للقالب، ويُعيدُ أولى رسائلِ التوجيهِ اللازمة.
 *  dirSign: ‎+1 إن كان العرضُ غيرَ معكوس، ‎-1 إن كان معكوسًا (لتصحيحِ «يمين/يسار» على الشاشة). */
export function assessFit(px, tpl, hand, dirSign = 1) {
  const { pts: T, boxH } = tpl;
  const handAr = hand === "left" ? "اليسرى" : "اليمنى", otherAr = hand === "left" ? "اليمنى" : "اليسرى";
  // ١) الأصابعُ للأعلى
  if (!(px[P.MID_TIP].y < px[P.MID_MCP].y && px[P.MID_MCP].y < px[P.WRIST].y)) {
    return { ok: false, msg: "وجّهْ أصابعَك نحوَ الأعلى كما في الرسمة" };
  }
  // ٢) الباطنُ نحو الكاميرا، واليدُ المختارة (الإبهامُ في جهتِه من الرسمة)
  const thumbSide = Math.sign(px[P.THUMB_TIP].x - px[P.PINKY_MCP].x);
  const wantSide = Math.sign(T[P.THUMB_TIP].x - T[P.PINKY_MCP].x);
  if (thumbSide !== wantSide) {
    return { ok: false, msg: `أرِ الكاميرا باطنَ كفّك ${handAr} (لا ظهرَها) — أو غيّرْ «اليد» تحتَ إلى ${otherAr}` };
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
  // القالب: شكلُ يدٍ مصمَتٌ يُرسَمُ على لوحةٍ جانبيّة ثمّ يُوضَعُ بشفافيّةٍ واحدة — رسمُه مباشرةً
  // بطبقاتٍ شفّافةٍ متراكبةٍ كان يُظهِرُ دوائرَ داكنةً عند كلِّ مفصل.
  const sil = drawOverlay._sil || (drawOverlay._sil = document.createElement("canvas"));
  if (sil.width !== canvas.width || sil.height !== canvas.height) { sil.width = canvas.width; sil.height = canvas.height; }
  const s = sil.getContext("2d");
  s.setTransform(dpr, 0, 0, dpr, 0, 0);
  s.clearRect(0, 0, cw, ch);
  s.fillStyle = s.strokeStyle = ok ? "#3ddc6a" : "#ffffff";
  s.lineCap = "round"; s.lineJoin = "round";
  s.beginPath(); PALM.forEach((i, k) => (k ? s.lineTo(T[i].x, T[i].y) : s.moveTo(T[i].x, T[i].y))); s.closePath(); s.fill();
  s.lineWidth = unit * 0.075;
  s.beginPath(); BONES.forEach(([a, b]) => { s.moveTo(T[a].x, T[a].y); s.lineTo(T[b].x, T[b].y); }); s.stroke();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = ok ? 0.32 : 0.22; g.drawImage(sil, 0, 0); g.restore();
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = ok ? "#3ddc6a" : "rgba(255,255,255,.9)"; g.lineWidth = 2; g.setLineDash(ok ? [] : [7, 6]);
  BONES.forEach(([a, b]) => { g.beginPath(); g.moveTo(T[a].x, T[a].y); g.lineTo(T[b].x, T[b].y); g.stroke(); });
  g.setLineDash([]);
  // ما تراه الكاميرا من يدِك الآن
  if (px) {
    const D = px.map(map);
    g.strokeStyle = "rgba(0,200,255,.85)"; g.lineWidth = 2;
    BONES.forEach(([a, b]) => { g.beginPath(); g.moveTo(D[a].x, D[a].y); g.lineTo(D[b].x, D[b].y); g.stroke(); });
    g.fillStyle = "#00c8ff";
    D.forEach((p) => { g.beginPath(); g.arc(p.x, p.y, 3, 0, Math.PI * 2); g.fill(); });
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
export function runLiveCapture({ video, overlay, mirrored = false, getHand = () => "right", onGuide, onShot }) {
  let raf = 0, stableFrames = 0, stopped = false, aborted = false;
  let lastPx = null, lastLm = null, lastWlm = null, lastLmAt = 0;
  // نقاطُ اليدِ في إطاراتِ الثباتِ المتتالية: تُؤخَذُ متوسّطَها عند الالتقاط، فلا يقلبُ اهتزازُ
  // إطارٍ واحدٍ حكمًا على حدٍّ فاصل (طولُ إصبعٍ مقابلَ آخر).
  let stableBuf = [];
  const avgPts = (list) => list[0].map((_, j) => ({
    x: mean(list.map((l) => l[j].x)), y: mean(list.map((l) => l[j].y)), z: mean(list.map((l) => l[j].z || 0)),
  }));
  const NEED_STABLE = 8;      // ≈ نصفُ ثانيةٍ على ~١٥ تحليلًا بالثانية
  const MIN_GAP_MS = 66;      // لا أكثرَ من ~١٥ تحليلًا بالثانية، ولا يُعادُ التحليلُ على نفسِ الإطار
  let lastVideoTime = -1, lastRun = 0, failStreak = 0;

  const doShot = async (lm, wlm) => {
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
      const frame = frameImageData(video);
      if (frame && !feats._err) {
        onGuide(["تمّ الالتقاط — جارٍ إبرازُ خطوطِ كفّك…"], true);
        const px = lm.map((p) => ({ x: p.x * W, y: p.y * H }));
        const { image, note } = await creasesViaWorker(frame, palmQuad(px));
        if (image) feats._creaseImage = image;
        if (note) feats._linesNote = note;
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
    const hand = getHand() === "left" ? "left" : "right";
    const tpl = templatePx(hand, W, H);
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
      const fit = assessFit(px, tpl, hand, mirrored ? -1 : 1);
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
        doShot(avgPts(stableBuf.map((s) => s.lm)), wl.length === stableBuf.length ? avgPts(wl) : null);
        return;
      }
      msg = `ممتاز — أبقِ يدك ثابتة… ${"●".repeat(stableFrames)}${"○".repeat(NEED_STABLE - stableFrames)}`;
    } else { stableFrames = 0; stableBuf = []; }
    onGuide([msg], ok);
    raf = requestAnimationFrame(tick);
  }
  // يُرسَمُ الدليلُ فورَ ظهورِ الفيديو، قبلَ أوّلِ تحليل
  if (video.videoWidth) drawOverlay(overlay, video, templatePx(getHand() === "left" ? "left" : "right", video.videoWidth, video.videoHeight), null, false, mirrored);
  raf = requestAnimationFrame(tick);
  return {
    stop: () => { stopped = true; aborted = true; cancelAnimationFrame(raf); },
    // نقاطُ اليدِ تُستعمَلُ فقط إن رُصِدت في آخرِ نصفِ ثانية — وإلّا فالصورةُ الحاليّةُ لا تطابقُها
    // وتحليلُها بنقاطٍ قديمةٍ قراءةٌ مُلفَّقة؛ فتُلتقَطُ الصورةُ بلا تحليلٍ آليٍّ ويُصرَّحُ بذلك.
    capture: () => {
      if (stopped) return;
      const fresh = performance.now() - lastLmAt < 500;
      doShot(fresh ? lastLm : null, fresh ? lastWlm : null);
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

  const midBend = Math.min(ang3(pts[P.MID_MCP], pts[P.MID_PIP], pts[P.MID_DIP]), ang3(pts[P.MID_PIP], pts[P.MID_DIP], pts[P.MID_TIP]));
  f.fingers.middle = { state: fLen.middle > 1.08 ? "طويلةٌ جدًّا (أطولُ من المعتادِ بوضوح)"
    : midBend < 150 ? "مقوَّسةٌ منحنية"
    : fLen.middle < 0.82 ? "قصيرةٌ (أقصرُ بوضوح)" : "معتدلةُ الطولِ مستقيمة" };

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

  f._debug = { ratio: +ratio.toFixed(2), fLen, thumbRatio: +thumbRatio.toFixed(2), world: pts === wlm };
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
