# راهنمای دیده‌شدن سایت (SEO، AEO، GEO)

آدرس سایت: `https://web.jollypanda.ir`

## آنچه در خود سایت انجام شده است
- **محتوا داخل HTML است.** قیمت‌ها، پلن‌ها، تخفیف، تاریخ بروزرسانی، فهرست نمونه‌کارها و محتوای هر پروژه هنگام build در HTML نوشته می‌شوند، پس ربات‌هایی که جاوااسکریپت اجرا نمی‌کنند هم همه را می‌بینند.
- **برای هر نوع سایت یک صفحه جدا** (۶ صفحه × ۲ زبان) با تیتر و توضیح یکتا، سه پلن با قیمت، زمان تحویل، پنج سؤال و جواب (که از روی قیمت‌ها و پلن‌ها خودکار ساخته می‌شود و هیچ‌وقت کهنه نمی‌شود) و لینک به نوع‌های دیگر:
  `/services/blog-website-design.html`، `portfolio-website-design`، `corporate-website-design`، `educational-website-design`، `news-website-design`، `online-store-design` (و نسخه فارسی زیر `/fa/`).
- **برای هر نمونه‌کار یک صفحه ثابت و قابل ایندکس:** `/projects/<شناسه>.html`.
- **نشانه‌گذاری ساختاریافته (JSON-LD):** Organization، WebSite، WebPage، BreadcrumbList، Service با قیمت، FAQPage، ItemList و CreativeWork.
- **sitemap.xml** با همه صفحه‌ها و hreflang، **robots.txt** که ربات‌های جستجوی هوش مصنوعی را آزاد گذاشته، canonical و hreflang روی همه صفحه‌ها.
- لینک‌های داخلی: از صفحه اصلی، جدول قیمت و فوتر هر صفحه به صفحه‌های خدمت‌ها.

## کارهایی که باید خودتان انجام بدهید

### ۱. مطمئن شوید آدرس درست است
1. در Vercel: **Deployments ← آخرین deploy ← Build Logs** را باز کنید و دنبال خطی مثل این بگردید: `Site address: https://web.jollypanda.ir`.
2. اگر آدرس دیگری بود: **Settings ← Environment Variables** متغیر `SITE_URL` را با مقدار `https://web.jollypanda.ir` (بدون `/` آخر) بسازید و Redeploy کنید.
3. در مرورگر این آدرس‌ها را باز کنید و ببینید کار می‌کنند: `/robots.txt`، `/sitemap.xml`، `/services/online-store-design.html`.
4. روی صفحه پکیج‌ها راست‌کلیک ← View Page Source و جستجو کنید `24.99`؛ باید در کد دیده شود.

### ۲. Google Search Console (مهم‌ترین قدم)
1. به [search.google.com/search-console](https://search.google.com/search-console) بروید و با حساب گوگل وارد شوید.
2. **Add property** ← نوع **Domain** ← `jollypanda.ir` را بنویسید (همه زیردامنه‌ها را پوشش می‌دهد).
3. گوگل یک رکورد **TXT** نشان می‌دهد. وارد پنل DNS دامنه `jollypanda.ir` شوید (همان جایی که رکورد `web` را برای Vercel ساخته‌اید) و رکورد TXT را با همان مقدار اضافه کنید؛ بعد در Search Console **Verify** را بزنید. (چند دقیقه تا چند ساعت طول می‌کشد.)
4. اگر به DNS دسترسی ندارید: نوع **URL prefix** را انتخاب کنید و آدرس `https://web.jollypanda.ir/`؛ روش **HTML tag** را بزنید، مقدار `content` متای نشان‌داده‌شده را در Vercel با نام `GOOGLE_SITE_VERIFICATION` بگذارید، Redeploy کنید و Verify را بزنید.
5. از منوی **Sitemaps** این را وارد و Submit کنید: `https://web.jollypanda.ir/sitemap.xml`
6. از نوار بالا (URL inspection) این آدرس‌ها را یکی‌یکی بدهید و **Request indexing** بزنید: صفحه اصلی، `/fa/`، `/packages.html`، `/fa/packages.html` و چند صفحه خدمت (مثلاً `/fa/services/online-store-design.html`).
7. بعد از ۳ تا ۷ روز، **Pages** را باز کنید: صفحه‌ها باید «Indexed» شوند. اگر «Discovered – currently not indexed» دیدید، نگران نشوید؛ یعنی گوگل هنوز نوبتش را نرسانده است.

### ۳. Bing Webmaster Tools
1. به [bing.com/webmasters](https://www.bing.com/webmasters) بروید.
2. **Import from Google Search Console** را بزنید (ساده‌ترین راه)، یا سایت را دستی اضافه کنید (با `BING_SITE_VERIFICATION` در Vercel، مثل بالا).
3. Sitemap را Submit کنید. Bing پشت Copilot و چند موتور دیگر است.

### ۴. جلوی ربات‌ها را نگیرید
در Vercel: **Settings ← Firewall** را باز کنید. اگر گزینه‌هایی مثل **Attack Challenge Mode**، **Bot Protection** یا **AI Bots** فعال و روی Challenge/Deny هستند، ربات‌های جستجو را هم می‌بندند؛ آن‌ها را خاموش یا روی Log بگذارید.

### ۵. لینک بگیرید (اثر زیادی دارد)
- در سایت اصلی `jollypanda.ir` یک لینک «طراحی وب‌سایت» در منو یا فوتر بگذارید که به `https://web.jollypanda.ir/fa/` برود، و در بخش خدمات به صفحه نوع سایت مربوط لینک بدهید.
- در `me.jollypanda.ir` (فوتر یا صفحه اصلی) و در صفحه سازمان GitHub (`Jolly-Panda-Works`) به این سایت لینک بدهید.
- در پروفایل LinkedIn و کانال تلگرام، آدرس وب‌سایت را همین بنویسید.
- از مشتری‌ها و صاحبان نمونه‌کار بخواهید در سایتشان جمله‌ای مثل «طراحی توسط استودیو Jolly Panda» با لینک به صفحه پروژه خودشان بگذارند.
- اگر دفتر یا آدرس فیزیکی دارید: Google Business Profile و نقشه‌های ایرانی (نشان، بلد) را بسازید.

### ۶. محتوا را زنده نگه دارید
- قیمت‌ها و تخفیف: `data/plans.json`؛ سؤال و جواب‌ها و متن صفحه‌ها از روی همین داده ساخته می‌شوند.
- متن معرفی هر نوع سایت: در `lang/fa.json` و `lang/en.json` کلیدهای `services.intro.<نوع>`.
- هر نمونه‌کار جدید: `data/projects.json` (شناسه فقط حروف انگلیسی کوچک، عدد و خط تیره). با push، صفحه‌اش خودکار ساخته و به sitemap اضافه می‌شود.
- مهم‌ترین چیز: صفحه‌هایی که جواب سؤال واقعی مشتری را می‌دهند. اگر بخواهید یک بخش «مقاله» برای سؤال‌هایی مثل «هزینه طراحی سایت فروشگاهی در ۱۴۰۵» بسازم، بگویید.

### ۷. اندازه‌گیری
- **هفتگی:** Search Console ← Performance؛ ببینید با چه عبارت‌هایی دیده می‌شوید و کدام صفحه‌ها ایندکس شده‌اند.
- **ماهانه (GEO):** همین سؤال‌ها را در ChatGPT، Gemini، Perplexity و Copilot بپرسید: «قیمت طراحی سایت فروشگاهی»، «بهترین پلن طراحی سایت شرکتی»، «طراحی سایت بلاگ با ۲۵ دلار». یادداشت کنید آیا نام یا لینک شما آمده و از چه منبعی نقل شده.
- لاگ‌های Vercel (**Logs**) را برای رد پای ربات‌هایی مثل `OAI-SearchBot`، `Claude-SearchBot`، `PerplexityBot` و `Googlebot` نگاه کنید.

## انتظار واقع‌بینانه
ایندکس شدن چند روز تا چند هفته طول می‌کشد و رتبه گرفتن ماه‌ها. هیچ‌کس نمی‌تواند رتبه یا نقل شدن در ChatGPT و بقیه را تضمین کند. بیشترین شانس شما در عبارت‌های دقیق (نوع سایت + قیمت) است، نه عبارت کلی «طراحی سایت» که بسیار رقابتی است.

## نکات
- Google از ۷ می ۲۰۲۶ دیگر FAQ rich results نشان نمی‌دهد؛ نشانه‌گذاری FAQPage هنوز معتبر است و ضرری ندارد، ولی اصل ماجرا خود متن سؤال و جواب روی صفحه است.
- فایل `llms.txt` ساخته نشده: شواهد مستقل اثری از آن نشان نمی‌دهد.
- تاریخ «آخرین بروزرسانی قیمت» هر روز با نرخ جدید تازه می‌شود و در lastmod سایت‌مپ هم همین تاریخ می‌آید.
