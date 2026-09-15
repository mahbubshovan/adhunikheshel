import { env } from 'cloudflare:workers';
export function getDb() { return env.DB; }
export type AppEnv = typeof env;
