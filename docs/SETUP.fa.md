# راهنمای راه‌اندازی (فارسی)

## ۱. فعال‌کردن GitHub Pages
در ریپو: **Settings ← Pages ← Source** را روی **GitHub Actions** بگذارید.

## ۲. کلید API نرخ دلار (نوسان)
**Settings ← Secrets and variables ← Actions ← New repository secret**
- نام: `NAVASAN_API_KEY`
- مقدار: کلید API شما از [navasan.tech](https://www.navasan.tech/webserviceguide/)

اختیاری (در بخش *Variables*):
- `NAVASAN_ITEM` — نوع نرخ؛ پیش‌فرض `usd_sell` (دلار تهران فروش). نمونه‌های دیگر: `usd_buy`، `harat_naghdi_sell`، `mex_usd_sell`
- `NAVASAN_UNIT` — واحدی که API برمی‌گرداند؛ پیش‌فرض `rial` (مبلغ همان‌طور که هست به‌عنوان ریال استفاده می‌شود). فقط اگر خروجی تومان بود مقدار `toman` بگذارید تا ×۱۰ شود.

> نکته: بعد از اولین اجرا، عدد `data/rate.json` را با نرخ بازار مقایسه کنید.

## ۳. ایمیل (EmailJS)
مراحل کامل در [`email-templates/README.md`](../email-templates/README.md) آمده است. خلاصه:
1. در emailjs.com یک Service بسازید (Gmail/Outlook/SMTP).
2. دو Template بسازید و محتوای دو فایل HTML داخل پوشه `email-templates` را در ویرایشگر کد جایگذاری کنید:
   - `studio-notification.html` ← برای ایمیل خودتان (درخواست کامل)
   - `customer-confirmation-precontract.html` ← برای مشتری (تأییدیه + **پیش‌قرارداد انگلیسی**)
3. `serviceId`، `publicKey` و دو `templateId` را در `site.config.json` بخش `email` بنویسید.
4. در EmailJS بخش Security دامنه سایتتان را به‌عنوان دامنه مجاز تنظیم کنید.

تا زمانی که EmailJS تنظیم نشده باشد، فرم به‌جای ارسال خودکار، برنامه ایمیل بازدیدکننده را با متن آماده باز می‌کند (در این حالت پیش‌قرارداد ارسال نمی‌شود).

## ۴. تنظیمات سایت
در `site.config.json`:
- `siteUrl` — آدرس نهایی سایت (پیش‌فرض: `https://jolly-panda-works.github.io/web`؛ اگر دامنه اختصاصی وصل کردید، همان را بنویسید)
- `contactEmail` — ایمیل دریافت درخواست‌ها (پیش‌فرض `sales@jollypanda.ir`)

سپس:
```bash
node scripts/build-pages.mjs
git add -A && git commit -m "chore: configure site" && git push
```

## ۵. اولین اجرا
تب **Actions ← Update USD rate & deploy ← Run workflow** (اجرای دستی همیشه API را صدا می‌زند).

از آن به بعد خودکار اجرا می‌شود:
- **هر روز ساعت ۰۸:۰۰ به وقت تهران** نرخ از API گرفته می‌شود.
- اگر خطا داد، **۱۲ ساعت بعد (۲۰:۰۰ همان روز)** دوباره تلاش می‌کند. اگر صبح موفق بوده باشد، اجرای شب API را صدا نمی‌زند.
- اگر هر دو بار خطا بدهد، آخرین نرخ سالم روی سایت می‌ماند و تاریخ «آخرین بروزرسانی» همان تاریخ قدیمی را نشان می‌دهد.

## ویرایش‌های روزمره
- **قیمت‌ها و متن پلن‌ها:** `data/plans.json`
- **نمونه‌کارها:** `data/projects.json` (تصاویر در `assets/projects/<نام‌پروژه>/` و مسیرشان در فیلد `image`)
- **متن صفحه‌ها:** `lang/fa.json` و `lang/en.json` سپس `node scripts/build-pages.mjs`
