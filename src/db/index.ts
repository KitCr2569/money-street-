import * as schema from './schema';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

let instance: any | null = null;

export async function getDB() {
  if (instance) return instance;

  // Use local database for better performance
  // const url = process.env.TURSO_DATABASE_URL;
  // const authToken = process.env.TURSO_AUTH_TOKEN;

  // if (url && url.startsWith('libsql://')) {
  //   const { createClient } = await import('@libsql/client');
  //   const { drizzle: drizzleLibsql } = await import('drizzle-orm/libsql');
  //   const client = createClient({ url, authToken });
  //   instance = drizzleLibsql(client, { schema });
  // } else {
    const Database = (await import('better-sqlite3')).default;
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    const dbPath = join(dataDir, 'moneystreet.db');
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    instance = drizzle(sqlite, { schema });
  // }
  return instance;
}

/**
 * Global DB proxy that ensures getDB is called before any operation
 */
const createTableProxy = (table: string) => new Proxy(() => {}, {
  get(target, method) {
    return (...args: any[]) => getDB().then(db => (db.query as any)[table][method](...args));
  }
});

const queryProxy = new Proxy(() => {}, {
  get(target, table) {
    return createTableProxy(String(table));
  }
});

export const db: any = new Proxy(() => {}, {
  get(target, prop) {
    if (prop === 'query') return queryProxy;
    return (...args: any[]) => getDB().then(db => (db as any)[prop](...args));
  },
  apply(target, thisArg, args) {
    return getDB().then(db => (db as any)(...args));
  }
});



