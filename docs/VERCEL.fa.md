# راهنمای راه‌اندازی روی Vercel

این سایت روی Vercel منتشر می‌شود. Vercel با هر push به شاخه `main` خودش دوباره build و منتشر می‌کند. پس برای تغییر سایت فقط کافی است کامیت و push کنید.

## ۱. اتصال ریپو به Vercel

1. در [vercel.com](https://vercel.com) وارد شوید و **Add New ← Project** را بزنید.
2. ریپوی `Jolly-Panda-Works/web` را انتخاب و **Import** کنید.
3. در تنظیمات import چیزی را عوض نکنید. دستور build و پوشه خروجی از فایل `vercel.json` خوانده می‌شود:
   - Build Command: `node scripts/build-pages.mjs && node scripts/assemble-site.mjs`
   - Output Directory: `_site`
4. **Deploy** را بزنید.

اگر ریپو برای یک سازمان (Organization) در GitHub است و Vercel آن را نشان نمی‌دهد، در GitHub به **Settings ← Applications ← Vercel ← Configure** بروید و دسترسی به همین ریپو را بدهید.

## ۲. ارسال ایمیل با EmailJS

### چرا برنامه ایمیل من باز می‌شود؟

وقتی در سایت هنوز شناسه‌های EmailJS ثبت نشده باشد، فرم برای اینکه درخواست گم نشود، برنامه ایمیل خود بازدیدکننده را باز می‌کند. یعنی فرم کار می‌کند ولی سایت هنوز به EmailJS وصل نشده است. در این حالت هیچ ایمیل خودکاری و هیچ پیش‌قرارداد انگلیسی‌ای ارسال نمی‌شود.

اگر در Console مرورگر (کلید F12) این پیام را ببینید، همین مشکل است: `EmailJS is not configured`.

### راه‌حل (روش پیشنهادی: متغیرهای محیطی Vercel)

**الف) ساخت Service و دو Template در EmailJS** (یک‌بار):

1. در [emailjs.com](https://www.emailjs.com) ثبت‌نام کنید و **Email Services ← Add New Service** را بزنید (مثلاً Gmail یا Outlook). مقدار **Service ID** را یادداشت کنید.
2. در **Email Templates** **سه** Template بسازید. محتوای هرکدام را در ویرایشگر کد (حالت HTML) از فایل‌های پوشه `email-templates/` جایگذاری کنید:
   - `studio-notification.html` ← ایمیلی که به خودتان می‌رسد (همیشه انگلیسی)
   - `customer-confirmation-precontract.html` ← پیش‌قرارداد برای مشتری‌هایی که **سایت انگلیسی** را دیده‌اند (کاملاً انگلیسی، بدون هیچ متن فارسی)
   - `customer-confirmation-precontract.fa.html` ← پیش‌قرارداد **فارسی** برای مشتری‌هایی که **سایت فارسی** را دیده‌اند
3. تنظیمات هر Template (قسمت Settings سمت راست). **در هر دو Template فیلد To Email باید دقیقاً `{{to_email}}` باشد** (سایت خودش آدرس شما را برای Template اول و آدرس مشتری را برای Template دوم می‌فرستد؛ آدرس شما از `CONTACT_EMAIL` یا `contactEmail` در `site.config.json` می‌آید، پیش‌فرض `sales@jollypanda.ir`):

| | Template شما | دو Template مشتری (انگلیسی و فارسی) |
|---|---|---|
| To Email | `{{to_email}}` | `{{to_email}}` |
| From Name | `Jolly Panda Web` | `Jolly Panda Studio` |
| Reply To | `{{email}}` | `{{reply_to}}` |
| Subject | `New website request {{reference}} — {{website_type}} / {{plan_name}}` | انگلیسی: `Your pre-contract {{reference}} — {{website_type}} / {{plan_name}}`<br>فارسی: `پیش‌قرارداد {{reference}} — {{website_type}} / {{plan_name}}` |

4. **Template ID** هر سه و **Public Key** (از Account ← General) را یادداشت کنید.

**ب) ثبت در Vercel:**

در Vercel وارد پروژه شوید: **Settings ← Environment Variables** و این پنج متغیر را بسازید (برای Production و Preview):

| نام | مقدار |
|---|---|
| `EMAILJS_SERVICE_ID` | Service ID |
| `EMAILJS_PUBLIC_KEY` | Public Key |
| `EMAILJS_STUDIO_TEMPLATE_ID` | Template ID ایمیل خودتان |
| `EMAILJS_CONFIRM_TEMPLATE_ID` | Template ID پیش‌قرارداد **انگلیسی** |
| `EMAILJS_CONFIRM_TEMPLATE_ID_FA` | Template ID پیش‌قرارداد **فارسی** |

اختیاری: `CONTACT_EMAIL` (ایمیل دریافت درخواست‌ها، پیش‌فرض `sales@jollypanda.ir`).

> **مهم:** متغیرهای محیطی فقط روی build‌های جدید اثر می‌گذارند. بعد از ذخیره، به **Deployments** بروید، روی آخرین deploy سه‌نقطه را بزنید و **Redeploy** کنید.

(روش جایگزین: همین مقدارها را در فایل `site.config.json` بخش `email` بنویسید، `node scripts/build-pages.mjs` را اجرا و کامیت کنید.)

**ج) محدود کردن دامنه در EmailJS:** در EmailJS به **Account ← Security** بروید و دامنه سایت را به‌عنوان دامنه مجاز ثبت کنید. Public Key داخل سایت دیده می‌شود و این کار جلوی استفاده دیگران را می‌گیرد.

> اگر `EMAILJS_CONFIRM_TEMPLATE_ID_FA` را نگذارید، مشتری‌های سایت فارسی هم پیش‌قرارداد انگلیسی می‌گیرند (در Console هشدار می‌دهد).

### امضای هم‌بنیان‌گذار
بلوک امضای استودیو در پیش‌قرارداد، نام **Usef Farahmand** با سمت **Co-founder**، تاریخ همان روز درخواست و تصویر امضا را نشان می‌دهد. تصویر امضا باید فایل `assets/signature/usef-farahmand.png` باشد (PNG با پس‌زمینه شفاف، جوهر تیره، حدود ۶۰۰×۲۰۰ پیکسل). کلاینت‌های ایمیل فقط تصویری را نشان می‌دهند که لینک عمومی داشته باشد، پس فایل از خود سایت سرو می‌شود؛ یعنی هر کس آدرس آن را بداند می‌تواند آن را دانلود کند. تا وقتی فایل نباشد، فقط نام، سمت و تاریخ نمایش داده می‌شود. برای درست‌بودن آدرس تصویر، `SITE_URL` باید دامنه نهایی باشد.

### تست
سایت را باز کنید (بهتر است با Ctrl+F5)، یک پکیج انتخاب و فرم را پر کنید. باید پیام «درخواست ارسال شد» ببینید و دو ایمیل برسد: یکی برای شما، یکی برای مشتری (پوشه Spam را هم نگاه کنید).

### اگر هنوز ایمیل نمی‌رسد

| نشانه | علت و راه‌حل |
|---|---|
| هنوز برنامه ایمیل باز می‌شود | متغیرها ثبت نشده یا بعد از ثبت Redeploy نکرده‌اید. در مرورگر آدرس `/js/config.js` سایت را باز کنید؛ اگر `YOUR_` می‌بینید، مقدارها هنوز به سایت نرسیده‌اند. |
| پیام «ارسال درخواست انجام نشد» | در Console مرورگر (F12) متن خطا را ببینید. |
| خطای 403 | دامنه سایت در Security پنل EmailJS ثبت نشده یا اشتباه است. |
| خطای 400 با «The Public Key is invalid» یا Template not found | شناسه‌ها اشتباه کپی شده‌اند. |
| خطای 412 یا مشکل احراز هویت Gmail | اتصال Service منقضی شده؛ در EmailJS دوباره Service را وصل (Reconnect) کنید. |
| تصویر امضا در ایمیل دیده نمی‌شود | فایل `assets/signature/usef-farahmand.png` را در ریپو نگذاشته‌اید، یا `SITE_URL` درست نیست. آدرس `/assets/signature/usef-farahmand.png` را روی سایت خودتان باز کنید؛ باید تصویر را ببینید. |
| ایمیل شما می‌رسد ولی مشتری نه | در Template مشتری، فیلد **To Email** باید دقیقاً `{{to_email}}` باشد. |
| خطای **422: The recipients address is corrupted** | فیلد **To Email** در Template خالی است یا درست نوشته نشده (فاصله اضافه، اسم متغیر اشتباه مثل `{{to_mail}}`، یا آدرس ناقص). در EmailJS ← Email Templates ← همان Template ← Settings، مقدار To Email را روی `{{to_email}}` بگذارید و Save کنید. شناسه Template ناقص در پیام خطای Console نوشته شده تا بفهمید کدام Template است. |
| از ایران بدون فیلترشکن کار نمی‌کند | ارسال از مرورگر بازدیدکننده به `api.emailjs.com` انجام می‌شود؛ اگر برای بعضی کاربران در دسترس نیست، فرم پیام «مستقیم ایمیل بزنید» را نشان می‌دهد. |

## ۳. دامنه اختصاصی

1. در Vercel: **Settings ← Domains ← Add** و دامنه (مثلاً `web.jollypanda.ir`) را وارد کنید.
2. Vercel رکورد DNS لازم را نشان می‌دهد؛ برای زیردامنه معمولاً یک رکورد CNAME است. همان را در پنل DNS دامنه بسازید.
3. در Environment Variables مقدار `SITE_URL` را دقیقاً برابر آدرس نهایی بگذارید (مثلاً `https://web.jollypanda.ir`) و Redeploy کنید. این مقدار در canonical، sitemap و hreflang استفاده می‌شود.

## ۴. نرخ دلار (به‌صورت خودکار)

نرخ توسط GitHub Action گرفته می‌شود و در `data/rate.json` کامیت می‌شود؛ همین کامیت باعث می‌شود Vercel خودکار سایت را با قیمت جدید منتشر کند.

1. در GitHub: **Settings ← Secrets and variables ← Actions ← New repository secret** با نام `NAVASAN_API_KEY` و مقدار کلید API نوسان.
2. **Settings ← Actions ← General ← Workflow permissions** را روی **Read and write permissions** بگذارید (برای اینکه Action بتواند فایل نرخ را کامیت کند).
3. تب **Actions ← Update USD rate ← Run workflow** را یک‌بار دستی اجرا کنید.

بعد از آن هر روز ساعت ۰۸:۰۰ به وقت تهران نرخ گرفته می‌شود؛ اگر خطا بدهد ساعت ۲۰:۰۰ همان روز دوباره تلاش می‌کند.

## ۵. ویرایش‌های روزمره

| می‌خواهید تغییر دهید | فایل |
|---|---|
| قیمت‌ها، درصد تخفیف، متن پلن‌ها | `data/plans.json` (`discountPercent` تخفیف همه؛ برای بعضی‌ها فیلد `discount` را کنار پلن، نوع سایت یا یک خانه بگذارید — توضیح در `docs/SETUP.fa.md`) |
| نمونه‌کارها | `data/projects.json` (تصویر در `assets/projects/<نام>/`، مسیرش در `image` و گالری در `gallery`) |
| متن صفحه‌ها | `lang/fa.json` و `lang/en.json` |

بعد از تغییر، کامیت و push کنید؛ Vercel خودش build می‌گیرد. صفحه‌های HTML موقع build ساخته می‌شوند و نیازی به اجرای دستی نیست، ولی اگر می‌خواهید نتیجه را قبل از push ببینید: `node scripts/build-pages.mjs && node scripts/serve.mjs`.
