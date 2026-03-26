# Setup Guide
## Deploy in 15 minutes. No code needed after this.

---

## FILE STRUCTURE

```
your-project/
├── index.html              ← Landing page
├── thank-you.html          ← Post-purchase confirmation + pixel
├── access.html             ← Email verification gate
├── download.html           ← Protected content delivery
├── assets/
│   ├── styles.css
│   └── script.js
├── images/                 ← DROP YOUR IMAGES HERE (see README inside)
│   └── README.md
└── functions/
    └── api/
        ├── auth.js         ← Cloudflare Pages Function (validates email)
        └── verify.js       ← Cloudflare Pages Function (verifies token + admin add)
```

The `/functions/` folder deploys automatically WITH your Pages site.
No separate Worker setup needed.

---

## STEP 1 — Replace placeholders in HTML files

Open each file and replace these strings:

| Find | Replace with |
|---|---|
| `YOUR_CHECKOUT_LINK` | Your Beacons / Superprofile / Gumroad checkout URL |
| `YOUR_PIXEL_ID` | Your Meta Pixel ID (from Meta Events Manager) |
| `YOUR_PAYPAL_LINK` | Your PayPal.me link e.g. https://paypal.me/yourname |
| `YOUR_RAZORPAY_LINK` | Your Razorpay payment page link |
| `contact.your-project@upi` | Your actual UPI ID |
| `YOUR_CANVA_LINK_1` through `YOUR_CANVA_LINK_5` | Your Canva folder share links |
| `YOUR_CANVA_BFCM_LINK` | Your BFCM Canva folder link |
| `YOUR_CANVA_DIGITAL_LINK` | Your digital product Canva folder link |
| `YOUR_CRO_LINK` | Your Google Sheets CRO checklist link |
| `YOUR_EMAIL_LINK` | Your email templates Canva link |
| `YOUR_SOCIAL_LINK` | Your social media templates Canva link |
| `YOUR_COURSE_LINK` | Your Canva crash course video link |

---

## STEP 2 — Add your images

Drop files into the `/images/` folder. See `/images/README.md` for exact filenames and sizes.

Minimum to start: just add `logo.png`. Everything else shows a clean placeholder until you add the real image.

---

## STEP 3 — Push to GitHub

```bash
# In your your-project folder:
git init
git add .
git commit -m "Initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/your-project.git
git push -u origin main
```

Make the repo **Public** (required for Cloudflare Pages free tier).

---

## STEP 4 — Deploy to Cloudflare Pages

1. Go to **dash.cloudflare.com**
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Select your `your-project` repo
4. Build settings:
   - Framework preset: **None**
   - Build command: *(leave blank)*
   - Build output directory: `/` (root)
5. Click **Save and Deploy**
6. Your site is live at `your-project.pages.dev`

---

## STEP 5 — Set up the KV namespace (for email access system)

This stores your buyer emails securely. Takes 2 minutes.

1. In Cloudflare dashboard → **Workers & Pages** → **KV**
2. Click **Create namespace**
3. Name it: `your-project_EMAILS`
4. Click **Create**

Then bind it to your Pages project:
1. Go to your Pages project → **Settings** → **Functions**
2. Under **KV namespace bindings** → **Add binding**
3. Variable name: `EMAILS_KV`
4. KV namespace: select `your-project_EMAILS`
5. Click **Save**

---

## STEP 6 — Set environment variables

In your Pages project → **Settings** → **Environment variables** → **Add variable**

| Variable | Value | Notes |
|---|---|---|
| `TOKEN_SECRET` | `any-long-random-string-min-32-chars` | Generate at random.org/strings |
| `ADMIN_KEY` | `your-secret-admin-password` | Used to add buyer emails via API |

Click **Save** after adding both.

Redeploy: **Deployments** → click the latest → **Retry deployment**

---

## STEP 7 — Add a buyer email (when someone purchases)

When a buyer pays, add their email in **30 seconds**:

### Option A — Cloudflare Dashboard (easiest)
1. Go to **Workers & Pages** → **KV** → `your-project_EMAILS`
2. Click **Add entry**
3. Key: `buyer@email.com` (lowercase)
4. Value: `{"added":"2025-01-01"}`
5. Click **Save**

Done. They can access immediately.

### Option B — API (fastest, one curl command)
```bash
curl -X POST https://your-project.pages.dev/api/verify?action=add \
  -H "Content-Type: application/json" \
  -d '{"email":"buyer@email.com","key":"YOUR_ADMIN_KEY"}'
```

### Option C — GitHub (if you prefer)
Not recommended anymore — use KV dashboard instead.

---

## STEP 8 — Set checkout redirect

In your payment platform (Beacons/Gumroad/Superprofile):
- After successful payment, redirect to: `https://your-project.pages.dev/thank-you`

This fires the Meta Purchase pixel and shows the buyer their next steps.

---

## UPDATE CONTENT LATER

**Change price:** Search for `$47` in index.html and replace. Also update sticky bar text.

**Add images:** Drop new files into `/images/` with exact filenames from `images/README.md` → git push → live in 60 seconds.

**Change Canva links:** Edit `download.html` → find the card → update `href`.

After any edit:
```bash
git add .
git commit -m "Update [what you changed]"
git push
```
Auto-redeploys in ~60 seconds.

---

## TROUBLESHOOTING

**Access gate returns "Connection error"**
→ KV namespace not bound, or environment variables not set. Check Step 5 and 6.

**"Email not found" even after adding to KV**
→ Make sure the email is all lowercase in KV. Keys are case-sensitive.

**Download page keeps redirecting to access**
→ Token expired (3 hours). Normal. User re-enters email to get a fresh token.

**Canva links not working on download page**
→ Make sure Canva folder is set to "Anyone with the link can view". Check share settings in Canva.

**Support email wrong**
→ Search for `contact.your-project@gmail.com` in all HTML files and replace if needed.

---

## META PIXEL EVENTS

| Page | Event |
|---|---|
| `index.html` | PageView |
| `index.html` (CTA click) | InitiateCheckout |
| `thank-you.html` | Purchase (value: $47) |
| `access.html` | PageView |

Replace `YOUR_PIXEL_ID` in all 3 HTML files with your actual numeric pixel ID.
