# 📡 Thai Lottery Result API Documentation

## Rayriffy Thai Lotto API (Currently Used)

### Overview
API สำหรับดึงผลการออกรางวัลสลากกินแบ่งรัฐบาลไทย จาก Rayriffy Thai Lotto API
ข้อมูลถูก crawl จาก **sanook.com** ซึ่งเป็นแหล่งข้อมูลที่เชื่อถือได้

**Base URL:** `https://lotto.api.rayriffy.com`

---

## 🔗 API Endpoints

### 1. ผลรางวัลล่าสุด (Get Latest Result)

**Endpoint:**
```
GET https://lotto.api.rayriffy.com/latest
```

**Response:**
```json
{
  "status": "success",
  "response": {
    "date": "1 มีนาคม 2569",
    "endpoint": "https://news.sanook.com/lotto/check/01032569",
    "prizes": [
      {
        "id": "prizeFirst",
        "name": "รางวัลที่ 1",
        "reward": "6000000",
        "amount": 1,
        "number": ["820866"]
      },
      {
        "id": "prizeFirstNear",
        "name": "รางวัลข้างเคียงรางวัลที่ 1",
        "reward": "100000",
        "amount": 2,
        "number": ["820865", "820867"]
      },
      {
        "id": "prizeSecond",
        "name": "รางวัลที่ 2",
        "reward": "200000",
        "amount": 5,
        "number": ["328032", "716735", "320227", "373865", "731233"]
      },
      ...
    ],
    "runningNumbers": [
      {
        "id": "runningNumberFrontThree",
        "name": "รางวัลเลขหน้า 3 ตัว",
        "reward": "4000",
        "amount": 2,
        "number": ["479", "054"]
      },
      {
        "id": "runningNumberBackThree",
        "name": "รางวัลเลขท้าย 3 ตัว",
        "reward": "4000",
        "amount": 2,
        "number": ["068", "837"]
      },
      {
        "id": "runningNumberBackTwo",
        "name": "รางวัลเลขท้าย 2 ตัว",
        "reward": "2000",
        "amount": 1,
        "number": ["06"]
      }
    ]
  }
}
```

---

### 2. รายการงวดย้อนหลัง (List Past Lottery Dates)

**Endpoint:**
```
GET https://lotto.api.rayriffy.com/list/:page
```

| Parameter | Type   | Description                           | Example |
|-----------|--------|---------------------------------------|---------|
| `page`    | number | หมายเลขหน้า (1 = ล่าสุด)            | 1       |

**Response:**
```json
{
  "status": "success",
  "response": [
    {
      "id": "01032569",
      "url": "/lotto/01032569",
      "date": "1 มีนาคม 2569"
    },
    {
      "id": "16022569",
      "url": "/lotto/16022569",
      "date": "16 กุมภาพันธ์ 2569"
    }
  ]
}
```

> **หมายเหตุ:** `id` ใช้รูปแบบ DDMMYYYY ปี พ.ศ. (เช่น `01032569` = 1 มี.ค. 2569)

---

### 3. ผลรางวัลตามงวด (Get Past Lottery Result)

**Endpoint:**
```
GET https://lotto.api.rayriffy.com/lotto/:id
```

| Parameter | Type   | Description                                  | Example      |
|-----------|--------|----------------------------------------------|--------------|
| `id`      | string | ID ของงวด (ได้จาก /list endpoint)           | "01032569"   |

**Response:** (เหมือนกับ `/latest`)

---

## 📦 Response Structure

### prizes[] array:

| Prize ID          | Description                          | จำนวน    | เงินรางวัล     |
|-------------------|--------------------------------------|----------|----------------|
| `prizeFirst`      | รางวัลที่ 1 (6 หลัก)                | 1 รางวัล | 6,000,000 บาท |
| `prizeFirstNear`  | รางวัลข้างเคียงรางวัลที่ 1 (6 หลัก) | 2 รางวัล | 100,000 บาท   |
| `prizeSecond`     | รางวัลที่ 2 (6 หลัก)                | 5 รางวัล | 200,000 บาท   |
| `prizeThird`      | รางวัลที่ 3 (6 หลัก)                | 10 รางวัล| 80,000 บาท    |
| `prizeForth`      | รางวัลที่ 4 (6 หลัก)                | 50 รางวัล| 40,000 บาท    |
| `prizeFifth`      | รางวัลที่ 5 (6 หลัก)                | 100 รางวัล| 20,000 บาท   |

> ⚠️ **หมายเหตุ:** API บางงวดเก่าใช้ `prizeThrid` (typo) แทน `prizeThird`

### runningNumbers[] array:

| Running ID                 | Description              | จำนวน    | เงินรางวัล  |
|----------------------------|--------------------------|----------|-------------|
| `runningNumberFrontThree`  | รางวัลเลขหน้า 3 ตัว     | 2 รางวัล | 4,000 บาท  |
| `runningNumberBackThree`   | รางวัลเลขท้าย 3 ตัว     | 2 รางวัล | 4,000 บาท  |
| `runningNumberBackTwo`     | รางวัลเลขท้าย 2 ตัว     | 1 รางวัล | 2,000 บาท  |

---

## 📅 กำหนดการออกรางวัล

สลากกินแบ่งรัฐบาลออกรางวัล **ทุกวันที่ 1 และ 16 ของทุกเดือน**
- หากตรงกับวันหยุดนักขัตฤกษ์ จะเลื่อนไปออก 1 วัน

---

## 🔄 วิธีดึงข้อมูลผลรางวัลย้อนหลังทั้งหมด

### Strategy: List → Fetch Each

```javascript
async function fetchAllResults() {
  const results = [];

  // Step 1: ดึงรายการงวดทั้งหมด (หลาย pages)
  for (let page = 1; page <= 10; page++) {
    const listRes = await fetch(`https://lotto.api.rayriffy.com/list/${page}`);
    const listData = await listRes.json();
    
    if (listData.status !== 'success' || !listData.response.length) break;

    // Step 2: ดึงผลแต่ละงวด
    for (const draw of listData.response) {
      const detailRes = await fetch(`https://lotto.api.rayriffy.com/lotto/${draw.id}`);
      const detailData = await detailRes.json();
      
      if (detailData.status === 'success') {
        results.push(detailData.response);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }

  return results;
}
```

### ข้อดีของ Rayriffy API:
1. ✅ **ไม่มีปัญหา CORS** - เรียกจาก browser ได้โดยตรง
2. ✅ **ข้อมูลถูกต้อง** - crawl จาก sanook.com ที่ใช้ข้อมูลจากกองสลากฯ
3. ✅ **ใช้งานง่าย** - GET requests, JSON responses
4. ✅ **ข้อมูลย้อนหลังจำนวนมาก** - ตั้งแต่ปี 2558+

### ข้อควรระวัง:
1. **Rate Limiting** - ควรหน่วงเวลาอย่างน้อย 200-300ms ระหว่างแต่ละ request
2. **API Availability** - เป็น community-maintained API อาจไม่ available 100%
3. **Data Caching** - ควรเก็บข้อมูลใน localStorage เพื่อลดการเรียก API ซ้ำ

---

## 🧪 ทดสอบ API

```bash
# ดึงผลรางวัลล่าสุด
curl https://lotto.api.rayriffy.com/latest

# ดึงรายการงวดย้อนหลัง (หน้า 1)
curl https://lotto.api.rayriffy.com/list/1

# ดึงผลรางวัลงวดวันที่ 1 มีนาคม 2569
curl https://lotto.api.rayriffy.com/lotto/01032569

# ดึงผลรางวัลงวดวันที่ 16 กุมภาพันธ์ 2569
curl https://lotto.api.rayriffy.com/lotto/16022569
```

---

## 📊 การใช้ข้อมูลสำหรับการวิเคราะห์

ข้อมูลที่ได้จาก API สามารถนำไป:
1. **วิเคราะห์ความถี่** - นับจำนวนครั้งที่แต่ละตัวเลขออก
2. **วิเคราะห์แพทเทิร์น** - หาความสัมพันธ์ระหว่างตัวเลขในแต่ละตำแหน่ง
3. **สถิติเลขท้าย** - วิเคราะห์เลขท้าย 2 ตัว และ 3 ตัวที่ออกบ่อย
4. **Trend Analysis** - วิเคราะห์แนวโน้มตัวเลขตามช่วงเวลา
5. **Hot/Cold Numbers** - หาเลขร้อน (ออกบ่อย) และเลขเย็น (ออกน้อย)

---

## 🔄 Data Transformation (API → App Format)

ระบบแปลงข้อมูลจาก API format เป็น format ที่ app.js ใช้:

```
API prizes[].id          → App format
─────────────────────────────────────
prizeFirst              → first.number[]
prizeFirstNear          → near1.number[]
prizeSecond             → second.number[]
prizeThird/prizeThrid   → third.number[]
prizeForth              → fourth.number[]
prizeFifth              → fifth.number[]

API runningNumbers[].id  → App format
─────────────────────────────────────
runningNumberFrontThree → last3f.number[]
runningNumberBackThree  → last3b.number[]
runningNumberBackTwo    → last2.number[]
```