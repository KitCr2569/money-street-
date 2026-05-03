import * as schema from './schema';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

let dbInstance: any | null = null;
let dbInitPromise: Promise<any> | null = null;

/**
 * Initialize database - works for both local (SQLite) and Vercel (Turso)
 */
async function initDB() {
  if (dbInstance) return dbInstance;
  
  // Prevent race conditions
  if (dbInitPromise) return dbInitPromise;
  
  dbInitPromise = (async () => {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
    const forceLocal = ['1', 'true', 'yes'].includes(String(process.env.USE_LOCAL_DB ?? '').toLowerCase());

    // On Vercel, MUST use Turso (SQLite file will be lost on each deploy)
    if (isVercel && !url) {
      console.error('❌ Vercel detected but TURSO_DATABASE_URL not set!');
      throw new Error('TURSO_DATABASE_URL required for Vercel deployment');
    }

    if (!forceLocal && url && url.startsWith('libsql://')) {
      try {
        const { createClient } = await import('@libsql/client');
        const { drizzle: drizzleLibsql } = await import('drizzle-orm/libsql');
        
        const client = createClient({ url, authToken });
        
        // Quick connection test
        await client.execute('SELECT 1');
        console.log('✅ Turso connected');
        
        dbInstance = drizzleLibsql(client, { schema });
        return dbInstance;
      } catch (err) {
        console.error('❌ Turso failed:', err);
        if (isVercel) throw err; // On Vercel, can't fallback to SQLite
        console.log('⚠️ Falling back to SQLite');
      }
    }
    
    // Local SQLite (or fallback when Turso not configured)
    return initLocalDB();
  })();
  
  return dbInitPromise;
}

async function initLocalDB() {
  const Database = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const dbPath = join(dataDir, 'moneystreet.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  dbInstance = drizzle(sqlite, { schema });
  console.log('✅ SQLite connected:', dbPath);
  return dbInstance;
}

/**
 * Get database instance - ensures initialization before use
 */
export async function getDB() {
  return initDB();
}

/**
 * Simplified db export for Vercel serverless compatibility
 * Each call ensures DB is initialized
 */
export const db = new Proxy({} as any, {
  get(_, prop) {
    return (...args: any[]) => {
      return initDB().then((dbInstance) => {
        const value = dbInstance[prop];
        if (typeof value === 'function') {
          return value.apply(dbInstance, args);
        }
        return value;
      });
    };
  }
});

// Also export query helpers that work with the proxy
export const query = {
  async botSignals(...args: any[]) {
    const db = await initDB();
    return db.query.botSignals(...args);
  },
  async botTrades(...args: any[]) {
    const db = await initDB();
    return db.query.botTrades(...args);
  },
  async botPortfolio(...args: any[]) {
    const db = await initDB();
    return db.query.botPortfolio(...args);
  },
  async botSettings(...args: any[]) {
    const db = await initDB();
    return db.query.botSettings(...args);
  },
  async userSettings(...args: any[]) {
    const db = await initDB();
    return db.query.userSettings(...args);
  },
};



