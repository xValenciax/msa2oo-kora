# مساءو كورة

ألعاب كورة بين الصحاب على موبايل واحد. Web App (PWA): بيتفتح من أي browser، يتنزل على الموبايل بـ "Add to Home Screen"، وشغال أوفلاين.
مفيش framework ولا npm ولا build. HTML + CSS + JavaScript عادي.

## التشغيل على جهازك

```bash
python3 -m http.server 8000
```

وافتح `http://localhost:8000`. (لازم server، فتح `index.html` بدبل كليك مش هيشتغل عشان الـ modules.)

## الملفات

| الملف | وظيفته |
|---|---|
| `index.html` | الصفحة الوحيدة في الأبليكشن |
| `style.css` | كل الـ styles. الألوان في أول الملف |
| `app.js` | الشاشة الرئيسية و list الألعاب |
| `storage.js` | حفظ وقراءة من ذاكرة الموبايل |
| `games/password/password.js` | لعبة باسورد كاملة |
| `games/password/players.json` | أسامي اللاعيبة |
| `games/risk/risk.js` | لعبة ريسك كاملة |
| `games/risk/questions.json` | أسئلة ريسك (50 كاتيجوري × 20 سؤال) |
| `manifest.json` | اسم الأبليكشن وأيقونته لما يتنزل |
| `sw.js` | بيخلّي الأبليكشن يشتغل أوفلاين |

## إزاي اللعبة متكتبة

كل لعبة عندها object واحد اسمه `state` فيه كل حاجة (التيمات، السكور، الشاشة الحالية).
كل زرار في الـ HTML عليه `data-action="اسم"`، ولما يتداس بيتنفّذ `actions.اسم()` اللي بتغيّر الـ `state`،
وبعدين `render()` بترسم الشاشة اللي في `state.screen` من `screens` وتحفظ الـ state.

يعني عشان تضيف زرار: تكتب `<button data-action="foo">` في الشاشة، وتضيف `foo() { ... }` في `actions`.

## إضافة لاعيبة

افتح `games/password/players.json` وضيف سطر:

```json
{ "name": "اسم اللاعب", "level": 1 }
```

(`level` مش مستخدم دلوقتي، محجوز لفلتر الصعوبة بعدين.)

## إضافة أسئلة ريسك

افتح `games/risk/questions.json`. كل كاتيجوري فيها أسئلة متقسمة على النقط (`"5"`, `"10"`, `"20"`, `"40"`)، وكل ما النقط تزيد السؤال يبقى أصعب. ضيف سطر في المكان المناسب:

```json
{ "q": "السؤال؟", "a": "الإجابة الصح", "wrong": ["غلط 1", "غلط 2", "غلط 3"] }
```

`wrong` هي اللي بتظهر مع الإجابة الصح لما حد يستخدم كارت الاختيارات. عشان تعمل كاتيجوري جديدة انسخ واحدة كاملة وغيّر `name`.

## إضافة لعبة جديدة

1. اعمل فولدر `games/<اسم-اللعبة>/` وجواه ملف JS بيعمل `export default { title, description, start(root, goHome) }`. أسهل حاجة تنسخ `password.js` وتعدّل عليه.
2. في `app.js`: اعمل `import` للعبة وضيفها في `games`.
3. في `sw.js`: ضيف ملفاتها في `FILES` وغيّر `CACHE_VERSION`.

## النشر (مجاني)

**GitHub Pages:** ارفع الفولدر على repo في GitHub ← Settings ← Pages ← Branch: `main` / root ← Save. هتاخد لينك زي `https://USERNAME.github.io/REPO/`.

**مهم في كل تحديث:** غيّر `CACHE_VERSION` في `sw.js` (`v1` ← `v2`)، وإلا الموبايلات اللي نزّلته هتفضل على النسخة القديمة.

## التنزيل على الموبايل

- **أندرويد (Chrome):** افتح اللينك ← ⋮ ← Add to Home screen / Install app.
- **أيفون (Safari):** افتح اللينك ← زرار المشاركة ← Add to Home Screen.
