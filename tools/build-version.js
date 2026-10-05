// tools/build-version.js — نسخةُ حسابات المحرّك = بصمةٌ من ملفّات engines/ و data/ (عدا ما يولّدُه التعلّم).
// أيُّ تعديلٍ في الحسابات يغيّرُها وحدَها، فتُفصَلُ الإجاباتُ على حساباتٍ قديمةٍ عن الجديدة.
// الاستعمال: node tools/build-version.js   (يُشغَّلُ تلقائيًّا من build-standalone، والاختبارُ يفشلُ إن نُسي)
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["feedback-learned.data.js", "engine-version.data.js"]);
export function engineHash() {
  const h = crypto.createHash("sha256");
  for (const dir of ["engines", "data"]) {
    for (const f of fs.readdirSync(path.join(ROOT, dir)).filter((x) => x.endsWith(".js") && !SKIP.has(x)).sort()) {
      h.update(dir + "/" + f + "\n");
      h.update(fs.readFileSync(path.join(ROOT, dir, f), "utf8").replace(/\r\n/g, "\n"));
    }
  }
  return h.digest("hex").slice(0, 10);
}
const OUT = path.join(ROOT, "data", "engine-version.data.js");
export function writeVersion() {
  const v = engineHash();
  const body = `// data/engine-version.data.js — يُولَّدُ آليًّا (node tools/build-version.js). لا تعدّلْه يدويًّا.\n// بصمةُ ملفّات المحرّك: تتغيّرُ وحدَها مع أيّ تعديلٍ في الحسابات.\nexport const ENGINE_VER = "${v}";\n`;
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
  if (prev !== body) fs.writeFileSync(OUT, body);
  return v;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log("نسخةُ المحرّك:", writeVersion());
