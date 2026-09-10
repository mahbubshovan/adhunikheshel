#!/usr/bin/env node
// Patches dist/server/wrangler.json after each build to restore production config.
// The build tool (vinext) regenerates this file with placeholder values each run.
import { readFileSync, writeFileSync } from 'fs';
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
