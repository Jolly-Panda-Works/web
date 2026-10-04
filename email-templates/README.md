# Email templates (EmailJS)

The request form sends **two emails** through [EmailJS](https://www.emailjs.com/) (free plan: 2 templates, 200 emails/month ≈ 100 requests):

| File | Goes to | Purpose |
|---|---|---|
| `studio-notification.html` | the studio inbox | the full request (always English) |
| `customer-confirmation-precontract.html` | visitors of the **English** site | confirmation + pre-contract, **fully in English** |
| `customer-confirmation-precontract.fa.html` | visitors of the **Persian** site | the same pre-contract **in Persian** (right-to-left, Jalali date) |

## Setup with ONE EmailJS template (recommended)

These three HTML files are **not** pasted into EmailJS. The build embeds them in `js/email-templates.js`; the page fills in the visitor's data and sends the finished HTML to EmailJS as a variable. So EmailJS needs a single, generic template:

1. **Email Services → Add new service** (Gmail / Outlook / SMTP). Note the **Service ID**.
2. **Email Templates → Create new template**, with these settings:

| Field | Value |
|---|---|
| To Email | `{{to_email}}` |
| From Name | `{{{from_name}}}` |
| Reply To | `{{reply_to}}` |
| Subject | `{{{subject}}}` |
| Content (Code editor, HTML) | `{{{message_html}}}` — **three** braces, otherwise the HTML is shown as text |

3. Set the Vercel environment variables `EMAILJS_SERVICE_ID`, `EMAILJS_PUBLIC_KEY` (Account → General) and `EMAILJS_TEMPLATE_ID`, then redeploy (or put `serviceId`, `publicKey`, `templateId` into `site.config.json` → `email` and run `node scripts/build-pages.mjs`).
4. In EmailJS **Account → Security** restrict the allowed domains to your site's domain.

The same template sends all emails: the studio notice goes to `contactEmail` (reply-to = the visitor), the pre-contract goes to the visitor (reply-to = the studio). Persian visitors get the Persian pre-contract, everyone else the English one — decided by the page language, no extra template needed.

Edit the wording in the three HTML files, then run `node scripts/build-pages.mjs` (Vercel does it on every deploy).

## Older setup: separate templates (optional)

Without `templateId` the form uses separate EmailJS templates (`studioTemplateId`, `confirmTemplateId`, and `confirmTemplateIdFa` for Persian) with the HTML files above pasted into the Code editor. Every one needs *To Email* = `{{to_email}}`; an empty or mistyped value makes EmailJS answer `422 The recipients address is corrupted`. This needs three templates, so it does not fit the free plan if you want Persian pre-contracts.

## Variables the form sends

`reference`, `request_date`, `site_language`, `signature_url`, `name`, `email`, `to_email`, `to_name`, `reply_to`, `studio_email`, `phone`, `business`, `domain_status`, `project_message`, `website_type`, `plan_name`, `price_usd` (after discount), `price_list_usd`, `discount_percent`, `discount_note`, `rial_note`, `scope_structure_label`, `scope_structure`, `scope_design`, `scope_features`, `scope_seo`, `scope_support`, `scope_delivery`, `intro_fa`.

For the studio notice and the English pre-contract, website type, plan, scope and dates are sent in English. For the Persian pre-contract they are sent in Persian (Persian digits, Jalali date).

## Co-founder signature

The studio's signature block in the pre-contract shows **Usef Farahmand — Co-founder**, the request date and a signature image. The image is `assets/signature/usef-farahmand.png` (PNG, transparent background, dark ink, about 600×200 px). E-mail clients need a public link, so the file is served from the website (`{{signature_url}}`) — which means anyone who knows the URL can download it. Until the file exists, a transparent 1-pixel image is used and the block shows the name, title and date only.

> The pre-contract text is a general-purpose template (non-binding summary + blanks to complete). Have it reviewed by whoever handles your contracts before you rely on it.
