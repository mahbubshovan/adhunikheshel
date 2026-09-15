import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
// @ts-ignore — Vite ?raw suffix bundles the SQL at build time
import migrationSql from '../drizzle/0000_needy_marrow.sql?raw';

type Row = Record<string, unknown>;

let _db: Database.Database | null = null;

function getRawDb(): Database.Database {
  if (!_db) {
    const dbPath = process.env.DB_PATH ?? join(process.cwd(), 'data', 'adhunik.sqlite');
    mkdirSync(dirname(dbPath), { recursive: true });
    const isNew = !existsSync(dbPath);
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    if (isNew) initSchema(_db);
    ensureSeeds(_db);
  }
  return _db;
}

function initSchema(db: Database.Database) {
  try {
    const stmts = migrationSql.split('--> statement-breakpoint').map((s: string) => s.trim()).filter(Boolean);
    for (const stmt of stmts) db.exec(stmt);
  } catch (e) {
    console.error('Schema init failed:', e);
  }
}

function ensureSeeds(db: Database.Database) {
  try {
    db.exec(`INSERT OR IGNORE INTO products (id,name,description,image,category,active) VALUES ('balachao','চিংড়ি শুঁটকি বালাচাও','চিংড়ি শুঁটকির ভুনা—ছোট বয়ামে বড় স্বাদ। কোনো প্রিজারভেটিভ নেই, খাঁটি উপকরণে তৈরি। ভাত, খিচুড়ি ও পোলাওয়ের সাথে অসাধারণ।','/images/balachao-poster.jpg','বালাচাও',1)`);
    db.exec(`INSERT OR IGNORE INTO variants (id,product_id,grams,price) VALUES ('balachao-100','balachao',100,250),('balachao-200','balachao',200,480),('balachao-400','balachao',400,900),('balachao-500','balachao',500,1100)`);
  } catch (e) {
    console.error('Seed failed:', e);
  }
}

class D1PreparedStatement {
  private bindings: unknown[] = [];
  constructor(private raw: Database.Database, private sql: string) {}

  bind(...params: unknown[]): this {
    this.bindings = params.flat();
    return this;
  }

  async all<T = Row>(): Promise<{ results: T[] }> {
    const results = this.raw.prepare(this.sql).all(...this.bindings) as T[];
    return { results };
  }

  async first<T = Row>(): Promise<T | null> {
    return (this.raw.prepare(this.sql).get(...this.bindings) as T) ?? null;
  }

  async run(): Promise<{ success: boolean; meta: { changes: number } }> {
    const info = this.raw.prepare(this.sql).run(...this.bindings);
    return { success: true, meta: { changes: info.changes } };
  }

  _runSync(): { success: boolean; meta: { changes: number } } {
    const info = this.raw.prepare(this.sql).run(...this.bindings);
    return { success: true, meta: { changes: info.changes } };
  }
}

class D1Compat {
  constructor(private raw: Database.Database) {}

  prepare(sql: string): D1PreparedStatement {
    return new D1PreparedStatement(this.raw, sql);
  }

  async batch(stmts: D1PreparedStatement[]): Promise<{ success: boolean; meta: { changes: number } }[]> {
    const runAll = this.raw.transaction(() => stmts.map(s => s._runSync()));
    return runAll();
  }
}

export function getDb(): D1Compat {
  return new D1Compat(getRawDb());
}

export type AppEnv = { DB: D1Compat };
