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

### راه‌حل (با یک Template و متغیرهای محیطی Vercel)

**الف) ساخت Service و یک Template در EmailJS** (یک‌بار):

> پلن رایگان EmailJS فقط دو Template اجازه می‌دهد. سایت طوری ساخته شده که **فقط یک Template** لازم دارد: متن کامل هر سه ایمیل (ایمیل استودیو، پیش‌قرارداد انگلیسی، پیش‌قرارداد فارسی) داخل خود سایت آماده می‌شود و فقط به‌عنوان یک متغیر برای EmailJS فرستاده می‌شود.

1. در [emailjs.com](https://www.emailjs.com) ثبت‌نام کنید و **Email Services ← Add New Service** را بزنید (مثلاً Gmail یا Outlook). مقدار **Service ID** را یادداشت کنید.
2. در **Email Templates ← Create New Template** یک Template بسازید و تنظیمات سمت راست (Settings) را دقیقاً این‌طور پر کنید:

| فیلد | مقدار |
|---|---|
| To Email | `{{to_email}}` |
| From Name | `{{{from_name}}}` |
| Reply To | `{{reply_to}}` |
| Subject | `{{{subject}}}` |

3. بدنه ایمیل (Content) را روی **Code Editor** (حالت HTML) بگذارید، همه چیز را پاک کنید و فقط همین یک خط را بنویسید. **سه‌تایی بودن آکولادها مهم است**؛ با دوتایی، کدهای HTML به‌صورت متن خام نمایش داده می‌شود:

```
{{{message_html}}}
```

4. Save کنید و **Template ID** و **Public Key** (از Account ← General) را یادداشت کنید.

**ب) ثبت در Vercel:**

در Vercel وارد پروژه شوید: **Settings ← Environment Variables** و این سه متغیر را بسازید (برای Production و Preview):

| نام | مقدار |
|---|---|
| `EMAILJS_SERVICE_ID` | Service ID |
| `EMAILJS_PUBLIC_KEY` | Public Key |
| `EMAILJS_TEMPLATE_ID` | Template ID |

اختیاری: `CONTACT_EMAIL` = آدرسی که درخواست‌ها به آن می‌رسد. اگر نگذارید، پیش‌فرض `sales@jollypanda.ir` است. فقط اگر می‌خواهید به آدرس دیگری برسد (یا چند گیرنده، با کاما جدا) آن را بگذارید.

> **مهم:** متغیرهای محیطی فقط روی build‌های جدید اثر می‌گذارند. بعد از ذخیره، به **Deployments** بروید، روی آخرین deploy سه‌نقطه را بزنید و **Redeploy** کنید.

سایت دو ایمیل می‌فرستد: یکی به `CONTACT_EMAIL` (درخواست کامل) و یکی به مشتری (پیش‌قرارداد، فارسی برای سایت فارسی و انگلیسی برای سایت انگلیسی). Template شما همان یک Template است و **Template دومِ رایگان خالی می‌ماند**.

**روش قدیمی (اختیاری):** اگر `EMAILJS_TEMPLATE_ID` را نگذارید و به‌جای آن `EMAILJS_STUDIO_TEMPLATE_ID` و `EMAILJS_CONFIRM_TEMPLATE_ID` (و برای فارسی `EMAILJS_CONFIRM_TEMPLATE_ID_FA`) را بگذارید، سایت با Templateهای جدا کار می‌کند؛ محتوای HTML آن‌ها در پوشه `email-templates/` است و در هر کدام To Email باید `{{to_email}}` باشد. این روش به سه Template نیاز دارد (روی پلن رایگان فقط دو تا ممکن است).

### امضای هم‌بنیان‌گذار
بلوک امضای استودیو در پیش‌قرارداد، نام **Usef Farahmand** با سمت **Co-founder**، تاریخ همان روز درخواست و تصویر امضا را نشان می‌دهد. تصویر امضا در `assets/signature/usef-farahmand.png` است. کلاینت‌های ایمیل فقط تصویری را نشان می‌دهند که لینک عمومی داشته باشد، پس فایل از خود سایت سرو می‌شود؛ یعنی هر کس آدرس آن را بداند می‌تواند آن را دانلود کند. برای درست‌بودن آدرس تصویر، `SITE_URL` باید دامنه نهایی باشد.

**ج) محدود کردن دامنه در EmailJS:** در EmailJS به **Account ← Security** بروید و دامنه سایت را به‌عنوان دامنه مجاز ثبت کنید. Public Key داخل سایت دیده می‌شود و این کار جلوی استفاده دیگران را می‌گیرد.

### تست
سایت را باز کنید (بهتر است با Ctrl+F5)، یک پکیج انتخاب و فرم را پر کنید. باید پیام «درخواست ارسال شد» ببینید و دو ایمیل برسد: یکی برای شما، یکی برای مشتری (پوشه Spam را هم نگاه کنید).

### اگر هنوز ایمیل نمی‌رسد

| نشانه | علت و راه‌حل |
|---|---|
| هنوز برنامه ایمیل باز می‌شود | متغیرها ثبت نشده یا بعد از ثبت Redeploy نکرده‌اید. در مرورگر آدرس `/js/config.js` سایت را باز کنید؛ اگر `YOUR_` می‌بینید، مقدارها هنوز به سایت نرسیده‌اند. |
| پیام «ارسال درخواست انجام نشد» | در Console مرورگر (F12) متن خطا را ببینید. |
| در Console پیام `No Persian pre-contract template configured` یا `confirmation failed` می‌بینید | هنوز «روش قدیمی» (Templateهای جدا) فعال است، چون `EMAILJS_TEMPLATE_ID` در Vercel ثبت نشده یا بعد از ثبت Redeploy نکرده‌اید. با روش یک‌Template این پیام‌ها دیگر نمی‌آیند. |
| `400: The template ID not found` | شناسه Template در Vercel (مثلاً `EMAILJS_CONFIRM_TEMPLATE_ID`) در حساب EmailJS شما وجود ندارد؛ احتمالاً Template را حذف کرده‌اید. `EMAILJS_TEMPLATE_ID` را با شناسه Template فعلی بگذارید و متغیرهای قدیمی را پاک کنید. |
| `ERR_TIMED_OUT` / `Failed to fetch` به `api.emailjs.com` | اینترنت شما نمی‌تواند به EmailJS برسد (قطع و وصل شدن یا فیلتر). سایت هر درخواست را ۱۵ ثانیه صبر می‌کند و یک بار دوباره امتحان می‌کند و در صورت شکست پیام «اتصال به سرویس ایمیل برقرار نشد» و آدرس ایمیل مستقیم را نشان می‌دهد. اگر برای مشتری‌های ایرانی هم همین اتفاق می‌افتد، با یک VPN یا اینترنت دیگر امتحان کنید تا مطمئن شوید مشکل از مسیر شبکه است، نه تنظیمات. |
| خطای 403 | دامنه سایت در Security پنل EmailJS ثبت نشده یا اشتباه است. |
| خطای 400 با «The Public Key is invalid» یا Template not found | شناسه‌ها اشتباه کپی شده‌اند. |
| خطای 412 یا مشکل احراز هویت Gmail | اتصال Service منقضی شده؛ در EmailJS دوباره Service را وصل (Reconnect) کنید. |
| تصویر امضا در ایمیل دیده نمی‌شود | فایل `assets/signature/usef-farahmand.png` را در ریپو نگذاشته‌اید، یا `SITE_URL` درست نیست. آدرس `/assets/signature/usef-farahmand.png` را روی سایت خودتان باز کنید؛ باید تصویر را ببینید. |
| ایمیل شما می‌رسد ولی مشتری نه | فیلد **To Email** در Template باید دقیقاً `{{to_email}}` باشد (برای هر دو ایمیل از همان یک Template استفاده می‌شود). |
| خطای **422: The recipients address is corrupted** | فیلد **To Email** در Template خالی است یا درست نوشته نشده (فاصله اضافه، اسم متغیر اشتباه مثل `{{to_mail}}`، یا آدرس ناقص). در EmailJS ← Email Templates ← همان Template ← Settings، مقدار To Email را روی `{{to_email}}` بگذارید و Save کنید. شناسه Template ناقص در پیام خطای Console نوشته شده. |
| ایمیل می‌رسد ولی به‌جای متن زیبا، کدهای `<table ...>` دیده می‌شود | در بدنه Template به‌جای `{{{message_html}}}` (سه‌تایی) از `{{message_html}}` (دوتایی) استفاده شده. |
| ایمیل می‌رسد ولی بدنه‌اش خالی است | بدنه Template باید دقیقاً `{{{message_html}}}` باشد؛ نام متغیر را درست بنویسید (حروف کوچک، با underscore). |
| موضوع (Subject) ایمیل خالی یا `{{subject}}` است | در Template فیلد Subject باید `{{{subject}}}` باشد (سه‌تایی). |
| در موضوع ایمیل کدهایی مثل `&#x2F;` می‌بینید | فیلد Subject دوتایی است و EmailJS نویسه‌هایی مثل `/` را امن‌سازی می‌کند. Subject را روی `{{{subject}}}` (سه‌تایی) بگذارید؛ From Name را هم روی `{{{from_name}}}`. سایت دیگر در موضوع از `/` استفاده نمی‌کند. |
| ایمیل به مشتری می‌رسد ولی ایمیل درخواست (مال استودیو) نه | ایمیل درخواست به `CONTACT_EMAIL` می‌رود (پیش‌فرض `sales@jollypanda.ir`). پوشه Spam آن صندوق را نگاه کنید و مطمئن شوید آدرس درست است. اگر می‌خواهید به آدرس دیگری برسد، در Vercel متغیر `CONTACT_EMAIL` را روی ایمیل واقعی خودتان بگذارید (برای چند گیرنده با کاما جدا کنید: `a@x.com,b@y.com`) و Redeploy کنید. پوشه Spam را هم نگاه کنید. در Console مرورگر پیام `sending the request notification to ...` آدرس مقصد را نشان می‌دهد. توجه: پاسخ مشتری هم به همین آدرس می‌رود. |
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
