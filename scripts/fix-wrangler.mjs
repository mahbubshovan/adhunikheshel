#!/usr/bin/env node
// Patches dist/server/wrangler.json after each build to restore production config.
// The build tool (vinext) regenerates this file with placeholder values each run.
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const path = fileURLToPath(new URL('../dist/server/wrangler.json', import.meta.url));
const cfg = JSON.parse(readFileSync(path, 'utf8'));

cfg.d1_databases[0].database_name = 'adhunik-heshel-db';
cfg.d1_databases[0].database_id   = '52730859-a633-4ed9-a987-39f82ba80802';
cfg.d1_databases[0].migrations_dir = '../../drizzle';
cfg.routes = [
  { pattern: 'adhunikheshel.com',     custom_domain: true },
  { pattern: 'www.adhunikheshel.com', custom_domain: true },
];

writeFileSync(path, JSON.stringify(cfg, null, 2));
console.log('✔ dist/server/wrangler.json patched with production config');

// xCloud's static-site check requires dist/client/index.html to exist after the build.
// This project is served by Cloudflare Workers (not from dist/client/), so we create
// a placeholder to satisfy the check without breaking anything.
const clientDir = fileURLToPath(new URL('../dist/client', import.meta.url));
mkdirSync(clientDir, { recursive: true });
writeFileSync(`${clientDir}/index.html`, '<!-- Cloudflare Workers app -->\n');
console.log('✔ dist/client/index.html placeholder created for xCloud compatibility');
