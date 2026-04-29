---
title: "MACD คืออะไร? วิธีใช้หาจังหวะซื้อขายหุ้น"
slug: macd-indicator-guide
category: เทคนิค
tags: [MACD, Technical Analysis, Indicator]
date: 2026-03-15
author: Money Street
excerpt: "อธิบาย MACD ตั้งแต่พื้นฐานการคำนวณ จนถึงวิธีอ่านสัญญาณ Crossover, Divergence และ Histogram พร้อมตัวอย่างการนำไปใช้จริง"
---

# MACD คืออะไร? วิธีใช้หาจังหวะซื้อขายหุ้น

MACD (Moving Average Convergence Divergence) เป็น Indicator ที่นักเทรดทั่วโลกนิยมใช้มากที่สุดตัวหนึ่ง เพราะมันรวมข้อมูลทั้ง Trend และ Momentum ไว้ด้วยกัน ช่วยให้รู้ว่าหุ้นกำลังมีแรงขึ้นหรือลงอยู่ในทิศทางใด

ถูกพัฒนาขึ้นในปี 1979 โดย Gerald Appel นักวิเคราะห์การเงินชาวอเมริกัน และยังคงเป็น Indicator พื้นฐานที่ใช้ได้ผลดีในยุคปัจจุบัน

---

## MACD คำนวณอย่างไร?

MACD ประกอบด้วย 3 ส่วนหลัก:

### 1. MACD Line (เส้น MACD)

```
MACD Line = EMA(12) - EMA(26)
```

- **EMA(12)** = Exponential Moving Average 12 วัน (ไวต่อราคา)
- **EMA(26)** = Exponential Moving Average 26 วัน (ช้า สะท้อน Trend)

เมื่อ EMA 12 อยู่เหนือ EMA 26 → MACD Line เป็นบวก → ราคามีแนวโน้มขึ้น

### 2. Signal Line (เส้น Signal)

```
Signal Line = EMA(9) ของ MACD Line
```

เส้น EMA 9 วันของ MACD Line ใช้สร้างสัญญาณซื้อขาย

### 3. Histogram

```
Histogram = MACD Line - Signal Line
```

แท่งกราฟที่แสดงความแตกต่างระหว่าง MACD กับ Signal
- แท่งบวก (เขียว) = MACD เหนือ Signal
- แท่งลบ (แดง) = MACD ใต้ Signal

---

## การตั้งค่า MACD

ค่าเริ่มต้นมาตรฐาน: **(12, 26, 9)**

| ค่า | ความหมาย |
|-----|----------|
| 12 | Fast EMA |
| 26 | Slow EMA |
| 9 | Signal Line Period |

**ปรับแต่งสำหรับ Style ต่างๆ:**
- Day Trade: (6, 13, 5) — ไวขึ้น สัญญาณมากขึ้น
- Swing Trade: (12, 26, 9) — มาตรฐาน
- Position Trade: (19, 39, 9) — ช้าลง กรองสัญญาณหลอก

---

## สัญญาณหลัก 3 แบบ

### สัญญาณที่ 1: MACD Crossover

นี่คือสัญญาณที่ง่ายและนิยมใช้มากที่สุด

**Bullish Crossover (สัญญาณซื้อ):**
- MACD Line ตัดขึ้นเหนือ Signal Line
- Histogram เปลี่ยนจากแดงเป็นเขียว
- บอกว่า Momentum กำลังเปลี่ยนเป็นขาขึ้น

**Bearish Crossover (สัญญาณขาย):**
- MACD Line ตัดลงใต้ Signal Line
- Histogram เปลี่ยนจากเขียวเป็นแดง
- บอกว่า Momentum กำลังเปลี่ยนเป็นขาลง

**เคล็ดลับ:** Crossover ที่เกิดใต้เส้น Zero Line (Oversold) มีความน่าเชื่อถือสูงกว่าที่เกิดเหนือ Zero Line

---

### สัญญาณที่ 2: Zero Line Crossover

- MACD Line ตัดขึ้นเหนือ Zero → สัญญาณบวกระยะกลาง
- MACD Line ตัดลงใต้ Zero → สัญญาณลบระยะกลาง

นี่เป็นสัญญาณที่ช้ากว่า Signal Crossover แต่น่าเชื่อถือกว่า เหมาะสำหรับ Position Trade

---

### สัญญาณที่ 3: MACD Divergence (สัญญาณที่ทรงพลังที่สุด)

Divergence คือเมื่อทิศทางของ MACD ไม่สอดคล้องกับทิศทางของราคา

#### Bullish Divergence (สัญญาณกลับตัวขาขึ้น)
- ราคาทำ Lower Low (ต่ำกว่าเดิม)
- MACD ทำ Higher Low (สูงกว่าเดิม)
- ความหมาย: แรงขายอ่อนตัวลงแล้ว อาจเกิดการกลับตัว

**ตัวอย่าง:**
```
ราคา:  100 → 90 → 85  (ต่ำลงเรื่อยๆ)
MACD:  -2 → -1.5 → -1 (สูงขึ้นเรื่อยๆ ทั้งที่ราคาลง)
→ Bullish Divergence
```

#### Bearish Divergence (สัญญาณกลับตัวขาลง)
- ราคาทำ Higher High (สูงกว่าเดิม)
- MACD ทำ Lower High (ต่ำกว่าเดิม)
- ความหมาย: แรงซื้ออ่อนตัว แรงขายกำลังมา

---

## วิธีอ่าน Histogram

Histogram ช่วยอ่านความแรงของ Momentum ได้ดี

**แท่ง Histogram กำลังสูงขึ้น** = Momentum แข็งแกร่งขึ้น (แม้ยังเป็นแดงอยู่ก็ตาม)
**แท่ง Histogram กำลังสั้นลง** = Momentum อ่อนตัวลง เตือนให้ระวัง

### สัญญาณจาก Histogram ที่น่าสนใจ

เมื่อ Histogram แดงเริ่มสั้นลงติดกัน 2-3 แท่ง → สัญญาณเตือนว่าแรงขายกำลังหมด อาจเตรียมเข้าซื้อ

---

## กลยุทธ์การใช้ MACD จริง

### กลยุทธ์ที่ 1: MACD + EMA 200 Filter

ใช้ EMA 200 กรองทิศทาง Trade เฉพาะที่สอดคล้องกับ Trend ใหญ่

**กฎ:**
- ราคาอยู่เหนือ EMA 200 → Trade เฉพาะ Bullish MACD Crossover
- ราคาอยู่ใต้ EMA 200 → Trade เฉพาะ Bearish MACD Crossover

ลด False Signal ได้มากกว่า 50%

---

### กลยุทธ์ที่ 2: MACD Divergence + Support

หา Bullish Divergence บน Support Level เป็นสัญญาณที่มีคุณภาพสูง

**ขั้นตอน:**
1. หา Support Level ที่สำคัญ
2. รอราคาลงมาแตะ Support
3. ตรวจสอบว่ามี Bullish Divergence บน MACD หรือไม่
4. รอ Bullish MACD Crossover เป็น Confirmation
5. เข้าซื้อ Stop Loss ใต้ Support

---

### กลยุทธ์ที่ 3: Multi-Timeframe MACD

- **Weekly MACD** — กำหนดทิศทางหลัก
- **Daily MACD** — หาจังหวะเข้า
- **4H MACD** — หาจุดเข้าแม่นยำ

เข้า Trade เมื่อทั้ง 3 Timeframe ให้สัญญาณทิศทางเดียวกัน

---

## ข้อจำกัดของ MACD

### 1. Lagging Indicator

MACD คำนวณจาก Moving Average ซึ่งตามหลังราคา ทำให้สัญญาณมาช้า บางครั้งราคาวิ่งไปแล้วมาก กว่า MACD จะให้สัญญาณ

### 2. False Signal ใน Sideways Market

ใน Choppy Market ที่ราคาไม่มีทิศทาง MACD ให้สัญญาณหลอกบ่อยมาก ควรหลีกเลี่ยงการเทรดตาม MACD ใน Sideways

### 3. ไม่บอกระดับ Overbought/Oversold ที่แน่นอน

ต่างจาก RSI ที่มีเส้น 30 และ 70 MACD ไม่มีระดับ Fixed ที่บอกว่า Overbought แล้ว

---

## เปรียบเทียบ MACD กับ RSI

| คุณสมบัติ | MACD | RSI |
|----------|------|-----|
| วัดอะไร | Trend + Momentum | Momentum |
| Overbought/Oversold | ไม่มีระดับชัดเจน | มี (70/30) |
| ใน Trending Market | ดีมาก | ดี |
| ใน Sideways Market | ไม่ดี | ดีกว่า |
| Divergence Signal | ดีมาก | ดี |

**แนะนำ:** ใช้ MACD ร่วมกับ RSI เสมอ เพื่อยืนยันสัญญาณกัน

---

## สรุป

MACD เป็น Indicator ที่ครบเครื่อง บอกทั้ง Trend, Momentum และ Divergence แต่ต้องใช้อย่างถูกวิธี:

1. อย่าเทรดสวน Trend ใหญ่
2. ใช้ร่วมกับ Indicator อื่นเสมอ
3. ระวัง False Signal ใน Sideways Market
4. Divergence คือสัญญาณที่ทรงพลังที่สุดของ MACD

เริ่มฝึกอ่าน MACD บน TradingView ฟรีได้เลย ดู Chart ย้อนหลังและหา Pattern ต่างๆ จนชำนาญก่อนใช้จริง

> ⚠️ บทความนี้เป็นเพียงข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำทางการเงิน ควรศึกษาเพิ่มเติมและปรึกษาผู้เชี่ยวชาญก่อนตัดสินใจลงทุน
