---
title: "Bollinger Bands คืออะไร? ดู Overbought/Oversold"
slug: bollinger-bands-guide
category: เทคนิค
tags: [Bollinger Bands, Technical Analysis, Volatility]
date: 2026-03-15
author: Money Street
excerpt: "เรียนรู้ Bollinger Bands ตั้งแต่วิธีคำนวณ การอ่านสัญญาณ Squeeze, Breakout และ %B เพื่อระบุโอกาสซื้อขายในตลาดหุ้น"
---

# Bollinger Bands คืออะไร? ดู Overbought/Oversold

Bollinger Bands เป็น Indicator ที่พัฒนาโดย John Bollinger ในช่วงทศวรรษ 1980 ความพิเศษของมันคือการวัด **Volatility** (ความผันผวน) ของตลาดแบบ Dynamic ทำให้แถบกว้างแคบตามความผันผวนจริงของตลาด ต่างจาก Channel แบบเก่าที่กว้างคงที่

ปัจจุบัน Bollinger Bands เป็นหนึ่งใน Indicator ที่นักเทรดมืออาชีพใช้มากที่สุด เพราะอ่านง่ายและให้ข้อมูลที่ครบถ้วน

---

## โครงสร้างของ Bollinger Bands

Bollinger Bands ประกอบด้วย 3 เส้น:

### เส้นกลาง (Middle Band)

```
Middle Band = SMA(20)  — Simple Moving Average 20 วัน
```

### แถบบน (Upper Band)

```
Upper Band = SMA(20) + (2 × Standard Deviation)
```

### แถบล่าง (Lower Band)

```
Lower Band = SMA(20) - (2 × Standard Deviation)
```

**Standard Deviation** คือค่าที่บอกว่าราคาผันผวนแค่ไหนจากค่าเฉลี่ย เมื่อตลาดผันผวนสูง แถบจะกว้างออก เมื่อตลาดนิ่ง แถบจะแคบลง

### สถิติสำคัญ

ตามหลักคณิตศาสตร์ เมื่อใช้ 2 Standard Deviation:
- **95%** ของราคาจะอยู่ภายใน Band
- มีเพียง **5%** ที่ราคาจะออกนอก Band

---

## การตั้งค่า Bollinger Bands

ค่ามาตรฐาน: **Period = 20, Multiplier = 2**

| Style | Period | Multiplier |
|-------|--------|------------|
| Short-term | 10 | 1.5 |
| Standard | 20 | 2.0 |
| Long-term | 50 | 2.5 |

สำหรับมือใหม่ แนะนำใช้ค่ามาตรฐาน 20,2 ไปก่อน

---

## การอ่านสัญญาณหลัก

### 1. Bollinger Squeeze — ลูกระเบิดกำลังติดสปริง

**ลักษณะ:** แถบบนและล่างแคบมากผิดปกติ (Band Width แคบที่สุดในรอบ 6 เดือน)

**ความหมาย:** ตลาดกำลังนิ่ง ผู้เล่นกำลังรอ ก่อนจะเกิด **Explosive Move** ใหญ่ ไม่ว่าจะขึ้นหรือลง

**วิธีรับมือ:**
- อย่าเข้าก่อน รอดูทิศทาง
- ตั้ง Alert เมื่อราคาทะลุ Upper หรือ Lower Band
- เตรียม Order ทั้งสองทิศทาง

> ประวัติศาสตร์บอกว่าหลัง Squeeze มักเกิด Breakout ที่ใหญ่กว่าค่าเฉลี่ย 3-5 เท่า

---

### 2. Breakout จาก Band — สัญญาณ Trend

**Upper Breakout:** ราคาปิดเหนือ Upper Band

ใน Trending Market = สัญญาณ Uptrend แข็งแกร่ง ไม่ใช่ Overbought!

> **ความเข้าใจผิดที่พบบ่อย:** หลายคนคิดว่าราคาแตะ Upper Band = ขาย นั่นผิด! ใน Strong Uptrend ราคาสามารถ "เดิน" ตาม Upper Band ได้นาน ๆ

**Lower Breakout:** ราคาปิดใต้ Lower Band

ใน Downtrend = แรงขายแรง อาจยังไม่ใช่จุดซื้อ

---

### 3. Mean Reversion — กลับสู่ค่าเฉลี่ย

ใน **Sideways Market** ราคามักกลับมาสู่เส้นกลาง (SMA 20) หลังแตะ Band

**กลยุทธ์ Mean Reversion:**
1. รอราคาลงมาแตะ Lower Band
2. รอสัญญาณกลับตัว (Bullish Candlestick)
3. เข้าซื้อ Take Profit ที่ Middle Band (SMA 20)
4. Stop Loss ใต้ Lower Band

**คำเตือน:** ใช้ได้ดีใน Sideways เท่านั้น ใน Downtrend ราคาสามารถ "เดิน" ตาม Lower Band ได้

---

### 4. W-Bottom Pattern — รูปตัว W

Pattern กลับตัวที่ทรงพลังที่สุดของ Bollinger Bands:

1. ราคาลงมาแตะ Lower Band (Low 1)
2. Bounce กลับขึ้นสู่ Middle Band
3. ราคาลงมาอีกครั้ง แต่**ไม่แตะ Lower Band** (Low 2 สูงกว่า Low 1)
4. ราคาทะลุ Upper Band ขึ้นไป

Low 2 ที่ไม่แตะ Lower Band = แรงขายอ่อนลงแล้ว สัญญาณกลับตัวชัดมาก

---

### 5. M-Top Pattern — รูปตัว M

ตรงข้ามกับ W-Bottom:
1. ราคาขึ้นทะลุ Upper Band (High 1)
2. Pullback ลงมา Middle Band
3. ราคาขึ้นอีก แต่**ไม่ทะลุ Upper Band** (High 2 ต่ำกว่า High 1)
4. ราคาทะลุ Lower Band ลงไป

สัญญาณกลับตัวขาลงที่น่าเชื่อถือ

---

## %B และ Bandwidth — Indicator เสริม

### %B (Percent B)

วัดว่าราคาอยู่ตรงไหนภายใน Band:

```
%B = (ราคาปัจจุบัน - Lower Band) / (Upper Band - Lower Band)
```

| %B | ความหมาย |
|----|----------|
| > 1.0 | เหนือ Upper Band |
| = 1.0 | อยู่บน Upper Band |
| = 0.5 | อยู่กลาง Band (SMA 20) |
| = 0.0 | อยู่บน Lower Band |
| < 0.0 | ใต้ Lower Band |

### Bandwidth

```
Bandwidth = (Upper Band - Lower Band) / Middle Band × 100
```

ใช้วัด Volatility โดยตรง ค่าต่ำ = Squeeze กำลังเกิด

---

## กลยุทธ์การใช้ Bollinger Bands

### กลยุทธ์ที่ 1: Squeeze Breakout

1. ตั้ง Bandwidth Alert ที่ต่ำผิดปกติ
2. รอ Breakout จาก Band
3. เข้าเทรดตามทิศทาง Breakout
4. Stop Loss ที่ Middle Band

**Risk/Reward ดีมาก** เพราะหลัง Squeeze มักวิ่งได้ไกล

---

### กลยุทธ์ที่ 2: Riding the Band

ใน Strong Trend ให้ "ขี่" ตาม Band:

**Uptrend:**
- เข้าซื้อเมื่อราคา Pullback มา Middle Band (SMA 20)
- Hold ตราบที่ราคาอยู่เหนือ Middle Band
- ออกเมื่อราคาหลุดใต้ Middle Band

---

### กลยุทธ์ที่ 3: Bollinger Bands + RSI

ยืนยันสัญญาณ Overbought/Oversold:

**ซื้อเมื่อ:**
- ราคาแตะ Lower Band + RSI < 30

**ขายเมื่อ:**
- ราคาแตะ Upper Band + RSI > 70

สัญญาณ Double Confirmation มีความน่าเชื่อถือสูงกว่าใช้อย่างใดอย่างหนึ่ง

---

## ข้อควรระวัง

1. **ไม่เหมาะกับ Trending Market ในการ Reverse** — อย่าขายชอร์ตแค่เพราะราคาแตะ Upper Band ใน Uptrend

2. **Period ส่งผลมาก** — Period 20 เหมาะกับ Daily Chart ใน Hourly อาจต้องปรับเป็น 50-100

3. **ต้องรู้บริบทก่อนว่าตลาดเป็น Trending หรือ Sideways** เพื่อเลือกกลยุทธ์ที่ถูกต้อง

---

## สรุป

Bollinger Bands เป็นเครื่องมือที่หลายมิติ ใช้ได้ทั้งวัด Volatility, หาสัญญาณ Breakout และหาจุด Mean Reversion สิ่งสำคัญคือต้องรู้ว่าตอนนี้ตลาดเป็น Trending หรือ Sideways แล้วค่อยเลือกกลยุทธ์ที่เหมาะสม

เริ่มฝึกดู Squeeze ก่อน เพราะเป็นสัญญาณที่มองเห็นชัดและให้ Risk/Reward ดีที่สุด

> ⚠️ บทความนี้เป็นเพียงข้อมูลเพื่อการศึกษา ไม่ใช่คำแนะนำทางการเงิน ควรศึกษาเพิ่มเติมและปรึกษาผู้เชี่ยวชาญก่อนตัดสินใจลงทุน
