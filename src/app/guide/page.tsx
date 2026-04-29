'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

// ── Section data ──

interface GuideSection {
  id: string;
  icon: string;
  title: string;
  description: string;
  items: { title: string; detail: string }[];
}

const SECTIONS: GuideSection[] = [
  {
    id: 'search',
    icon: '🔍',
    title: 'ค้นหาหุ้น',
    description: 'ค้นหาหุ้นได้ทันทีจากทุกหน้า ผ่าน Search Bar มุมขวาบน',
    items: [
      { title: 'พิมพ์ชื่อหุ้นหรือ Symbol', detail: 'เช่น พิมพ์ "AAPL" หรือ "Apple" จะแสดงผลลัพธ์แบบ Real-time รองรับทั้งตลาด US, Crypto และอื่นๆ' },
      { title: 'เลือกจากผลลัพธ์', detail: 'คลิกที่ชื่อหุ้นจะไปหน้า Company Profile ดูข้อมูลบริษัท หรือคลิกไอคอนกราฟเพื่อดูแผนภูมิ Candlestick' },
      { title: 'ใช้คีย์บอร์ด', detail: 'กดลูกศรขึ้น/ลงเพื่อเลือก แล้วกด Enter เพื่อไปหน้าที่ต้องการ' },
    ],
  },
  {
    id: 'watchlist',
    icon: '👁️',
    title: 'รายการจับตา (Watchlist)',
    description: 'สร้างรายการหุ้นที่สนใจ ติดตามราคาและสัญญาณทางเทคนิคแบบ Real-time',
    items: [
      { title: 'สร้าง Watchlist หลายรายการ', detail: 'คลิก "+ สร้าง" เพื่อสร้าง Watchlist ใหม่ ตั้งชื่อตามต้องการ เช่น "หุ้น Tech", "หุ้นปันผล" — มี Watchlist ได้ไม่จำกัด' },
      { title: 'เพิ่ม/ลบหุ้น', detail: 'ค้นหาหุ้นแล้วกด "เพิ่มเข้า Watchlist" หรือเพิ่มจากหน้า Discover, Indices ได้โดยตรง กดถังขยะเพื่อลบออก' },
      { title: 'ปักหมุดหุ้นสำคัญ', detail: 'กดไอคอน 📌 เพื่อปักหมุด หุ้นที่ปักหมุดจะแสดงอยู่ด้านบนเสมอ' },
      { title: 'เรียงลำดับ', detail: 'เรียงตาม "เปลี่ยนแปลง %" (ขึ้น/ลงเยอะสุด), "ชื่อหุ้น" (A-Z), หรือ "สัญญาณ" (คะแนน Composite Score)' },
      { title: 'กรองหุ้น', detail: 'กดปุ่ม Oversold (RSI ≤ 30), Overbought (RSI ≥ 70), หรือสัญญาณซื้อ (คะแนน ≥ 2) เพื่อกรองเฉพาะหุ้นที่สนใจ' },
      { title: 'ตั้งค่าคอลัมน์', detail: 'กด "⚙ คอลัมน์" เพื่อเลือกว่าจะแสดงคอลัมน์ไหนบ้าง: โวลุ่ม, RSI, EMA, แนวรับ/ต้าน, เทรนด์, ATH, สัญญาณ' },
      { title: 'เลือกช่วงเวลา', detail: 'เลือก 1W, 1M, 3M, 6M, 1Y, 2Y, 5Y เพื่อเปลี่ยนช่วงเวลาวิเคราะห์ของหุ้นทั้ง Watchlist' },
    ],
  },
  {
    id: 'chart',
    icon: '📈',
    title: 'กราฟหุ้น & ราคา',
    description: 'ดูกราฟ Candlestick แบบ Real-time พร้อมเครื่องมือวิเคราะห์ทางเทคนิค',
    items: [
      { title: 'Candlestick Chart', detail: 'แผนภูมิแท่งเทียนแบบมืออาชีพ แสดงราคา Open, High, Low, Close — รองรับ 7 ช่วงเวลาตั้งแต่ 1 สัปดาห์ถึง 5 ปี' },
      { title: 'ราคา Real-time', detail: 'ราคาอัปเดตทุก 15 วินาที แสดงราคาปัจจุบัน, เปลี่ยนแปลง, สูงสุด/ต่ำสุดวัน, ปริมาณ, มูลค่าตลาด' },
      { title: 'ราคา Extended Hours', detail: 'แสดงราคา Pre-Market (ก่อนตลาดเปิด) และ After-Hours (หลังตลาดปิด) ใต้ราคาปกติ พร้อม % เปลี่ยนแปลง' },
      { title: 'แนวรับ / แนวต้าน', detail: 'เส้นแนวรับ (สีเขียว) และแนวต้าน (สีแดง) คำนวณอัตโนมัติจากข้อมูลราคาย้อนหลัง แสดงจำนวนครั้งที่ราคาเด้ง (strength)' },
      { title: 'เส้น EMA', detail: 'เส้นค่าเฉลี่ยเคลื่อนที่ EMA 20, 50, 100, 200 วัน เปิด/ปิดแสดงได้ตามต้องการ' },
      { title: 'RSI Chart', detail: 'กราฟ RSI(14) แยกด้านล่าง แสดงโซน Overbought (≥70) และ Oversold (≤30)' },
      { title: 'Trendlines', detail: 'เส้นเทรนด์อัตโนมัติ — เทรนด์ระยะสั้น (30% ล่าสุด) และเทรนด์ระยะยาว (ทั้งหมด)' },
    ],
  },
  {
    id: 'technical',
    icon: '🧮',
    title: 'วิเคราะห์ทางเทคนิค',
    description: 'ระบบวิเคราะห์อัตโนมัติให้คะแนนสัญญาณซื้อ/ขาย ตั้งแต่ -5 ถึง +5',
    items: [
      { title: 'Composite Score (-5 ถึง +5)', detail: 'คะแนนรวมจาก 5 ปัจจัย: RSI, EMA Crossover, แนวรับ/ต้าน, เทรนด์, ระยะห่างจาก ATH — ยิ่งบวกมากยิ่งเป็นสัญญาณซื้อ' },
      { title: 'RSI (Relative Strength Index)', detail: 'ค่า RSI 14 วัน: ≤ 30 = ขายมากเกิน (โอกาสเด้งกลับ), ≥ 70 = ซื้อมากเกิน (ระวังปรับฐาน)' },
      { title: 'สัญญาณ EMA', detail: 'เปรียบเทียบราคากับ EMA 20/50/100: 🟢 ราคาอยู่เหนือ = ขาขึ้น, 🔻 ราคาอยู่ใต้ = ขาลง' },
      { title: 'แนวรับ/ต้านใกล้สุด', detail: 'แสดงแนวรับ/ต้านที่ใกล้ราคาปัจจุบันที่สุด พร้อม % ห่างจากราคา — ใช้ตัดสินใจจุดเข้า/ออก' },
      { title: 'เทรนด์', detail: '🚀 ขาขึ้น หรือ 📉 ขาลง — วิเคราะห์จากทิศทาง Trendline ระยะยาว' },
      { title: 'ATH (All-Time High)', detail: 'แสดง 52-week high พร้อม % ที่ราคาห่างจาก ATH — ถ้า ≥ -0.5% แสดง 🔥 ATH' },
    ],
  },
  {
    id: 'alerts',
    icon: '🔔',
    title: 'แจ้งเตือนราคา (Price Alerts)',
    description: 'ตั้งการแจ้งเตือนเมื่อราคาถึงเป้าหมาย ไม่พลาดจังหวะซื้อ/ขาย',
    items: [
      { title: 'แจ้งเตือนแนวรับ', detail: 'ในตาราง Watchlist คลิก 🔕 ใต้แนวรับ จะเปิด Modal ให้กำหนดราคาแจ้งเตือน — เมื่อราคาลดลงถึงแนวรับจะแจ้งเตือน' },
      { title: 'แจ้งเตือนแนวต้าน', detail: 'คลิก 🔕 ใต้แนวต้าน เพื่อตั้งเตือนเมื่อราคาทะลุแนวต้าน — ใช้จับจังหวะ Breakout' },
      { title: 'การทำงาน', detail: 'ระบบเช็คราคาทุก 15 วินาที — เมื่อราคาถึงเป้า จะแสดง Toast notification และไฮไลท์แถวหุ้นในตาราง' },
      { title: 'จัดการแจ้งเตือน', detail: 'คลิก 🔔 เพื่อยกเลิกแจ้งเตือน คลิกแถวที่ไฮไลท์เพื่อ Dismiss การแจ้งเตือนที่ทำงานแล้ว' },
    ],
  },
  {
    id: 'profile',
    icon: '🏢',
    title: 'ข้อมูลบริษัท (Company Profile)',
    description: 'ดูข้อมูลบริษัทเชิงลึก ตัวเลขการเงิน และคำแนะนำนักวิเคราะห์',
    items: [
      { title: 'ข้อมูลพื้นฐาน', detail: 'Market Cap, P/E Ratio, Revenue, Profit Margins, ROE, Free Cash Flow, Beta — อัปเดตจาก Yahoo Finance' },
      { title: 'งบดุล', detail: 'Total Cash, Total Debt, Debt-to-Equity Ratio — ดูสุขภาพการเงินของบริษัท' },
      { title: 'คำแนะนำนักวิเคราะห์', detail: 'Analyst Consensus (Buy/Hold/Sell), Target Price (ต่ำสุด/เฉลี่ย/สูงสุด), จำนวนนักวิเคราะห์' },
      { title: 'วิเคราะห์งบการเงิน (Pro)', detail: 'Scorecard 100 คะแนน ครอบคลุม Profitability, Growth, Valuation, Balance Sheet — สร้างโดย AI' },
      { title: 'สรุปบริษัทโดย AI (Pro)', detail: 'บทสรุปภาษาไทยเกี่ยวกับธุรกิจ จุดเด่น ความเสี่ยง สร้างโดย AI' },
    ],
  },
  {
    id: 'portfolio',
    icon: '💼',
    title: 'พอร์ตการลงทุน',
    description: 'บันทึกการซื้อหุ้น คำนวณต้นทุน กำไร/ขาดทุน แบบ Real-time',
    items: [
      { title: 'เพิ่มหุ้นเข้าพอร์ต', detail: 'กรอก Symbol, จำนวนหุ้น, ราคาซื้อ, วันที่ซื้อ — รองรับการซื้อหลาย Lot (ซื้อหลายรอบ)' },
      { title: 'ต้นทุนเฉลี่ย (Average Cost)', detail: 'คำนวณราคาต้นทุนเฉลี่ยอัตโนมัติ จากทุก Lot ที่ซื้อ' },
      { title: 'กำไร/ขาดทุน Real-time', detail: 'แสดงมูลค่าปัจจุบัน, กำไร/ขาดทุน ($, %) อัปเดตตามราคาตลาด' },
      { title: 'What-if Simulator', detail: 'จำลองว่าถ้าซื้อเพิ่มอีก X หุ้นที่ราคา Y ต้นทุนเฉลี่ยจะเปลี่ยนเป็นเท่าไหร่' },
    ],
  },
  {
    id: 'popular-portfolio',
    icon: '🌟',
    title: 'พอร์ตยอดนิยม',
    description: 'สำรวจพอร์ตการลงทุนที่ออกแบบมาแล้ว พร้อมจำลองด้วยเงินลงทุนของคุณ',
    items: [
      { title: '6+ Template พอร์ต', detail: 'Magnificent 7, AI All-In, Balanced Growth, Dividend Income, Space & Defense, Lazy 3-ETF — ออกแบบโดยทีมงาน' },
      { title: 'กรอกเงินลงทุน', detail: 'ใส่จำนวนเงินที่ต้องการลงทุน ระบบจะคำนวณจำนวนหุ้นและสัดส่วนให้อัตโนมัติตาม Allocation ของแต่ละพอร์ต' },
      { title: 'ดูรายละเอียด', detail: 'แสดง Allocation % ของแต่ละหุ้น, จำนวนหุ้นที่ซื้อได้, มูลค่าที่ลงทุน' },
    ],
  },
  {
    id: 'discover',
    icon: '🧭',
    title: 'หมวดหุ้น (Discover)',
    description: 'ค้นพบหุ้นใหม่ๆ จากหมวดหมู่ที่คัดมาแล้ว',
    items: [
      { title: '8+ หมวดหมู่', detail: 'Tech, Healthcare, Finance, Energy, Consumer, Industrial และอื่นๆ — แต่ละหมวดมีหุ้นยอดนิยมคัดสรรมาให้' },
      { title: 'เพิ่มเข้า Watchlist', detail: 'กด "เพิ่มทั้งหมด" เพื่อเพิ่มหุ้นทั้งหมวดเข้า Watchlist ในคลิกเดียว หรือเลือกเพิ่มทีละตัว' },
      { title: 'ลิงก์ไปหน้าหุ้น', detail: 'คลิกชื่อหุ้นเพื่อดู Company Profile หรือคลิกไอคอนกราฟเพื่อดู Chart' },
    ],
  },
  {
    id: 'indices',
    icon: '📊',
    title: 'ดัชนี (Indices)',
    description: 'เรียกดูหุ้นทั้งหมดในดัชนี S&P 500 และ Nasdaq-100',
    items: [
      { title: 'S&P 500 & Nasdaq-100', detail: 'แสดงหุ้นทั้งหมดในดัชนี พร้อม Logo, ชื่อบริษัท, หมวดธุรกิจ, Market Cap' },
      { title: 'กรองตามหมวดธุรกิจ', detail: 'คลิกชื่อหมวด (เทคโนโลยี, สุขภาพ, การเงิน ฯลฯ) เพื่อกรองเฉพาะหุ้นในหมวดนั้น แสดงจำนวนหุ้นในแต่ละหมวด' },
      { title: 'ค้นหาในดัชนี', detail: 'พิมพ์ค้นหาตาม Symbol หรือชื่อบริษัทเพื่อหาหุ้นที่ต้องการอย่างรวดเร็ว' },
      { title: 'ลิงก์ไปหน้าวิเคราะห์', detail: 'แต่ละหุ้นมีลิงก์ไปหน้า Chart (📊) และวิเคราะห์งบการเงิน (🔍)' },
    ],
  },
  {
    id: 'news',
    icon: '📰',
    title: 'ข่าวหุ้น',
    description: 'ข่าวสารล่าสุดจาก Yahoo Finance และ Finnhub รวมศูนย์ในที่เดียว',
    items: [
      { title: 'ข่าวจาก 2 แหล่ง', detail: 'รวมข่าวจาก Yahoo Finance และ Finnhub เลือกกรองตาม Provider ได้' },
      { title: 'ข่าวเฉพาะหุ้น', detail: 'กรองข่าวเฉพาะหุ้นที่อยู่ใน Watchlist หรือหุ้นที่สนใจ' },
      { title: 'AI สรุปข่าว (Pro)', detail: 'คลิก "AI สรุป" เพื่อให้ AI แปลและสรุปข่าวเป็นภาษาไทย พร้อมวิเคราะห์ผลกระทบต่อราคาหุ้น' },
      { title: 'ประวัติข่าวที่สรุป', detail: 'ดูข่าวที่ AI เคยสรุปไว้ทั้งหมดที่หน้า "ประวัติข่าว" พร้อม Pagination' },
    ],
  },
  {
    id: 'calendar',
    icon: '📅',
    title: 'ปฏิทิน (Calendar)',
    description: 'ปฏิทินแสดงเหตุการณ์สำคัญ: Earnings, IPO, Dividend จาก Finnhub',
    items: [
      { title: 'Earnings (รายงานผลประกอบการ)', detail: 'วันที่รายงาน, EPS คาดการณ์ vs จริง, Revenue คาดการณ์ vs จริง, ช่วงเวลา (ก่อน/หลังตลาดเปิด)' },
      { title: 'IPO (หุ้นเข้าตลาดใหม่)', detail: 'วันที่ IPO, ช่วงราคา, จำนวนหุ้น, ตลาดที่เข้า' },
      { title: 'Dividend (จ่ายปันผล)', detail: 'วันขึ้นเครื่องหมาย, จำนวนปันผล, วันจ่าย, วัน Record Date' },
      { title: 'เลือกดูตามเดือน', detail: 'เลื่อนดูย้อนหลัง/อนาคตได้ คลิกวันที่เพื่อดูเหตุการณ์ทั้งหมดของวันนั้น' },
    ],
  },
  {
    id: 'ai',
    icon: '🤖',
    title: 'AI วิเคราะห์ (Pro)',
    description: 'ระบบวิเคราะห์หุ้นด้วย AI สร้างบทวิเคราะห์ภาษาไทยแบบเชิงลึก',
    items: [
      { title: '3 กรอบเวลา', detail: 'รายสัปดาห์ (Swing Trade 1-2 สัปดาห์), รายเดือน (1-3 เดือน), ระยะยาว (1+ ปี) — เลือกกลยุทธ์ที่เหมาะกับ Style การลงทุน' },
      { title: 'วิเคราะห์เดี่ยว', detail: 'คลิก 🤖 ที่แถวหุ้นใน Watchlist เพื่อเปิดบทวิเคราะห์ AI ของหุ้นนั้น' },
      { title: 'วิเคราะห์ทั้ง Watchlist', detail: 'คลิก "🤖 AI วิเคราะห์" เพื่อวิเคราะห์หุ้นทั้งหมดใน Watchlist พร้อมกัน' },
      { title: 'ประวัติบทวิเคราะห์', detail: 'ทุกบทวิเคราะห์ถูกบันทึกไว้ — เข้าดูย้อนหลังได้ที่หน้า "ประวัติวิเคราะห์" จัดกลุ่มตามวัน' },
      { title: 'วิเคราะห์งบการเงิน', detail: 'Scorecard 100 คะแนน ครอบคลุม 4 ด้าน: Profitability, Growth, Valuation, Balance Sheet' },
    ],
  },
  {
    id: 'articles',
    icon: '✏️',
    title: 'บทความ',
    description: 'บทความให้ความรู้เกี่ยวกับการลงทุน กลยุทธ์ และเทคนิคต่างๆ',
    items: [
      { title: '6 หมวดบทความ', detail: 'บทความทั่วไป, กลยุทธ์การลงทุน, สำหรับมือใหม่, วิเคราะห์ตลาด, ข่าวสาร, เทคนิค — แต่ละหมวดมีสีและไอคอนแยก' },
      { title: 'Tag Cloud', detail: 'คลิก Tag ยอดนิยมเพื่อกรองบทความเฉพาะหัวข้อที่สนใจ' },
      { title: 'Featured Articles', detail: 'บทความแนะนำ 3 อันดับแรกแสดงเด่นที่หน้าแรก' },
      { title: 'อ่านเต็ม', detail: 'คลิกเข้าอ่านบทความฉบับเต็มพร้อม Markdown formatting' },
    ],
  },
  {
    id: 'market-status',
    icon: '🕐',
    title: 'สถานะตลาด',
    description: 'แสดงสถานะตลาดหุ้นสหรัฐฯ แบบ Real-time มุมขวาบน',
    items: [
      { title: '5 ช่วงเวลาตลาด', detail: 'ตลาดเปิด (สีเขียว), Pre-Market (สีเหลือง), After-Hours (สีน้ำเงิน), Overnight (สีม่วง), ปิดทำการ (สีเทา)' },
      { title: 'Countdown Timer', detail: 'แสดงเวลานับถอยหลังไปยังเหตุการณ์ถัดไป เช่น "เปิดในอีก 2 ชม. 30 น." หรือ "ปิดในอีก 1 ชม. 15 น."' },
      { title: 'เวลาไทย', detail: 'ตลาดสหรัฐฯ เปิด 20:30 - 03:00 เวลาไทย, Pre-Market 15:00 - 20:30, After-Hours 03:00 - 07:00, Overnight 07:00 - 15:00' },
      { title: 'ราคา Extended Hours', detail: 'เมื่อตลาดอยู่ในช่วง Pre-Market หรือ After-Hours จะแสดงราคา extended hours ใต้ราคาปกติทั้งใน Watchlist และหน้ากราฟ' },
    ],
  },
  {
    id: 'subscription',
    icon: '⭐',
    title: 'แผน Pro',
    description: 'อัปเกรดเป็น Pro เพื่อปลดล็อก AI วิเคราะห์และฟีเจอร์พรีเมียม',
    items: [
      { title: 'ราคา ฿89/เดือน', detail: 'โปรโมชั่นพิเศษจากราคาปกติ ฿199/เดือน — ยกเลิกได้ทุกเมื่อ ไม่มีข้อผูกมัด' },
      { title: 'สิ่งที่ได้รับ', detail: 'AI วิเคราะห์หุ้น 3 กรอบเวลา, AI สรุปข่าว, AI วิเคราะห์งบการเงิน, AI สรุปบริษัท, เข้าถึงประวัติบทวิเคราะห์ทั้งหมด' },
      { title: 'ชำระเงินผ่าน Stripe', detail: 'รับบัตรเครดิต/เดบิตทุกประเภท ระบบจัดการโดย Stripe ปลอดภัย' },
      { title: 'จัดการ Subscription', detail: 'ดูสถานะ, วันหมดอายุ, ยกเลิก หรือเปลี่ยนแผนได้ที่หน้า "โปรไฟล์ของฉัน"' },
    ],
  },
];

// ── Sidebar nav ──

function SideNav({ sections, activeId, onSelect }: { sections: GuideSection[]; activeId: string; onSelect: (id: string) => void }) {
  return (
    <nav className="space-y-0.5">
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-2 ${
            activeId === s.id
              ? 'bg-accent/15 text-accent'
              : 'text-dim hover:text-foreground hover:bg-surface-2'
          }`}
        >
          <span className="text-[16px]">{s.icon}</span>
          <span className="truncate">{s.title}</span>
        </button>
      ))}
    </nav>
  );
}

// ── Section card ──

function SectionCard({ section }: { section: GuideSection }) {
  return (
    <div id={section.id} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[28px]">{section.icon}</span>
        <div>
          <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
          <p className="text-[13px] text-dim">{section.description}</p>
        </div>
      </div>
      <div className="space-y-2">
        {section.items.map((item, i) => (
          <div key={i} className="glass rounded-lg p-4 border border-border hover:border-accent/20 transition-colors">
            <h3 className="text-[14px] font-semibold text-foreground mb-1">{item.title}</h3>
            <p className="text-[13px] text-dim leading-relaxed">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──

export default function GuidePage() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function handleSelect(id: string) {
    setActiveId(id);
    setMobileNavOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/watchlist" className="text-dim hover:text-foreground transition-colors text-[13px]">
            หน้าหลัก
          </Link>
          <span className="text-dim text-[13px]">/</span>
          <span className="text-accent text-[13px] font-semibold">คู่มือการใช้งาน</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">คู่มือการใช้งาน Money Street</h1>
        <p className="text-[14px] text-dim mt-1">
          เรียนรู้วิธีใช้งานทุกฟีเจอร์ของ Money Street — แพลตฟอร์มวิเคราะห์หุ้นสหรัฐฯ ครบวงจร
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'ฟีเจอร์ทั้งหมด', value: `${SECTIONS.reduce((acc, s) => acc + s.items.length, 0)}+`, icon: '🚀' },
          { label: 'หมวดหมู่', value: `${SECTIONS.length}`, icon: '📂' },
          { label: 'อัปเดตราคา', value: 'ทุก 15 วิ', icon: '⚡' },
          { label: 'ฟรีทุกฟีเจอร์พื้นฐาน', value: 'FREE', icon: '🎉' },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-3 border border-border text-center">
            <div className="text-[20px] mb-1">{stat.icon}</div>
            <div className="text-lg font-bold text-foreground">{stat.value}</div>
            <div className="text-[11px] text-dim">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Mobile nav toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg bg-surface border border-border text-[14px] font-semibold"
        >
          <span className="flex items-center gap-2">
            <span>{SECTIONS.find((s) => s.id === activeId)?.icon}</span>
            <span>{SECTIONS.find((s) => s.id === activeId)?.title}</span>
          </span>
          <svg className={`w-4 h-4 text-dim transition-transform ${mobileNavOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileNavOpen && (
          <div className="mt-2 p-2 rounded-lg bg-surface border border-border">
            <SideNav sections={SECTIONS} activeId={activeId} onSelect={handleSelect} />
          </div>
        )}
      </div>

      {/* Main layout */}
      <div className="flex gap-6">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-16 self-start max-h-[calc(100vh-5rem)] overflow-y-auto pr-2">
          <SideNav sections={SECTIONS} activeId={activeId} onSelect={handleSelect} />
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 space-y-8">
          {SECTIONS.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}

          {/* Footer note */}
          <div className="glass rounded-xl p-5 border border-border text-center">
            <p className="text-[14px] text-dim mb-2">
              มีคำถามเพิ่มเติม? ต้องการฟีเจอร์ใหม่?
            </p>
            <p className="text-[13px] text-dim">
              ส่ง Feedback ให้เราได้เลย
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
