# حفظ إجابات «صار / ما صار» على GitHub (مجاني)

كيف بتشتغل:
- **الموقع** ← بيبعث الإجابة (بدون اسم، بس بصمة مشفّرة للشخص) لـ **Google Apps Script**.
- **Apps Script** ← بيكتبها سطر بـ Google Sheet.
- مرة باليوم، Apps Script بيبعث إجابات اليوم كلها لمستودع **GitHub خاص** بملف واحد.
- **GitHub Actions** ← مرة باليوم بيحسب من الإجابات أوزان جديدة وبيحفظها بالموقع لحاله.

ما في ولا قرش: Apps Script وGoogle Sheets وGitHub وGitHub Actions مجانيين (بيستهلك أقل من ١ دقيقة باليوم من ٢٠٠٠ دقيقة مجانية بالشهر)، وما في بطاقة ولا خطة مدفوعة.

---

## ١. مستودع الإجابات (GitHub)
1. على github.com: **New repository**، الاسم `shams-feedback`، واختار **Private**، وعلّم على **Add a README**، وبعدها **Create**.
2. بـ GitHub Desktop: **File → Clone repository** ← `shams-feedback`، وحطه **بنفس المجلد اللي فيه مجلد `Shams`** (يعني `Desktop\shams-feedback`).

## ٢. المفتاح (GitHub token)
1. github.com ← صورتك ← **Settings** ← **Developer settings** ← **Personal access tokens** ← **Fine-grained tokens** ← **Generate new token**.
2. Token name: `shams-feedback`. Expiration: سنة (بعدها بتعمل واحد جديد بنفس الطريقة).
3. **Repository access** ← **Only select repositories** ← اختار `shams-feedback` بس.
4. **Permissions** ← **Repository permissions** ← **Contents** ← **Read and write**. وما تغيّر غيرها.
5. **Generate token** وانسخه. ما تبعته لحدا، ولا لإلي كمان. بس بتلصقه بالخطوة ٣.

## ٣. Google Sheet + Apps Script
1. افتح sheets.google.com ← **Blank spreadsheet**، وسمّيه `Shams feedback`.
2. من القائمة: **Extensions → Apps Script**.
3. امسح الكود اللي هناك، والصق محتوى ملف `apps-script/Code.gs` كامل، واكبس 💾 حفظ.
4. على اليسار ⚙️ **Project Settings** ← تحت **Script Properties** ← **Add script property**، وضيف ٣:
   - `GITHUB_TOKEN` = المفتاح اللي نسخته
   - `GH_OWNER` = `Mneizel`
   - `GH_REPO` = `shams-feedback`
5. ارجع للكود (‹› Editor)، ومن القائمة فوق اختار الدالة `setupDailyTrigger` واكبس **Run**.
   بيطلب صلاحيات: **Review permissions** ← حسابك ← **Advanced** ← **Go to … (unsafe)** ← **Allow**.
   (كلمة «unsafe» بتطلع لأنه السكربت إلك وما راجعته Google. هو سكربتك إنت.)
6. **Deploy → New deployment** ← ⚙️ ← **Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - **Deploy**، وانسخ **Web app URL** (بيخلص بـ `/exec`).

## ٤. الموقع
1. افتح `web/feedback-config.js` وحط العنوان:
   `export const FEEDBACK_URL = "https://script.google.com/macros/s/....../exec";`
2. اعمل push من GitHub Desktop كالعادة.

## ٥. التجربة
- افتح الموقع ← العارف بالأمر ← شهر ماضي ← اكبس «صار». لازم يطلع سطر بالـ Sheet خلال ثواني.
- عشان تجرّب الإرسال لـ GitHub فورًا بدون ما تستنى لليوم الثاني: بـ Apps Script اختار `pushToGitHub` واكبس **Run**. لازم يطلع ملف بـ `shams-feedback/feedback/`.

## ٦. التعلّم الأوتوماتيكي (GitHub Actions)
الموقع بيتعلم لحاله كل يوم الساعة ٤:٣٠ غرينتش (٧:٣٠ الصبح بتوقيت عمّان): بيقرأ الإجابات، بيحسب الأوزان، وبيحفظها جوّا الموقع.
بس بدّو مفتاح ثاني صلاحيته **قراءة بس**:

1. github.com ← Settings ← Developer settings ← Personal access tokens ← **Fine-grained tokens** ← Generate new token.
2. Name: `shams-learner-read`. Repository access ← Only select repositories ← `shams-feedback`.
3. Permissions ← **Contents** ← **Read-only** (مش Read and write). Generate وانسخه.
4. روح على مستودع الموقع **Mneizel/Shams** ← **Settings** ← **Secrets and variables** ← **Actions** ← **New repository secret**:
   - Name: `FEEDBACK_READ_TOKEN`
   - Secret: المفتاح اللي نسخته ← **Add secret**.
5. للتجربة: بمستودع الموقع ← تبويب **Actions** ← `learn-from-feedback` ← **Run workflow**. لازم يخلص بعلامة ✓ خضرا.

ملاحظة: لأنه GitHub صار يحفظ التعلّم بمستودع الموقع، بـ GitHub Desktop اعمل **Fetch / Pull** قبل ما تعمل push لتعديلاتك.

العائلة (مثلًا «مرور الكواكب» أو «الرمل والجفر») ما بيتغيّر وزنها إلا بعد ٢٠ إجابة على الأقل من كل الناس. وإجابات الشخص نفسه (٣ أو أكثر) بتغلب الوزن العام.

التشغيل اليدوي على جهازك لسا ممكن: `node tools/build-feedback.js` (بيلاقي `Desktop\shams-feedback` لحاله).

## الأمان
- المفتاح بس بـ Script Properties عند Google، مش بكود الموقع ولا بأي متصفح.
- مفتاح Apps Script صلاحيته بس على مستودع `shams-feedback`، ومفتاح Actions بيقرأ بس. ولا واحد منهم بيقدر يلمس مستودع الموقع بشي غير اللي محدد.
- السكربت بيقبل بس إجابات بالشكل الصح وحجم صغير، وبيرمي أي حقل غريب (أسماء، تواريخ ميلاد…).
