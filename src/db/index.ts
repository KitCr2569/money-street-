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
export const db = new Proxy({} as any, {
  get(target, prop) {
    return new Proxy(() => {}, {
      apply(target, thisArg, args) {
        return getDB().then(db => db[prop](...args));
      },
      get(target, subProp) {
        // Handle db.query.xxx
        if (prop === 'query') {
          return new Proxy({}, {
            get(target, table) {
              return new Proxy({}, {
                get(target, method) {
                  return (...args: any[]) => getDB().then(db => db.query[table][method](...args));
                }
              });
            }
          });
        }
        return (...args: any[]) => getDB().then(db => db[prop][subProp](...args));
      }
    });
  }
});



