# আধুনিক হেঁশেল

Local Bengali storefront for আধুনিক হেঁশেল, based on the business conversations in “আধুনিক হেঁশেল” and “আধুনিক হেঁশেল নিউ”.

## Open the website

- Shop: http://localhost:4321
- Order management: http://localhost:4321/admin
- The admin password comes from the `ADMIN_PASSWORD` environment variable (at least 16 characters). Locally it is kept in `.dev.vars` in this folder, which is excluded from Git; the server does not read that file by itself, so load it into the environment before starting (see below). No username is needed.

## Start again

Node.js 22.13 or later is required.

```sh
cd "adhunik heshel"
npm install
set -a; source .dev.vars; set +a
npm run dev -- --host 127.0.0.1
```

For a fresh copy, create `.dev.vars` from `.dev.vars.example` and set a long random password before starting. To run the production build locally, use `npm run build` and then `npm start` (serves `dist/server/entry.mjs`; set `PORT` to choose the port). Changing the password requires restarting the server. Existing sessions expire within 12 hours; changing the password invalidates prior sessions, and logging out revokes the current session.

## Included

- Mobile-friendly Bengali storefront, original brand logo, five products with photos supplied by the owner, product categories and weight choices.
- Twenty database-backed price variants; cart quantities, delivery address, phone validation and cash-on-delivery checkout.
- Delivery is ৳80 inside Dhaka and ৳120 outside Dhaka, per the owner's instruction.
- Server-calculated totals: submitted prices or totals are never trusted.
- Atomic order and line-item saving with a unique request key to prevent duplicate orders on retries.
- Password-protected order management, search, filtering, print-friendly invoices and status updates.
- Order lifecycle: pending → confirmed → preparing → shipped → delivered. Administrators can select and save any status, including corrections and reopening cancelled orders. “Delivered and cash collected” records payment collection; changing a delivered order back to another status resets its cash collection to unpaid, with a visible notice before saving.
- Checkout saves an order request. Staff must confirm it by phone and arrange delivery. When `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` or `ADMIN_EMAIL` with `SMTP_*` are set, staff get a notification for each new order; customers are not messaged and no courier booking is made.

## Database and backups

The database is a single SQLite file opened with better-sqlite3: `data/adhunik.sqlite`, or the path in the `DB_PATH` environment variable. On first start `db/index.ts` creates the tables from the migration in `drizzle/` and inserts the products and prices. Seeding runs on every start but only inserts missing records, so it never overwrites orders or changed prices.

The file holds orders and sessions and is excluded from Git (`*.sqlite`). It runs in WAL mode, so a backup must include `adhunik.sqlite-wal` and `adhunik.sqlite-shm` alongside it: with the server stopped, copy all three files to a dated backup location. With the server running, use `sqlite3 data/adhunik.sqlite ".backup backup.sqlite"` instead. To restore, stop the server, keep the current files as a backup, then put the saved files back. Do not overwrite a running database.

Schema: `db/schema.ts`; versioned migrations: `drizzle/`; initial product data: `ensureSeeds` in `db/index.ts`.

Prices are held in the `variants` table. Product visibility is controlled by `products.active`. Delivery fees are in `lib/catalog.ts` (update the matching public labels if changing these). This version does not include a product-editing screen.

## Checks

```sh
npx tsc --noEmit
npm run build
npm test
```

`npm test` builds the site, starts the production server (`node dist/server/entry.mjs`) on port 3011 with `DB_PATH` pointing at a temporary database under `work/test-state-*` and a random admin password, then stops it and deletes the temporary database. Telegram and email settings are removed from the test server's environment, so no notifications are sent, and business orders are not touched. Tests cover security headers, SEO HTML, the catalog, both delivery fees, totals, bad inputs, duplicate and concurrent submissions, admin authentication, status transitions and cash collection.

The optional WebMCP cart tool only stages products; it never places orders. Unsupported browsers use the normal website. Its browser-specific integration has not been verified in a supported WebMCP context.

## Business references used

- Latest jar logo and wording from the invoice design task in “আধুনিক হেঁশেল নিউ”: “ঘরোয়া স্বাদ, ভালোবাসার রান্না” and “স্বাদের গল্পে থাকুন আমাদের সাথেই”.
- Facebook: https://www.facebook.com/adhunikheshel/
- WhatsApp / business phone: +8801672777204.
- Latest complete price menu from “ইলিশের আচার পোস্টার বানাও”, consistent with the later sample invoice. Earlier proposed prices were superseded by the final menu.
- Churi: 100g ৳250, 200g ৳480, 400g ৳900, 500g ৳1100.
- Loitta: 100g ৳250, 200g ৳500, 250g ৳600, 500g ৳1150.
- Chepa: 100g ৳180, 200g ৳350, 400g ৳650, 500g ৳800.
- Ilish achar: 100g ৳300, 200g ৳550, 250g ৳650, 500g ৳1250.
- Product photos supplied in this website task replace the earlier delivery photos. Photos are displayed as supplied without changing their labels.
- Customer details from old invoice examples were not imported.

The site runs on xCloud as a Node app (Astro with `@astrojs/node`), deployed from this Git repository, at https://www.adhunikheshel.com. Set `ADMIN_PASSWORD` (and optionally `DB_PATH`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `ADMIN_EMAIL` and the `SMTP_*` settings for order notifications) in the site's environment there. Courier integration and online payments have not been configured.

## Validation result

The TypeScript check, production build and isolated integration test against the built Astro server pass.

## বাংলা আপডেট গাইড

লেখা, ছবি, ভিডিও, দাম, নতুন পণ্য, ডেলিভারি চার্জ ও লাইভ আপডেটের বিস্তারিত নিয়ম: [ওয়েবসাইট আপডেট গাইড](WEBSITE-UPDATE-GUIDE-BN.md)।
