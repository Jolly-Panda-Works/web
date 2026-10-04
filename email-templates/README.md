# Email templates (EmailJS)

The request form sends **two emails** through [EmailJS](https://www.emailjs.com/) (free plan: 200 emails/month ≈ 100 requests):

| Template file | Goes to | Purpose |
|---|---|---|
| `studio-notification.html` | the studio inbox | the full request (always English) |
| `customer-confirmation-precontract.html` | visitors of the **English** site | confirmation + pre-contract, **fully in English** |
| `customer-confirmation-precontract.fa.html` | visitors of the **Persian** site | the same pre-contract **in Persian** (right-to-left, Jalali date) |

That makes **three** EmailJS templates. The site picks the pre-contract by the language of the page the visitor used. If the Persian template id is not configured, Persian visitors get the English one.

## Create the two templates in EmailJS

1. **Email Services → Add new service** (Gmail / Outlook / SMTP). Note the **Service ID**.
2. **Email Templates → Create new template**, then in the editor switch to the **code editor** and paste the HTML file. Settings:

**Studio notification**

| Field | Value |
|---|---|
| To Email | `{{to_email}}` (the form fills in the studio address from `contactEmail` — default `sales@jollypanda.ir`) |
| From Name | `Jolly Panda Web` |
| Reply To | `{{email}}` (the visitor, so you can reply directly) |
| Subject | `New website request {{reference}} — {{website_type}} / {{plan_name}}` |

**Customer confirmation + pre-contract** (create it twice: English file and Persian file, same settings; for the Persian one use the subject `پیش‌قرارداد {{reference}} — {{website_type}} / {{plan_name}}`)

| Field | Value |
|---|---|
| To Email | `{{to_email}}` |
| From Name | `Jolly Panda Studio` |
| Reply To | `{{reply_to}}` |
| Subject | `Your pre-contract {{reference}} — {{website_type}} / {{plan_name}}` |

> **Both templates must have `{{to_email}}` in the *To Email* field.** An empty or mistyped *To Email* makes EmailJS answer `422 The recipients address is corrupted`.

3. Copy the three **Template IDs** and your **Public Key** (Account → General) into `site.config.json` → `email` (`studioTemplateId`, `confirmTemplateId`, `confirmTemplateIdFa`) — or set the Vercel environment variables `EMAILJS_STUDIO_TEMPLATE_ID`, `EMAILJS_CONFIRM_TEMPLATE_ID`, `EMAILJS_CONFIRM_TEMPLATE_ID_FA` — then run `node scripts/build-pages.mjs` and commit.
4. In EmailJS **Account → Security** restrict the allowed domains to your site's domain, so the public key cannot be used from other sites.

## Variables the form sends

`reference`, `request_date`, `site_language`, `signature_url`, `name`, `email`, `to_email`, `to_name`, `reply_to`, `studio_email`, `phone`, `business`, `domain_status`, `project_message`, `website_type`, `plan_name`, `price_usd` (after discount), `price_list_usd`, `discount_percent`, `discount_note`, `rial_note`, `scope_structure_label`, `scope_structure`, `scope_design`, `scope_features`, `scope_seo`, `scope_support`, `scope_delivery`, `intro_fa`.

For the studio notice and the English pre-contract, website type, plan, scope and dates are sent in English. For the Persian pre-contract they are sent in Persian (Persian digits, Jalali date).

## Co-founder signature

The studio's signature block in the pre-contract shows **Usef Farahmand — Co-founder**, the request date and a signature image. The image is `assets/signature/usef-farahmand.png` (PNG, transparent background, dark ink, about 600×200 px). E-mail clients need a public link, so the file is served from the website (`{{signature_url}}`) — which means anyone who knows the URL can download it. Until the file exists, a transparent 1-pixel image is used and the block shows the name, title and date only.

> The pre-contract text is a general-purpose template (non-binding summary + blanks to complete). Have it reviewed by whoever handles your contracts before you rely on it.
