import * as schema from './schema';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';

let instance: any | null = null;

export async function getDB() {
  if (instance) return instance;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const forceLocal = ['1', 'true', 'yes'].includes(String(process.env.USE_LOCAL_DB ?? '').toLowerCase());

  if (!forceLocal && url && url.startsWith('libsql://')) {
    const { createClient } = await import('@libsql/client');
    const { drizzle: drizzleLibsql } = await import('drizzle-orm/libsql');
    
    // Add connection timeout for Turso (Vercel serverless optimization)
    const connectTimeout = parseInt(process.env.TURSO_CONNECT_TIMEOUT ?? '5000');
    
    const client = createClient({ 
      url, 
      authToken,
      // Connection timeout to prevent hanging in serverless
      syncInterval: 0, // Disable sync for read-only operations in serverless
    });
    
    // Test connection with timeout
    const testConnection = Promise.race([
      client.execute('SELECT 1'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Turso connection timeout')), connectTimeout)
      )
    ]);
    
    try {
      await testConnection;
      console.log('✅ Turso connected successfully');
    } catch (err) {
      console.error('❌ Turso connection failed:', err);
      // Fallback to SQLite if Turso fails
      console.log('⚠️ Falling back to local SQLite');
      return getLocalDB();
    }
    
    instance = drizzleLibsql(client, { schema });
  } else {
    return getLocalDB();
  }
}

// Separate function for local SQLite to allow fallback
async function getLocalDB() {
  if (instance && instance.constructor?.name?.includes('better-sqlite3')) return instance;
  
  const Database = (await import('better-sqlite3')).default;
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  const dbPath = join(dataDir, 'moneystreet.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  instance = drizzle(sqlite, { schema });
  return instance;
}

/**
 * Creates a proxy for async DB access so chained calls like
 * db.insert(...).values(...) work correctly.
 */
const wrapThenable = (value: any) => {
  if (value && typeof value.then === 'function' && value[Symbol.toStringTag] !== 'QueryPromise') {
    return new Proxy(value, {
      get(target, prop, receiver) {
        if (prop === 'then') return undefined;
        return Reflect.get(target, prop, receiver);
      },
      has(target, prop) {
        if (prop === 'then') return false;
        return prop in target;
      },
      getOwnPropertyDescriptor(target, prop) {
        if (prop === 'then') return undefined;
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
      ownKeys(target) {
        return Reflect.ownKeys(target);
      },
      apply(target, thisArg, args) {
        if (process.env.DEBUG_DB_PROXY === '1') {
          console.log('WRAP APPLY target=', target && target.constructor?.name, 'typeof=', typeof target, 'hasThen=', !!target?.then);
        }
        if (typeof target !== 'function') {
          throw new TypeError('Attempted to call a non-function database proxy target');
        }
        return wrapThenable((target as any)(...args));
      },
    });
  }
  return value;
};

const createAsyncProxy = (promise: Promise<any>): any => new Proxy(() => {}, {
  get(_target, prop) {
    if (prop === 'then' || prop === 'catch' || prop === 'finally') {
      return (promise as any)[prop].bind(promise);
    }

    return createAsyncProxy(
      promise.then((target) => {
        const value = (target as any)[prop];
        if (process.env.DEBUG_DB_PROXY === '1') {
          console.log('DB_PROXY GET', String(prop), 'target=', target && target.constructor?.name, 'valueType=', typeof value, 'hasValue=', value !== undefined);
        }
        return wrapThenable(typeof value === 'function' ? value.bind(target) : value);
      })
    );
  },
  apply(_target, thisArg, args) {
    return createAsyncProxy(
      promise.then((target) => {
        if (process.env.DEBUG_DB_PROXY === '1') {
          console.log('DB_PROXY APPLY', 'target=', target && target.constructor?.name, 'typeof=', typeof target, 'args=', args.map((a) => a && a.constructor?.name));
        }
        if (typeof target !== 'function') {
          throw new TypeError('Attempted to call a non-function database proxy target');
        }
        return wrapThenable((target as any)(...args));
      })
    );
  },
});

export const db: any = createAsyncProxy(getDB());



