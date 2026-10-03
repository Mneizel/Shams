// data/hal-traits.data.js — «اللغةُ المشتركة» لقراءةِ الحال: قائمةُ صفاتٍ موحّدة.
// كلُّ كتابٍ (Lilly، ابن سينا، شمس المعارف، بطليموس…) تُترجَمُ شهادتُه إلى هذه المعرِّفات نفسِها، فيمكنُ
// للمحرّكِ أن يرى أين تتّفقُ الكتبُ وأين تختلف. لكلِّ صفةٍ جملةٌ فصحى بصيغةِ المخاطَب، وضدُّها (opp) إن وُجد:
// فإن شهدت أدلّةٌ للصفةِ وأدلّةٌ لضدّها قيل «أحيانًا… وأحيانًا…» بدلَ اختيارِ أحدِهما وإهمالِ الآخر.
// group: باب الصفة في القراءة. الصياغةُ بصيغةِ الميل («تميلُ إلى…») لأنّ الكتبَ نفسَها تتكلّمُ في «الاستعداد».

export const TRAIT_GROUPS = {
  temper: "طبعُك وانفعالاتُك",
  mind: "عقلُك وتفكيرُك",
  social: "معاملتُك للناس",
  inner: "ما يعتملُ في داخلك",
  work: "عملُك وهمّتُك",
  body: "بدنُك ونومُك",
};

export const TRAITS = {
  // ── الطبع والانفعال ──
  anger_quick:   { group: "temper", ar: "سريعُ الغضبِ حادُّ الانفعال، يثورُ غضبُك بسرعة", opp: "anger_slow" },
  anger_slow:    { group: "temper", ar: "بطيءُ الغضب، قليلُ الانفعالِ بما يجري حولك", opp: "anger_quick" },
  grudge_long:   { group: "temper", ar: "إذا غضبتَ أو جُرِحتَ بقي ذلك في نفسك طويلًا، وقلّما تنسى الإساءة", opp: "grudge_short" },
  grudge_short:  { group: "temper", ar: "تغضبُ أو تحزنُ ثمّ يزولُ ذلك عنك سريعًا، ولا تحملُ في قلبك طويلًا", opp: "grudge_long" },
  irritable:     { group: "temper", ar: "تضجرُ سريعًا من الإبطاءِ والتكرارِ وممّا يعطّلُك" },
  quarrelsome:   { group: "temper", ar: "تميلُ إلى الجدالِ والمخاصمة، ولا تسكتُ عمّا تراه خطأً" },
  bold:          { group: "temper", ar: "جريءٌ مقدام، لا تهابُ المواجهة", opp: "timid" },
  timid:         { group: "temper", ar: "يغلبُ عليك الحذرُ والتهيّب، وتحسبُ للعواقبِ حسابًا كثيرًا", opp: "bold" },
  rash:          { group: "temper", ar: "تندفعُ بتهوّر، وتُقحمُ نفسَك في متاعبَ كان يمكنُ تجنّبُها" },
  revengeful:    { group: "temper", ar: "لا تحتملُ الإهانةَ ولا الظلم، وتميلُ إلى ردِّ الإساءةِ بمثلِها" },
  // ── العقل والتفكير ──
  clever:        { group: "mind", ar: "سريعُ الفطنةِ والفهم، تلتقطُ المعنى قبل أن يكتمل", opp: "slow_mind" },
  slow_mind:     { group: "mind", ar: "تحتاجُ وقتًا لتهضمَ الأمورَ وتفهمَها", opp: "clever" },
  deep_thinker:  { group: "mind", ar: "تميلُ إلى التأمّلِ في الأمورِ العميقة، ولا تكتفي بظاهرِها" },
  changes_opinion:{ group: "mind", ar: "يتبدّلُ رأيُك سريعًا، وقد تعودُ عمّا قرّرتَه", opp: "firm_opinion" },
  firm_opinion:  { group: "mind", ar: "إذا قرّرتَ أمرًا ثبتَّ عليه، وقلّما تعودُ عن رأيك", opp: "changes_opinion" },
  slow_decide:   { group: "mind", ar: "بطيءُ الحسم، تقلّبُ الأمرَ طويلًا قبل أن تقرّر" },
  learner:       { group: "mind", ar: "محبٌّ للعلمِ والتعلّم، شغوفٌ بمعرفةِ ما خفي" },
  eloquent:      { group: "mind", ar: "حسنُ الكلامِ والتعبير" },
  // ── معاملة الناس ──
  affable:       { group: "social", ar: "لطيفُ المعشر، سهلُ القرب، يرتاحُ إليك الناس" },
  generous:      { group: "social", ar: "كريمٌ سخيّ، لا يشقُّ عليك العطاء", opp: "covetous" },
  covetous:      { group: "social", ar: "حريصٌ على المال، شديدُ التدبيرِ والإمساك", opp: "generous" },
  secretive:     { group: "social", ar: "كتومٌ تحفظُ أسرارَك ولا تُطلعُ عليها أحدًا بسهولة", opp: "open" },
  open:          { group: "social", ar: "منفتحُ القلب، تُظهرُ ما في نفسك ولا تُخفيه", opp: "secretive" },
  suspicious:    { group: "social", ar: "تكثرُ ريبتُك في الناس، ولا تمنحُ ثقتَك بسهولة", opp: "trusting" },
  trusting:      { group: "social", ar: "حسنُ الظنّ بالناس، تثقُ بسهولة", opp: "suspicious" },
  peacemaker:    { group: "social", ar: "تحبُّ الصلحَ وتسعى إليه بين الناس" },
  faithful:      { group: "social", ar: "وفيٌّ لمن تحبّ" },
  proud:         { group: "social", ar: "تعتزُّ برأيك ونفسك، ويصعبُ عليك أن تُقادَ لغيرك" },
  solitary:      { group: "social", ar: "تميلُ إلى العزلةِ والانفراد، وترتاحُ بعيدًا عن الزحام" },
  // ── ما في الداخل ──
  cheerful:      { group: "inner", ar: "بشوشٌ مرِح، تحبُّ البهجةَ وأسبابَها", opp: "sorrowful" },
  sorrowful:     { group: "inner", ar: "يعتريك الحزنُ والضيقُ من غيرِ سببٍ ظاهر", opp: "cheerful" },
  fearful:       { group: "inner", ar: "تعتريك مخاوفُ وهواجسُ مما قد يأتي" },
  hopeful:       { group: "inner", ar: "قويُّ الرجاء، تتوقّعُ الخيرَ وتأملُ فيه", opp: "low_hope" },
  low_hope:      { group: "inner", ar: "يضعفُ رجاؤك، وتتوقّعُ الأسوأ", opp: "hopeful" },
  low_self:      { group: "inner", ar: "قد تُقلِّلُ من شأنِ نفسك أكثرَ ممّا تستحقّ" },
  complaining:   { group: "inner", ar: "تكثرُ شكواك ممّا يضايقُك" },
  restless:      { group: "inner", ar: "لا تستقرُّ على حالٍ طويلًا، ويضيقُ صدرُك بالرتابة" },
  // ── العمل والهمّة ──
  energetic:     { group: "work", ar: "نشيطٌ قليلُ الكسل، لا تقعدُ عن العمل", opp: "lazy" },
  lazy:          { group: "work", ar: "يغلبُ عليك الفتور، ويثقلُ عليك البدءُ بالعمل", opp: "energetic" },
  ambitious:     { group: "work", ar: "طموحٌ، تحبُّ أن تعلوَ وأن يكونَ لك الأمرُ والكلمة" },
  hardworking:   { group: "work", ar: "صبورٌ على العملِ الشاقّ، طويلُ النَّفَس فيه" },
  patient:       { group: "work", ar: "صبورٌ تتحمّلُ ما يشقُّ على غيرك" },
  leader:        { group: "work", ar: "فيك استعدادٌ للقيادةِ وتولّي الأمور" },
  starts_not_finish:{ group: "work", ar: "تبدأُ الأمورَ بحماسة، ثمّ يصعبُ عليك إتمامُها" },
  // ── البدن والنوم ──
  sleep_little:  { group: "body", ar: "قليلُ النوم، يغلبُ عليك السهر", opp: "sleep_much" },
  sleep_much:    { group: "body", ar: "يغلبُ عليك النومُ والرغبةُ فيه", opp: "sleep_little" },
  loud_fast:     { group: "body", ar: "قويُّ الصوت، سريعُ الكلامِ والحركة" },
  dreams_fire:   { group: "body", ar: "قد ترى في منامِك نيرانًا أو شمسًا أو حرًّا", opp: "dreams_water" },
  dreams_water:  { group: "body", ar: "قد ترى في منامِك ماءً أو ثلجًا أو بردًا", opp: "dreams_fire" },
};
