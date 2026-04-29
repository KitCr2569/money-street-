# Money Street Standalone

วิเคราะห์หุ้นอเมริกา S&P 500 / Nasdaq-100 — เวอร์ชัน standalone สำหรับใช้งานคนเดียวบน local machine

## Quick Start

```bash
npm install
npm run db:push      # สร้าง SQLite database
npm run dev          # เปิด http://localhost:3456
```

## Features

- **Watchlist** สร้างรายการจับตาหุ้นได้หลายรายการ
- **Portfolio** จำลองพอร์ตลงทุน คำนวณ cost basis
- **Stock Chart** กราฟแท่งเทียน + RSI + EMA + แนวรับแนวต้าน + Composite Score
- **AI Analysis** วิเคราะห์หุ้นด้วย AI (ต้องมี Claude CLI)
- **News** ข่าวหุ้นจาก Yahoo Finance + MoneyStreet
- **Calendar** ปฏิทิน Earnings / IPO / Dividends
- **Indices** ดัชนี S&P 500, Nasdaq-100
- **Discover** หมวดหุ้นตามหมวดหมู่
- **Articles** บทความการลงทุน

## Optional Environment Variables

สร้างไฟล์ `.env.local`:

```bash
# Finnhub API Key (for stock logos, calendar)
FINNHUB_API_KEY=your_key_here

# Anthropic API Key (for AI analysis)
# ANTHROPIC_API_KEY=your_key_here
```

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- SQLite + Drizzle ORM (ข้อมูลเก็บใน `data/moneystreet.db`)
- Zustand (state management)
- SWR (data fetching + polling)
- Tailwind CSS v4 (dark theme)
- lightweight-charts v5
- yahoo-finance2

## Data Storage

ข้อมูลทั้งหมดเก็บใน `data/moneystreet.db` (SQLite)
สำรองข้อมูลง่ายๆ แค่ copy ไฟล์ .db ไปเก็บไว้

## Commands

```bash
npm run dev          # Dev server (port 3456)
npm run build        # Production build
npm run start        # Start production server
npm run db:push      # Push schema to SQLite
npm run db:studio    # Drizzle Studio (DB GUI)
npm run lint         # ESLint
```

## Note

- ข้อมูลหุ้นจาก Yahoo Finance (มี delay ~15 นาที)
- สัญญาณซื้อ-ขายเป็นเพียงเครื่องมือช่วยวิเคราะห์ ไม่ใช่คำแนะนำทางการเงิน
