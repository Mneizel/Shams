// engines/khawatim.js
// ─────────────────────────────────────────────────────────────────────────────
// الخواتمُ الكوكبيّة وأختامُ الكواكب على طريقة أغريبا (المادّة كلُّها في data/agrippa-rings.data.js).
// هنا: (١) حسابُ الأسماء العبريّة والتحقّقُ من أعدادها، (٢) رسمُ ختم كلّ اسمٍ على جدول كوكبه
// بطريقة Tyson (الملحق الخامس)، (٣) «خاتمُك» من كوكب اسمك أو كوكب يوم ميلادك، (٤) أقربُ يومٍ وساعةٍ للعمل.
// ─────────────────────────────────────────────────────────────────────────────

import R from "../data/agrippa-rings.data.js";
import falak from "./falak.js";

const BY_PLANET = Object.fromEntries(R.PLANETS.map((p) => [p.planet, p]));
const BY_WEEKDAY = Object.fromEntries(R.PLANETS.map((p) => [p.weekday, p.planet]));

/** كلُّ الكواكب السبعة بالترتيب الكلدانيّ (زحل ← القمر). */
export function all() { return R.PLANETS; }
export function planet(name) { return BY_PLANET[name] || null; }

/** أعدادُ حروفِ اسمٍ عبريّ (المسافاتُ تُتجاهَل). */
export function hebrewLetters(heb) {
  return [...String(heb)].filter((ch) => R.HEBREW_VALUES[ch]).map((ch) => ({ ch, v: R.HEBREW_VALUES[ch] }));
}
export function gematria(heb) { return hebrewLetters(heb).reduce((s, x) => s + x.v, 0); }

/** مجموعُ الصفّ ومجموعُ الجدول — للتحقّق من أنّ الجدولَ وفقٌ تامّ. */
export function checkTable(planetName) {
  const t = R.TABLES[planetName], n = t.length;
  const rows = t.map((r) => r.reduce((a, b) => a + b, 0));
  const cols = t[0].map((_, j) => t.reduce((s, r) => s + r[j], 0));
  const d1 = t.reduce((s, r, i) => s + r[i], 0), d2 = t.reduce((s, r, i) => s + r[n - 1 - i], 0);
  const sums = new Set([...rows, ...cols, d1, d2]);
  return { order: n, magic: sums.size === 1 ? rows[0] : null, total: rows.reduce((a, b) => a + b, 0) };
}

/**
 * مسارُ ختم الاسم على جدول كوكبه (Tyson، الملحق الخامس): كلُّ حرفٍ يُوضَع في الخانة التي فيها عددُه؛
 * فإن جاوز العددُ أكبرَ خانةٍ في الجدول أُنزِل بـ«أيق بكر» (٣٠←٣، ٢٠٠←٢٠ أو ٢، ٤٠٠←٤٠ أو ٤…).
 * merge: حرفان متتاليان يُجمعان في خانةٍ واحدة (كاليود والألف في خانة ١١). force: خانةٌ مفروضة لحرف.
 * @returns {{ cells:number[], steps:[{letters:string, value:number, cell:number}] , points:[{r,c}] }}
 */
export function sigilPath(planetName, entry) {
  const t = R.TABLES[planetName], n = t.length, max = n * n;
  const pos = {}; t.forEach((row, r) => row.forEach((v, c) => (pos[v] = { r, c })));
  const reduce = (v) => { while (v > max) v /= 10; return Math.round(v); };
  const L = hebrewLetters(entry.heb), merge = new Set(entry.merge || []), force = entry.force || {};
  const steps = [];
  for (let i = 0; i < L.length; i++) {
    if (merge.has(i) && i + 1 < L.length) {
      const v = reduce(L[i].v) + reduce(L[i + 1].v);
      steps.push({ letters: L[i].ch + L[i + 1].ch, value: L[i].v + L[i + 1].v, cell: v, merged: true });
      i++;
    } else steps.push({ letters: L[i].ch, value: L[i].v, cell: force[i] ?? reduce(L[i].v) });
  }
  return { order: n, cells: steps.map((s) => s.cell), steps, points: steps.map((s) => pos[s.cell]) };
}

/** الجدولُ مرسومًا SVG، وفوقه ختمُ الاسم إن أُعطي (دائرةٌ في البدء، وخطٌّ معترضٌ في النهاية — كعادة الأختام). */
export function sigilSVG(planetName, entry = null, { size = 220, showNumbers = true } = {}) {
  const t = R.TABLES[planetName], n = t.length, cell = size / n, pad = 6, W = size + pad * 2;
  const cx = (c) => pad + c * cell + cell / 2, cy = (r) => pad + r * cell + cell / 2;
  const fs = Math.max(7, Math.min(16, cell * 0.38));
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" role="img" aria-label="جدول ${planetName}${entry ? " وختم " + entry.name : ""}">`;
  s += `<rect x="${pad}" y="${pad}" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-opacity=".5"/>`;
  for (let i = 1; i < n; i++) {
    s += `<line x1="${pad + i * cell}" y1="${pad}" x2="${pad + i * cell}" y2="${pad + size}" stroke="currentColor" stroke-opacity=".25"/>`;
    s += `<line x1="${pad}" y1="${pad + i * cell}" x2="${pad + size}" y2="${pad + i * cell}" stroke="currentColor" stroke-opacity=".25"/>`;
  }
  if (showNumbers) t.forEach((row, r) => row.forEach((v, c) => {
    s += `<text x="${cx(c)}" y="${cy(r)}" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="currentColor" fill-opacity="${entry ? 0.35 : 0.85}" font-family="sans-serif">${String(v).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d])}</text>`;
  }));
  if (entry) {
    const { points } = sigilPath(planetName, entry);
    const P = points.map((p) => [cx(p.c), cy(p.r)]);
    const col = "var(--gold, #c9a227)", sw = Math.max(2, cell * 0.08);
    s += `<polyline points="${P.map((p) => p.join(",")).join(" ")}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`;
    // حرفان متتاليان في خانةٍ واحدة ⇐ عقدةٌ صغيرة (كـ«الحدبة» في رسوم Tyson)
    for (let i = 1; i < P.length; i++) if (P[i][0] === P[i - 1][0] && P[i][1] === P[i - 1][1])
      s += `<circle cx="${P[i][0]}" cy="${P[i][1] - cell * 0.18}" r="${cell * 0.16}" fill="none" stroke="${col}" stroke-width="${sw * 0.7}"/>`;
    s += `<circle cx="${P[0][0]}" cy="${P[0][1]}" r="${cell * 0.14}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
    const a = P.at(-1), b = P.length > 1 ? P.at(-2) : [a[0] - 1, a[1]];
    let dx = a[0] - b[0], dy = a[1] - b[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const h = cell * 0.22;
    s += `<line x1="${a[0] - dy * h}" y1="${a[1] + dx * h}" x2="${a[0] + dy * h}" y2="${a[1] - dx * h}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }
  return s + "</svg>";
}

/** كوكبُ يوم الأسبوع لتاريخٍ «YYYY-MM-DD» (يومُ الميلاد بتقويمه المحلّيّ، لا بالتوقيت العالميّ). */
export function weekdayPlanet(dateStr) {
  const [y, m, d] = String(dateStr).split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { weekday: wd, planet: BY_WEEKDAY[wd], day: BY_PLANET[BY_WEEKDAY[wd]].day };
}

/**
 * «خاتمُك»: كوكبُ الاسم (من حساب الأسماء في الموقع: جُمّل الاسم + جُمّل الأمّ ÷ ٧) وكوكبُ يوم الميلاد.
 * يُرجع الخاتمين، ويُشار إن اتّفقا.
 */
export function yourRing({ namePlanet = null, birthDate = null } = {}) {
  const wd = birthDate ? weekdayPlanet(birthDate) : null;
  const byName = namePlanet && BY_PLANET[namePlanet] ? BY_PLANET[namePlanet] : null;
  const byDay = wd ? BY_PLANET[wd.planet] : null;
  return { byName, byDay, birthWeekday: wd, same: !!(byName && byDay && byName.planet === byDay.planet) };
}

/**
 * أقربُ يومٍ للكوكب (بدءًا من `from`) وساعتُه الأولى (من الشروق) — وهي ساعةُ الكوكب في يومه.
 * شرطُ الكتاب الأتمّ (طلوعُ الكوكب سعيدًا مع نظر القمر) يحتاجُ حكمَ منجّمٍ على الطالع؛ هذا الحدُّ الأدنى.
 */
export function nextWorkTime(planetName, from, lat, lon) {
  const p = BY_PLANET[planetName]; if (!p) return null;
  for (let k = 0; k < 9; k++) {
    const t = new Date(new Date(from).getTime() + k * 864e5);
    let table; try { table = falak.planetaryHours(t, lat, lon); } catch { return null; }
    if (table.dayRuler !== planetName) continue;
    const first = table.hours[0];
    if (first.end <= new Date(from)) continue; // فاتت ساعةُ اليوم ⇒ الأسبوعُ القادم
    return { planet: planetName, day: p.day, start: first.start, end: first.end };
  }
  return null;
}

// ── تركيبُ خاتمٍ لحاجة (على طريقة التسخير: الحاجة ⇐ الكوكب ⇐ ماذا ومتى وكيف) ─────────────

/** الحاجاتُ المتاحة (من نفع الجداول في ك٢ ف٢٢؛ لا حاجاتِ أذى). */
export function goals() { return R.GOALS.map((g) => ({ id: g.id, label: g.label, planet: g.planet })); }

/** حاجةُ السؤال: موضوعُه (falak.classifyAstroTopic) ⇐ أوّلُ حاجةٍ تذكرُ ذلك الموضوع، وإلّا «خاتمي العامّ». */
export function goalForQuestion(question) {
  if (!String(question || "").trim()) return null;
  const topic = falak.classifyAstroTopic(question);
  const g = R.GOALS.find((x) => x.topics.includes(topic)) || R.GOALS[0];
  return { id: g.id, topic };
}

// ── شروطُ الوقت كما في الكتاب نفسه، بلا زيادة ──
// ك١ ف٤٧: «حين يطلعُ الكوكبُ طلوعًا سعيدًا، مع نظرٍ سعيدٍ من القمر أو اقترانه به».
// ك٢ ف٢٩: «ضعْه في حظوظه، سعيدًا قويًّا، حاكمًا في اليوم والساعة وفي شكل الفلك… ولا تعمل شيئًا بلا عون القمر».
//          والنحسُ: نظرُ زحل أو المريخ، ولا سيّما المقابلةُ والتربيع؛ والمقارنةُ والتثليثُ والتسديسُ أنظارُ مودّة.
// ك٢ ف٣٠: الكوكبُ قويٌّ في بيته أو شرفه أو مثلّثته أو حدّه أو وجهه بلا احتراق، في الأوتاد ولا سيّما الطالعُ
//          والعاشر أو البيوتِ التي تليها؛ ولا يكونُ في حدود زحل أو المريخ.
//          والقمرُ: لا في الطريق المحترقة، ولا بطيءَ السير، ولا محترقًا بالشمس، ولا مقابلًا لها، ولا عديمَ النور،
//          ولا يعوقُه المريخُ أو زحل.
const FRIENDLY = ["مقارنة", "تسديس", "تثليث"];
const ENMITY = ["مقابلة", "تربيع"];
const STRONG_HOUSES = [1, 10, 4, 7, 2, 11, 5, 8]; // الأوتادُ والبيوتُ التي تليها (ك٢ ف٣٠)
const MALEFICS = ["زحل", "المريخ"];

/** فحصُ لحظةٍ بشروط الكتاب (ك١ ف٤٧، ك٢ ف٢٩–٣٠). كلُّ شرطٍ معه مرجعُه. */
export function checkMoment(planetName, when, lat, lon) {
  const t = new Date(when);
  const pos = falak.planetPositions(t);
  const pl = pos[planetName], moon = pos["القمر"], sun = pos["الشمس"];
  const asc = falak.ascendant(t, lat, lon).longitude;
  const house = falak.houseOf(pl.longitude, asc);
  const comb = falak.combustState(t);
  const ms = falak.moonState(t);
  const dig = falak.dignities(planetName, pl.longitude);
  const good = dig.dignities.filter((d) => ["بيت", "شرف", "مثلَّثة", "حدّ", "وجه"].includes(d));
  const hitBy = (lonX) => MALEFICS.filter((m) => m !== planetName).map((m) => ({ m, a: falak.aspectBetween(lonX, pos[m].longitude) })).filter((x) => x.a && ENMITY.includes(x.a.name));
  const plHit = hitBy(pl.longitude), moonHit = MALEFICS.map((m) => ({ m, a: falak.aspectBetween(moon.longitude, pos[m].longitude) })).filter((x) => x.a && (ENMITY.includes(x.a.name) || x.a.name === "مقارنة"));
  const burnt = (p) => comb[p] === "احتراق" || comb[p] === "تحت الشعاع";
  const checks = [
    { ref: "ك١ ف٤٧ + ك٢ ف٣٠", ok: STRONG_HOUSES.includes(house), text: `${planetName} في البيت ${house}${house === 1 ? " (الطالع)" : house === 10 ? " (العاشر)" : ""} — المطلوب: الأوتاد ولا سيّما الطالعُ والعاشر، أو البيوتُ التي تليها` },
    { ref: "ك٢ ف٢٩–٣٠", ok: good.length > 0, text: good.length ? `${planetName} في حظّه: ${good.join("، ")} (${dig.sign})` : `${planetName} في ${dig.sign} بلا حظّ (لا بيت ولا شرف ولا مثلّثة ولا حدّ ولا وجه)` },
    { ref: "ك٢ ف٣٠", ok: planetName === "الشمس" || !burnt(planetName), text: planetName === "الشمس" ? "الشمس لا تحترق" : `${planetName}: ${comb[planetName]} — المطلوب: بلا احتراق` },
    { ref: "ك٢ ف٣٠", ok: !MALEFICS.includes(pl.term?.ruler) || pl.term?.ruler === planetName, text: `حدُّ ${planetName}: ${pl.term?.ruler || "—"} — المطلوب: لا في حدود زحل أو المريخ` },
    { ref: "ك٢ ف٢٩", ok: plHit.length === 0, text: plHit.length ? `${planetName} في ${plHit.map((x) => `${x.a.name} ${x.m}`).join("، ")} — نظرُ عداوة` : `${planetName} سالمٌ من مقابلة زحل والمريخ وتربيعهما` },
  ];
  if (planetName !== "القمر") {
    const a = falak.aspectBetween(moon.longitude, pl.longitude);
    checks.push({ ref: "ك١ ف٤٧ + ك٢ ف٢٩", ok: !!(a && FRIENDLY.includes(a.name)), text: a ? `القمرُ في ${a.name} ${planetName}${FRIENDLY.includes(a.name) ? " — نظرُ مودّة" : " — ليس نظرَ مودّة"}` : `لا نظرَ بين القمر و${planetName} — المطلوب: مقارنة أو تثليث أو تسديس` });
  }
  const opp = falak.aspectBetween(moon.longitude, sun.longitude)?.name === "مقابلة";
  checks.push(
    { ref: "ك٢ ف٣٠", ok: !ms.inViaCombusta, text: ms.inViaCombusta ? "القمرُ في الطريق المحترقة" : "القمرُ خارجَ الطريق المحترقة" },
    { ref: "ك٢ ف٣٠", ok: ms.fast, text: ms.fast ? "القمرُ سريعُ السير" : "القمرُ بطيءُ السير" },
    { ref: "ك٢ ف٣٠", ok: !burnt("القمر"), text: burnt("القمر") ? `القمرُ محترقٌ بالشمس / عديمُ النور (${comb["القمر"]})` : "القمرُ غيرُ محترقٍ بالشمس" },
    { ref: "ك٢ ف٣٠", ok: !opp, text: opp ? "القمرُ مقابلٌ للشمس" : "القمرُ غيرُ مقابلٍ للشمس" },
    { ref: "ك٢ ف٣٠", ok: moonHit.length === 0, text: moonHit.length ? `القمرُ يعوقُه ${moonHit.map((x) => `${x.m} (${x.a.name})`).join("، ")}` : "القمرُ لا يعوقُه زحلُ ولا المريخ" },
  );
  return { when: t, house, sign: pl.sign, moonPhase: ms.phaseName, checks, ok: checks.every((c) => c.ok), score: checks.filter((c) => c.ok).length };
}

/**
 * أقربُ ساعةٍ يحكمُها الكوكب في يومه («حاكمًا في اليوم والساعة» ك٢ ف٢٩) تتحقّقُ فيها شروطُ الكتاب كلُّها،
 * خلال `days` يومًا. إن لم تكتمل في المدّة رجعت أقربُ ساعةٍ بأكثر الشروط، مع ما نقص.
 */
export function electTime(planetName, from, lat, lon, days = 400) {
  const t0 = new Date(from).getTime();
  let best = null;
  for (let k = -1; k <= days; k++) {
    const d = new Date(t0 + k * 864e5);
    let table; try { table = falak.planetaryHours(d, lat, lon); } catch { return null; }
    if (table.dayRuler !== planetName) continue;
    for (const h of table.hours) {
      if (h.ruler !== planetName || h.end.getTime() <= t0) continue;
      const mid = new Date(Math.max(t0, (h.start.getTime() + h.end.getTime()) / 2));
      const c = checkMoment(planetName, mid, lat, lon);
      const cand = { ...c, start: h.start, end: h.end, hourIndex: h.i, phase: h.phase };
      if (c.ok) return { ...cand, complete: true, searchedDays: days, nearest: best && best.start < cand.start ? best : null };
      if (!best || c.score > best.score) best = cand;
    }
  }
  return best ? { ...best, complete: false, searchedDays: days } : null;
}

/**
 * العملُ الكامل لحاجة — كلُّ سطرٍ من الكتاب ومرجعُه؛ وما ليس من الكتاب موسومٌ بـ notFromBook.
 */
export function work(goalId, { namePlanet = null, birthDate = null, from = new Date(), lat = 31.95, lon = 35.91 } = {}) {
  const g = R.GOALS.find((x) => x.id === goalId);
  if (!g) throw new Error("حاجةٌ غير معروفة: " + goalId);
  const planetName = g.planet || namePlanet;
  if (!planetName) throw new Error("خاتمُك العامّ يحتاجُ الاسمَ واسمَ الأمّ في «بطاقتي».");
  const p = BY_PLANET[planetName];
  const time = electTime(planetName, from, lat, lon);
  const wd = birthDate ? weekdayPlanet(birthDate) : null;
  return { goal: g, planet: p, fume: R.FUMES[planetName], time, birthWeekday: wd, namePlanet,
    method: R.RING_METHOD, unfortunate: R.UNFORTUNATE[planetName] };
}

/** عملُ خاتم كوكبٍ بعينه (من «خاتمُك» أو بطاقة الكوكب): الحاجةُ = نفعُ جدوله كلُّه في ك٢ ف٢٢. */
export function workForPlanet(planetName, { birthDate = null, from = new Date(), lat = 31.95, lon = 35.91 } = {}) {
  const p = BY_PLANET[planetName];
  if (!p) throw new Error("كوكبٌ غير معروف: " + planetName);
  const goal = { id: "planet", label: `خاتمُ ${planetName}`, planet: planetName, book: p.table.good };
  return { goal, planet: p, fume: R.FUMES[planetName], time: electTime(planetName, from, lat, lon),
    birthWeekday: birthDate ? weekdayPlanet(birthDate) : null, method: R.RING_METHOD, unfortunate: R.UNFORTUNATE[planetName] };
}

export default { all, planet, hebrewLetters, gematria, checkTable, sigilPath, sigilSVG, weekdayPlanet, yourRing, nextWorkTime, goals, goalForQuestion, checkMoment, electTime, work, workForPlanet };
