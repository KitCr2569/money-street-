# คู่มือติดตั้งและใช้งาน Money Street Standalone

วิเคราะห์หุ้นอเมริกา S&P 500 / Nasdaq-100 — เวอร์ชัน standalone สำหรับใช้งานคนเดียวบน local machine

---

## สารบัญ

1. [ความต้องการของระบบ](#1-ความต้องการของระบบ)
2. [ติดตั้ง](#2-ติดตั้ง)
3. [ตั้งค่า Environment Variables](#3-ตั้งค่า-environment-variables)
4. [รันแอป](#4-รันแอป)
5. [ฟีเจอร์และวิธีใช้งาน](#5-ฟีเจอร์และวิธีใช้งาน)
6. [คำสั่งที่มี](#6-คำสั่งที่มี)
7. [การสำรองข้อมูล](#7-การสำรองข้อมูล)
8. [FAQ & แก้ปัญหา](#8-faq--แก้ปัญหา)

---

## 1. ความต้องการของระบบ

- **Node.js** 18 ขึ้นไป (แนะนำ 20+)
- **npm** 9 ขึ้นไป
- พื้นที่ดิสก์ ~500MB (รวม node_modules)
- เบราว์เซอร์รุ่นใหม่ (Chrome, Firefox, Safari, Edge)

## 2. ติดตั้ง

```bash
# 1. เข้าโฟลเดอร์ standalone
cd standalone

# 2. ติดตั้ง dependencies
npm install

# 3. สร้างฐานข้อมูล SQLite
npm run db:push
```

ฐานข้อมูลจะถูกสร้างอัตโนมัติที่ `data/moneystreet.db`

## 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env.local` จาก template:

```bash
cp .env.example .env.local
```

แก้ไข `.env.local`:

```bash
# Finnhub API Key (ฟรี — ใช้สำหรับโลโก้หุ้น, ปฏิทิน earnings)
# สมัครได้ที่ https://finnhub.io/register
FINNHUB_API_KEY=your_key_here

# Anthropic API Key (สำหรับฟีเจอร์ AI วิเคราะห์หุ้น)
# สมัครได้ที่ https://console.anthropic.com
ANTHROPIC_API_KEY=your_key_here
```

> **หมายเหตุ**: ทั้งสอง key เป็น optional — แอปใช้งานได้โดยไม่ต้องใส่ แต่บางฟีเจอร์จะไม่ทำงาน

| ไม่มี Key | ผลกระทบ |
|-----------|---------|
| ไม่มี `FINNHUB_API_KEY` | ไม่แสดงโลโก้หุ้น, ไม่มีปฏิทิน earnings/IPO |
| ไม่มี `ANTHROPIC_API_KEY` | ไม่สามารถใช้ AI วิเคราะห์หุ้นได้ |

## 4. รันแอป

### Development (แนะนำ)

```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ **http://localhost:3456**

### Production

```bash
npm run build
npm run start
```

## 5. ฟีเจอร์และวิธีใช้งาน

### Watchlist — รายการจับตาหุ้น (`/watchlist`)

- เพิ่มหุ้นด้วยช่องค้นหา พิมพ์ชื่อหรือ symbol เช่น `AAPL`, `Apple`
- สร้างรายการจับตาได้หลายรายการ
- ดูราคา realtime, % เปลี่ยนแปลง, composite score
- คลิกชื่อหุ้นเพื่อดูโปรไฟล์บริษัท คลิกไอคอนกราฟเพื่อดูชาร์ต

### Stock Chart — กราฟวิเคราะห์ (`/stock/SYMBOL`)

- กราฟแท่งเทียน (candlestick) พร้อม volume
- เลือกช่วงเวลา: 1 วัน — 5 ปี
- ตัวชี้วัดทางเทคนิค: RSI, EMA, แนวรับ-แนวต้าน, เส้น trendline
- **Composite Score** (-5 ถึง +5) สรุปสัญญาณซื้อ-ขาย

### Company Profile — โปรไฟล์บริษัท (`/stock/SYMBOL/profile`)

- ข้อมูลบริษัท, อุตสาหกรรม, มูลค่าตลาด
- อัตราส่วนทางการเงิน (P/E, P/B, ROE ฯลฯ)
- บทวิเคราะห์ AI (ถ้ามี)

### Portfolio — จำลองพอร์ตลงทุน (`/portfolio`)

- สร้างพอร์ตได้หลายพอร์ต
- เพิ่มรายการซื้อ-ขาย
- คำนวณ cost basis, กำไร/ขาดทุน

### Discover — ค้นพบหุ้น (`/discover`)

- หุ้นจัดเรียงตามหมวดหมู่ (Technology, Healthcare, Finance ฯลฯ)
- กรองตามดัชนี S&P 500 / Nasdaq-100

### News — ข่าวหุ้น (`/news`)

- ข่าวล่าสุดจาก Yahoo Finance
- News Digest AI สรุปข่าวสำคัญ (ดูประวัติที่ `/news/history`)

### Analysis — ประวัติวิเคราะห์ AI (`/analysis`)

- รวมบทวิเคราะห์ที่สร้างโดย AI ทั้งหมด
- ค้นหาตาม symbol ได้

### Calendar — ปฏิทินตลาด (`/calendar`)

- วัน Earnings, IPO, Dividends (ข้อมูลจาก Finnhub)

### Indices — ดัชนีตลาด (`/indices`)

- รายชื่อหุ้นใน S&P 500, Nasdaq-100

### Articles — บทความ (`/articles`)

- บทความการลงทุนภาษาไทย

## 6. คำสั่งที่มี

| คำสั่ง | รายละเอียด |
|--------|-----------|
| `npm run dev` | รัน dev server ที่ port 3456 |
| `npm run build` | build สำหรับ production |
| `npm run start` | รัน production server |
| `npm run lint` | ตรวจสอบโค้ดด้วย ESLint |
| `npm run db:push` | สร้าง/อัปเดต schema ลง SQLite |
| `npm run db:studio` | เปิด Drizzle Studio ดูข้อมูลในฐานข้อมูล |

## 7. การสำรองข้อมูล

ข้อมูลทั้งหมด (watchlist, portfolio, alerts, settings) เก็บในไฟล์เดียว:

```
data/moneystreet.db
```

สำรองข้อมูลง่ายๆ แค่ copy ไฟล์นี้ไปเก็บไว้ที่อื่น:

```bash
cp data/moneystreet.db data/moneystreet-backup-$(date +%Y%m%d).db
```

## 8. FAQ & แก้ปัญหา

### Q: เปิดแอปแล้วขึ้น "Module not found: better-sqlite3"
รัน `npm install` ใหม่ — package นี้ต้อง compile native module ให้ตรงกับ OS

### Q: ราคาหุ้นไม่อัปเดต
ข้อมูลจาก Yahoo Finance มี delay ~15 นาที และอัปเดตเฉพาะเวลาตลาดเปิด (วันจันทร์-ศุกร์ 21:30-04:00 เวลาไทย)

### Q: AI วิเคราะห์ไม่ทำงาน
ตรวจสอบว่าใส่ `ANTHROPIC_API_KEY` ใน `.env.local` แล้ว

### Q: เปลี่ยน port ได้ไหม
แก้ไขใน `package.json` ที่ script `dev`:
```json
"dev": "next dev --port 8080"
```

### Q: รีเซ็ตข้อมูลทั้งหมด
ลบไฟล์ฐานข้อมูลแล้วสร้างใหม่:
```bash
rm data/moneystreet.db
npm run db:push
```

---

> **คำเตือน**: สัญญาณซื้อ-ขาย (Composite Score) และบทวิเคราะห์ AI เป็นเพียงเครื่องมือช่วยตัดสินใจ ไม่ใช่คำแนะนำทางการเงิน การลงทุนมีความเสี่ยง ผู้ลงทุนควรศึกษาข้อมูลก่อนตัดสินใจลงทุนทุกครั้ง
