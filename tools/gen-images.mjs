// tools/gen-images.mjs — يولّدُ صورَ الأرواح من assets/spirits/prompts.json عبر Gemini ويحفظُها في assets/spirits/
// الاستعمال:  GEMINI_API_KEY=... node tools/gen-images.mjs [العدد=3] [الطبقة=core|light|heavy]
//  • المفتاحُ من متغيّر البيئة فقط — لا يُكتَبُ في أيّ ملفّ ولا يُرفَعُ إلى GitHub.
//  • ما وُجدت صورتُه يُتخطّى، فيمكنُ التوليدُ على أيّامٍ متفرّقة.
//  • يتوقّفُ وحدَه عند حدّ الاستعمال المجّانيّ (429).
//  • يُصغِّرُ كلَّ صورةٍ إلى ٥١٢ بكسل (عبر Python/Pillow إن وُجد) ليبقى الموقعُ خفيفًا.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "assets", "spirits");
const KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const N = +(process.argv[2] || 3), TIER = process.argv[3] || "core";   // core (٣٧ أساسيّة) ← light ← heavy
if (!KEY) { console.error("ضعِ المفتاحَ في GEMINI_API_KEY"); process.exit(1); }

const tiers = JSON.parse(fs.readFileSync(path.join(DIR, "prompts.json"), "utf8"));
const list = (tiers[TIER] || []).filter((x) => !fs.existsSync(path.join(DIR, x.file)));
console.log(`متبقٍّ في هذه الطبقة: ${list.length} — سأولّدُ ${Math.min(N, list.length)}`);

for (const item of list.slice(0, N)) {
  const body = { contents: [{ parts: [{ text: item.en + " Square 1:1 image. No text, letters or writing anywhere." }] }], generationConfig: { responseModalities: ["IMAGE"] } };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY }, body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (res.status === 429) { console.log("وصلنا حدَّ الاستعمال المجّانيّ لليوم — أكمِلْ لاحقًا."); break; }
  if (!res.ok) { console.log(`✗ ${item.name}: ${res.status} ${j.error?.message?.slice(0, 160) || ""}`); break; }
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part) { console.log(`✗ ${item.name}: لم تُرجِعْ صورة (${j.candidates?.[0]?.finishReason || "?"})`); continue; }
  const out = path.join(DIR, item.file);
  fs.writeFileSync(out, Buffer.from(part.inlineData.data, "base64"));
  try { execFileSync("python", ["-c", `from PIL import Image;im=Image.open(r"${out}").convert("RGB");im.thumbnail((512,512));im.save(r"${out}",optimize=True)`]); } catch {}
  const usage = j.usageMetadata ? ` · توكنز: ${j.usageMetadata.totalTokenCount}` : "";
  console.log(`✓ ${item.name} ← ${item.file} (${Math.round(fs.statSync(out).size / 1024)} كب)${usage}`);
}
