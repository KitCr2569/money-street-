import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const globalForDb = globalThis as unknown as {
  _db: BetterSQLite3Database<typeof schema> | undefined;
};

function getDB(): BetterSQLite3Database<typeof schema> {
  if (globalForDb._db) return globalForDb._db;

  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const dbPath = join(dataDir, 'moneystreet.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const instance = drizzle(sqlite, { schema });
  globalForDb._db = instance;
  return instance;
}

export const db = new Proxy({} as BetterSQLite3Database<typeof schema>, {
  get(_target, prop) {
    return (getDB() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
