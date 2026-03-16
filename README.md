# 🎰 Thai Lottery Analyzer

> ระบบวิเคราะห์และคำนวณเลขล็อตเตอรี่ไทย ด้วยหลักสถิติและความน่าจะเป็นทางคณิตศาสตร์

## 📖 Overview

Thai Lottery Analyzer เป็นเว็บแอปพลิเคชันที่วิเคราะห์ผลรางวัลสลากกินแบ่งรัฐบาลไทยย้อนหลัง
โดยใช้ 6 โมเดลทางสถิติเพื่อหาตัวเลขที่มีความน่าจะเป็นสูงที่สุด

## 🧮 Mathematical Models

| # | Model | คำอธิบาย |
|---|-------|---------|
| 1 | **Digit Frequency Analysis** | วิเคราะห์ความถี่ตัวเลข 0-9 ในแต่ละตำแหน่ง |
| 2 | **Hot/Cold Number System** | จำแนกเลขร้อน (ออกบ่อย) และเลขเย็น (ออกน้อย) |
| 3 | **Gap Analysis** | วิเคราะห์ช่วงห่างระหว่างครั้งที่เลขปรากฏ |
| 4 | **Pair Correlation** | วิเคราะห์ความสัมพันธ์ระหว่างตัวเลข |
| 5 | **Trend Analysis** | วิเคราะห์แนวโน้มด้วย Moving Average |
| 6 | **Day-of-Week Influence** | วิเคราะห์อิทธิพลของวันที่ออกรางวัล |

## 🚀 วิธีใช้งาน

1. เปิดไฟล์ `index.html` ในเว็บเบราว์เซอร์
2. ระบบจะโหลดข้อมูลและวิเคราะห์อัตโนมัติ
3. เลือกดูข้อมูลจาก 4 แท็บ:
   - **📊 แดชบอร์ด** — สรุปผลรางวัลล่าสุด + เลขเด็ด
   - **🔬 วิเคราะห์** — การวิเคราะห์เชิงลึกทุกโมเดล
   - **🎯 ทำนาย** — ผลทำนายงวดหน้า + ค่าความมั่นใจ
   - **📋 ประวัติ** — ผลรางวัลย้อนหลัง

## 📁 โครงสร้างไฟล์

```
lottary/
├── index.html              # หน้าเว็บหลัก
├── index.css               # Design System & Styles
├── app.js                  # Main Application Controller
├── data.js                 # Data Management & API
├── analysis.js             # Statistical Analysis Engine
├── prediction.js           # Prediction Engine
├── charts.js               # Chart Rendering (Canvas API)
├── result_api.md           # API Documentation
├── system_flow.md          # System Architecture & Flow
├── mathematical_models.md  # Mathematical Models Detail
└── README.md               # Project README (ไฟล์นี้)
```

## 📡 Data Source

ข้อมูลจาก **สำนักงานสลากกินแบ่งรัฐบาล (GLO)**
- API: `https://www.glo.or.th/api/checking/getLotteryResult`
- ดูรายละเอียดเพิ่มเติมที่ [result_api.md](result_api.md)

## ⚠️ Disclaimer

> ระบบนี้สร้างเพื่อการศึกษาทางสถิติเท่านั้น
> การออกรางวัลเป็นเหตุการณ์สุ่มอิสระ (Independent Random Events)
> ไม่มีระบบใดรับประกันผลลัพธ์ได้ โปรดใช้วิจารณญาณ

## 🛠️ Tech Stack

- HTML5 / CSS3 / Vanilla JavaScript
- Canvas API (Charts)
- LocalStorage (Caching)
- No external dependencies
