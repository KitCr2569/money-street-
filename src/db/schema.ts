import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

// ===== Watchlist =====

export const watchlistLists = sqliteTable('watchlist_lists', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const watchlistItems = sqliteTable(
  'watchlist_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    listId: text('list_id')
      .notNull()
      .references(() => watchlistLists.id, { onDelete: 'cascade' }),
    symbol: text('symbol').notNull(),
    pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
    addedAt: text('added_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('idx_watchlist_items_list').on(t.listId),
    uniqueIndex('idx_watchlist_items_unique').on(t.listId, t.symbol),
  ]
);

// ===== Portfolio =====

export const portfolioHoldings = sqliteTable(
  'portfolio_holdings',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    symbol: text('symbol').notNull(),
    portfolioName: text('portfolio_name').notNull().default('default'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    uniqueIndex('idx_portfolio_holdings_unique').on(t.portfolioName, t.symbol),
  ]
);

export const portfolioLots = sqliteTable(
  'portfolio_lots',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    holdingId: text('holding_id')
      .notNull()
      .references(() => portfolioHoldings.id, { onDelete: 'cascade' }),
    shares: real('shares').notNull(),
    price: real('price').notNull(),
    date: text('date').notNull(),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [index('idx_portfolio_lots_holding').on(t.holdingId)]
);

// ===== Price Alerts =====

export const priceAlerts = sqliteTable('price_alerts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  symbol: text('symbol').notNull(),
  targetPrice: real('target_price').notNull(),
  direction: text('direction').notNull(), // 'above' | 'below'
  source: text('source').notNull(), // 'support' | 'resistance' | 'custom'
  triggered: integer('triggered', { mode: 'boolean' }).notNull().default(false),
  triggeredAt: text('triggered_at'),
  dismissed: integer('dismissed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ===== User Settings (single row, id=1) =====

export const userSettings = sqliteTable('user_settings', {
  id: integer('id').primaryKey().default(1),
  watchlistRange: text('watchlist_range').default('6mo'),
  watchlistSortKey: text('watchlist_sort_key').default('change'),
  watchlistSortAsc: integer('watchlist_sort_asc', { mode: 'boolean' }).default(false),
  watchlistFilter: text('watchlist_filter').default('all'),
  showTags: integer('show_tags', { mode: 'boolean' }).default(true),
  homeWatchlistId: text('home_watchlist_id').default(''),
  watchlistShowAll: integer('watchlist_show_all', { mode: 'boolean' }).default(false),
  activeListId: text('active_list_id').default(''),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ===== Site Settings =====

export const siteSettings = sqliteTable('site_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// ===== AI Content Index =====

export const aiContent = sqliteTable(
  'ai_content',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: text('type').notNull(), // 'analysis' | 'news-digest' | 'profile'
    filename: text('filename').notNull().unique(),
    symbol: text('symbol'),
    date: text('date'),
    time: text('time'),
    range: text('range'),
    mode: text('mode'),
    strategy: text('strategy'),
    title: text('title'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('idx_ai_content_type').on(t.type),
    index('idx_ai_content_symbol').on(t.symbol),
  ]
);

// ===== Bot Trades (Paper Trading) =====

export const botTrades = sqliteTable(
  'bot_trades',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    symbol: text('symbol').notNull(),
    side: text('side').notNull(), // 'buy' | 'sell'
    shares: real('shares').notNull(),
    entryPrice: real('entry_price').notNull(),
    exitPrice: real('exit_price'),
    stopLoss: real('stop_loss').notNull(),
    takeProfit1: real('take_profit_1').notNull(),
    takeProfit2: real('take_profit_2').notNull(),
    highestPrice: real('highest_price').notNull(),
    strategy: text('strategy').notNull(), // 'mean_reversion' | 'trend_following' | 'breakout'
    signalScore: real('signal_score').notNull(),
    confidence: real('confidence').notNull(),
    status: text('status').notNull().default('open'), // 'open' | 'closed' | 'stopped'
    exitReason: text('exit_reason'), // 'stop_loss' | 'take_profit' | 'trailing_stop' | 'manual'
    pnl: real('pnl'),
    pnlPercent: real('pnl_percent'),
    entryAt: text('entry_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    exitAt: text('exit_at'),
  },
  (t) => [
    index('idx_bot_trades_symbol').on(t.symbol),
    index('idx_bot_trades_status').on(t.status),
    index('idx_bot_trades_entry').on(t.entryAt),
  ]
);

// ===== Bot Portfolio State =====

export const botPortfolio = sqliteTable('bot_portfolio', {
  id: integer('id').primaryKey().default(1),
  cash: real('cash').notNull().default(100000),
  totalValue: real('total_value').notNull().default(100000),
  peakValue: real('peak_value').notNull().default(100000),
  initialCapital: real('initial_capital').notNull().default(100000),
  totalTrades: integer('total_trades').notNull().default(0),
  winTrades: integer('win_trades').notNull().default(0),
  lossTrades: integer('loss_trades').notNull().default(0),
  totalPnl: real('total_pnl').notNull().default(0),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ===== Bot Signals Log =====

export const botSignals = sqliteTable(
  'bot_signals',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    symbol: text('symbol').notNull(),
    signalType: text('signal_type').notNull(), // 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
    totalScore: real('total_score').notNull(),
    normalizedScore: integer('normalized_score').notNull(),
    strategy: text('strategy').notNull(),
    confidence: real('confidence').notNull(),
    price: real('price').notNull(),
    stopLoss: real('stop_loss').notNull(),
    takeProfit1: real('take_profit_1').notNull(),
    factors: text('factors').notNull(), // JSON string of FactorScore[]
    executed: integer('executed', { mode: 'boolean' }).notNull().default(false),
    aiConfirmed: integer('ai_confirmed', { mode: 'boolean' }),
    aiReason: text('ai_reason'),
    createdAt: text('created_at')
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (t) => [
    index('idx_bot_signals_symbol').on(t.symbol),
    index('idx_bot_signals_type').on(t.signalType),
    index('idx_bot_signals_created').on(t.createdAt),
  ]
);

// ===== Bot Settings =====

export const botSettings = sqliteTable('bot_settings', {
  id: integer('id').primaryKey().default(1),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
  initialCapital: real('initial_capital').notNull().default(100000),
  maxPositionPct: real('max_position_pct').notNull().default(0.05),
  maxDrawdownPct: real('max_drawdown_pct').notNull().default(0.10),
  maxOpenPositions: integer('max_open_positions').notNull().default(10),
  riskRewardMinimum: real('risk_reward_minimum').notNull().default(1.5),
  trailingStopPct: real('trailing_stop_pct').notNull().default(0.05),
  scanIntervalMinutes: integer('scan_interval_minutes').notNull().default(30),
  scanSymbols: text('scan_symbols').notNull().default('[]'), // JSON array of symbols
  autoTrade: integer('auto_trade', { mode: 'boolean' }).notNull().default(false),
  useAiConfirm: integer('use_ai_confirm', { mode: 'boolean' }).notNull().default(true),
  lastScanAt: text('last_scan_at'),
  updatedAt: text('updated_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
