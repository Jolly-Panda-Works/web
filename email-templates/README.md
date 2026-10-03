# Email templates (EmailJS)

The request form sends **two emails** through [EmailJS](https://www.emailjs.com/) (free plan: 200 emails/month ≈ 100 requests):

| Template file | Goes to | Purpose |
|---|---|---|
| `studio-notification.html` | the studio inbox | the full request |
| `customer-confirmation-precontract.html` | the person who filled the form | confirmation + **English pre-contract**, pre-filled with their request |

## Create the two templates in EmailJS

1. **Email Services → Add new service** (Gmail / Outlook / SMTP). Note the **Service ID**.
2. **Email Templates → Create new template**, then in the editor switch to the **code editor** and paste the HTML file. Settings:

**Studio notification**

| Field | Value |
|---|---|
| To Email | the studio inbox, e.g. `sales@jollypanda.ir` |
| From Name | `Jolly Panda Web` |
| Reply To | `{{email}}` |
| Subject | `New website request {{reference}} — {{website_type}} / {{plan_name}}` |

**Customer confirmation + pre-contract**

| Field | Value |
|---|---|
| To Email | `{{to_email}}` |
| From Name | `Jolly Panda Studio` |
| Reply To | `{{reply_to}}` |
| Subject | `Your pre-contract {{reference}} — {{website_type}} / {{plan_name}}` |

3. Copy the two **Template IDs** and your **Public Key** (Account → General) into `site.config.json` → `email`, then run `node scripts/build-pages.mjs` and commit.
4. In EmailJS **Account → Security** restrict the allowed domains to your site's domain, so the public key cannot be used from other sites.

## Variables the form sends

`reference`, `request_date`, `site_language`, `name`, `email`, `to_email`, `to_name`, `reply_to`, `studio_email`, `phone`, `business`, `domain_status`, `project_message`, `website_type`, `plan_name`, `price_usd`, `rial_note`, `scope_structure_label`, `scope_structure`, `scope_design`, `scope_features`, `scope_seo`, `scope_support`, `scope_delivery`, `intro_fa`.

Website type, plan and scope are always sent in English (the pre-contract is English whatever the site language). `intro_fa` holds a short Persian note and is only filled when the visitor used the Persian site.

> The pre-contract text is a general-purpose template (non-binding summary + blanks to complete). Have it reviewed by whoever handles your contracts before you rely on it.
