# ScholarAce

JAMB computer-based-test practice site. **Only HTML, CSS and JavaScript.** No server, no Node, nothing to install.

## Run it
Double-click `index.html`. That is all. To put it online, upload this whole folder to Netlify (drag and drop), GitHub Pages, Cloudflare Pages or any web host.

## Before you go live (10 minutes)
1. **Set up your owner key** (needed only for personal activation links, Option B below):
   - Open `owner.html` (on your live site address, so links are right), go to **Setup and key**, tap **Create my owner key**.
   - Tap **Download key backup** and keep that file safe.
   - Copy the public key it shows into `js/config.js`, replacing `ownerPublicKey: null`. Upload the site once. You never need to re-upload per sale.
2. In `js/config.js` set `payment.accountName` to the exact name on your Opay account, and set `jambDate` to the real JAMB date (the "Until JAMB" plan ends then).
3. Add more questions (Questions tab in `owner.html`). The bank has 284 questions (12 or more per subject across all 23 subjects, written at a harder UTME level with explanations), which is a good start but not enough for months of practice.
4. Add your books (Library tab) and put the PDFs in the `library` folder.

## How you sell Premium
### Option A: activation codes (500+ made for you)
Your private file `scholarace-activation-codes-PRIVATE.csv` has 600 codes: 200 for 1 Month, 200 for 3 Months and 200 for Until JAMB. Never put that file on the website. Give a student one code after you confirm their payment; they type it on the Premium page.
- A code works for one student only, once. After it is used, it cannot be used again on that device.
- Every code stops working after its due date (set in the Activation codes tab; change it in the Activation codes tab for new batches). Premium itself ends after 30 days, 90 days, or on JAMB day.
- Wrong guesses lock the box for 15 minutes after 8 tries.
- If a code is shared or leaked, cancel it in `owner.html` > Activation codes, download `codes.js`, replace `js/codes.js` and upload again.
- Honest limit: a site with no server cannot see other devices, so someone who is *given* a code could type it on a different phone too. Hand each code to one student only. For a strictly one-person activation use Option B.

### Option B: personal activation link (locked to one phone number)
1. Student registers (their phone number is saved), chooses a plan, sees your Opay account and taps **Send receipt on WhatsApp**.
2. You see the Opay credit. Open `owner.html` > **Activate a student**, type their phone number and plan, tap **Create activation link**, then **Send to student on WhatsApp**.
3. They open the link while signed in. Premium starts. The link works only for that phone number and only once. Nobody can make a link without your private key.

Plans (change in `js/config.js`): 1 Month ₦1,500, 3 Months ₦5,000, Until JAMB ₦20,000.

(If the site does not know your key yet, Option A codes still work; the key is needed only for Option B links.)

## Free vs Premium
- **Free:** 5 questions a day, any subject, and the student **chooses the time** (any number of minutes, or no timer), with optional instant answers.
- **Premium:** unlimited questions, full 400-point mocks, library downloads, and **fixed real JAMB timing** (40 seconds a question, 120 minutes maximum). No choosing time, no pausing, answers only after submitting.

## Subjects
All 23: English, Mathematics; Physics, Chemistry, Biology, Agricultural Science, Computer Studies, Geography; Literature, Government, History, CRS, IRS, Art, Music, Home Economics; Economics, Commerce, Principles of Accounts; French, Yoruba, Igbo, Hausa.

## Files
`index.html` the site, `owner.html` your private tools (do not link it), `js/config.js` settings, `js/data/questions.js` questions, `js/library.js` + `library/` books, `brand/` logo files (PNG and SVG).

## Honest limits of having no server
- Accounts, results, the daily limit and Premium are stored in each student's own browser. A technical student can edit their own browser data to skip the limit or fake Premium on their own device. Signed links stop sharing and forging, not a determined hacker.
- An account made on one device does not exist on another. Students can't reset a password by email (they can clear the account on that device and register again; message you for a new link if they had Premium).
- Library file addresses are public on a static host: anyone who knows a file's exact address can download it. Only list books you are allowed to share.
- You cannot see students or their results. The activation list in `owner.html` is kept in your browser only.
- The answer key ships with the site.
Closing all of this needs a real server later; the screens would stay the same.

## Phone verification (new students)
New students must enter a verification code to register. They tap "Send me a code" (opens WhatsApp to you). In owner.html > **Verify a new student**, enter their number and send the message to that same number. The code only works for that number, once, for 3 days, so only the person holding that phone can register. Needs your key set up (Setup and key). To switch it off set `requireVerification: false` in js/config.js.

Limits with no server: one account per phone number is enforced on each device (the code is single-use there); a different device has its own storage. Each code is made for one exact phone number AND one exact email address that you approve, so nobody you have not approved can register with another email or number. A fully automatic SMS code needs a small backend and a paid SMS service.

## Optional backend: codes by email and SMS (server/server.js)
The site works on its own (open index.html). If you also run the small server, registration and sign-in ask for **two codes**: one sent to the student's email and one sent to their phone. Without the server, the manual WhatsApp codes above are used.

Needs Node 18 or newer. No packages to install.
1. Make accounts with an email sender and an SMS sender (both have free trials): **Resend** (resend.com) for email and **Termii** (termii.com) for Nigerian SMS.
2. In a terminal in this folder:
   `RESEND_API_KEY=... TERMII_API_KEY=... EMAIL_FROM="ScholarAce <you@yourdomain.com>" node server/server.js`
3. On first run it prints a public key. Paste it into `js/config.js` as `ownerPublicKey` (skip if you already did setup in owner.html; to reuse that key, save its backup file as `server/owner-keys.json` before starting).
4. Open http://localhost:3000. The site finds the server automatically. When the site is on a different address from the server, set `backendUrl` in `js/config.js` and `ALLOWED_ORIGIN=https://your-site` for the server.

To test without sending anything: `DEV_SHOW_CODES=1 node server/server.js` prints the codes in the terminal.

Safety built in: codes expire in 10 minutes, 5 wrong tries then a new code is needed, at most 5 code requests per email or phone per hour, and the signed result is tied to that exact phone and email. Keep `server/owner-keys.json` private; never upload it to a public site.
Honest limit: accounts and exam history still live on the student's own device, so the codes prove who is signing in, but a student on a new device starts a fresh account.

### Quick start for the code server
- Windows: double-click `start-server.bat`. Mac or Linux: run `./start-server.sh`. (`npm start` also works.)
- The first run creates `server/.env`. Open it, paste your Resend and Termii keys, save, and start again. Nothing needs installing.
- The window prints WARNING lines for anything still missing. Use `DEV_SHOW_CODES=` set to 1 in `.env` to test without sending.
- Put the website and the server on the same address (the server serves the site too) or set `backendUrl` in `js/config.js`.
- Keep `server/.env` and `server/owner-keys.json` private. The server never serves anything inside `server/`.

## Accounts on the server (when the code server is running)
With `node server/server.js` running, accounts are kept on the server (`server/data/db.json`, passwords stored with scrypt): one account per email and phone for everyone, sign-in on any phone, Premium and results that follow the student, and every activation code works only once across all devices. Without the server the site still works from `index.html` with accounts on each device. Back up `server/data/db.json` and keep it private. Set `cloudAccounts: false` in `js/config.js` to turn this off.
