# আধুনিক হেঁশেল

Local Bengali storefront for আধুনিক হেঁশেল, based on the business conversations in “আধুনিক হেঁশেল” and “আধুনিক হেঁশেল নিউ”.

## Open the website

- Shop: http://localhost:3000
- Order management: http://localhost:3000/admin
- The local admin password is the `ADMIN_PASSWORD` value in `.dev.vars` in this folder. This private file is excluded from Git. No username is needed.

## Start again

Node.js 22.13 or later is required.

```sh
cd "adhunik heshel"
npm install
npm run db:setup
npm run dev -- --host 127.0.0.1
```

For a fresh copy, create `.dev.vars` from `.dev.vars.example` and set a long random password before starting. Changing the password requires restarting the server. Existing sessions expire within 12 hours; changing the password invalidates prior sessions, and logging out revokes the current session.

## Included

- Mobile-friendly Bengali storefront, original brand logo, four product photos supplied by the owner, product categories and weight choices.
- Sixteen database-backed price variants; cart quantities, delivery address, phone validation and cash-on-delivery checkout.
- Delivery is ৳80 inside Dhaka and ৳120 outside Dhaka, per the owner's instruction.
- Server-calculated totals: submitted prices or totals are never trusted.
- Atomic order and line-item saving with a unique request key to prevent duplicate orders on retries.
- Password-protected order management, search, filtering, print-friendly invoices and status updates.
- Order lifecycle: pending → confirmed → preparing → shipped → delivered. Administrators can select and save any status, including corrections and reopening cancelled orders. “Delivered and cash collected” records payment collection; changing a delivered order back to another status resets its cash collection to unpaid, with a visible notice before saving.
- Checkout saves an order request. Staff must confirm it by phone and arrange delivery. No messages are sent automatically and no courier booking is made.

## Database and backups

The database runs locally through Cloudflare's D1/SQLite emulator. It does not require a Cloudflare account and no remote database has been created.

Business database files live under `.wrangler/state/v3/d1/`. Keep this directory: it holds orders and sessions and is excluded from Git. With the server stopped, copy the entire `.wrangler/state` directory to a dated backup location. To restore, stop the server, preserve the current directory as a backup, then restore the saved state directory. Do not overwrite a running database.

Schema: `db/schema.ts`; versioned migrations: `drizzle/`; initial product data: `db/seed.sql`. Seeding only inserts missing records and does not overwrite orders or existing prices. The one-time photo update is in `db/update-product-images.sql`.

Prices are held in the `variants` table. Product visibility is controlled by `products.active`. Delivery fees are in `lib/catalog.ts` (update the matching public labels if changing these). This version does not include a product-editing screen.

## Checks

```sh
npx tsc --noEmit
npm run build
npm test
```

The integration test creates a separate database under `work/test-state-*`, starts a test server on port 3011 and stops it after testing. It does not touch business orders. Tests cover both delivery fees, totals, bad inputs, duplicate and concurrent submissions, admin authentication, status transitions and cash collection.

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
- Latest four product photos supplied in this website task replace the earlier delivery photos. Photos are displayed as supplied without changing their labels.
- Customer details from old invoice examples were not imported.

The site is local only. Public deployment, domain setup, courier integration and online payments have not been configured.

## Validation result

The production build, TypeScript checks and isolated integration tests passed. The runtime-only dependency audit reported no known vulnerabilities; development tooling still has transitive audit advisories. Browser interaction/visual testing was not performed. The local business database contains no test orders.

## বাংলা আপডেট গাইড

লেখা, ছবি, ভিডিও, দাম, নতুন পণ্য, ডেলিভারি চার্জ ও লাইভ আপডেটের বিস্তারিত নিয়ম: [ওয়েবসাইট আপডেট গাইড](WEBSITE-UPDATE-GUIDE-BN.md)।
