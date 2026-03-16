# 🧮 Mathematical Models - Thai Lottery Analysis

## ทฤษฎีพื้นฐาน (Foundational Theory)

### ความน่าจะเป็นของล็อตเตอรี่ไทย

| ประเภทรางวัล          | ความน่าจะเป็น       | เปอร์เซ็นต์  |
|----------------------|---------------------|-------------|
| รางวัลที่ 1 (6 หลัก)  | 1 / 1,000,000      | 0.0001%     |
| เลขท้าย 2 ตัว        | 1 / 100             | 1.0000%     |
| เลขท้าย 3 ตัว        | 2 / 1,000           | 0.2000%     |
| เลขหน้า 3 ตัว        | 2 / 1,000           | 0.2000%     |
| รางวัลข้างเคียง       | 2 / 1,000,000       | 0.0002%     |
| รางวัลที่ 2           | 5 / 1,000,000       | 0.0005%     |
| รางวัลที่ 3           | 10 / 1,000,000      | 0.0010%     |
| รางวัลที่ 4           | 50 / 1,000,000      | 0.0050%     |
| รางวัลที่ 5           | 100 / 1,000,000     | 0.0100%     |

---

## Model 1: Digit Frequency Analysis (DFA)

### หลักการ
วิเคราะห์ความถี่ของตัวเลข 0-9 ในแต่ละตำแหน่ง (หลักแสน, หลักหมื่น, หลักพัน, หลักร้อย, หลักสิบ, หลักหน่วย)

### สูตร
```
Frequency Score (FS):

FS(d, p) = count(d at position p) / total_draws

โดยที่:
  d = digit (0-9)
  p = position (1-6, จากซ้ายไปขวา)

Normalized Score:
NS(d, p) = (FS(d, p) - 0.10) / σ(FS(*, p))

- 0.10 = Expected frequency (1/10)
- σ = Standard deviation ของ frequency ทุก digit ใน position นั้น
```

### Interpretation
- NS > 0: ตัวเลขนี้ออกบ่อยกว่าค่าเฉลี่ย
- NS < 0: ตัวเลขนี้ออกน้อยกว่าค่าเฉลี่ย
- |NS| > 2: มีนัยสำคัญทางสถิติ

---

## Model 2: Hot/Cold Number System (HCNS)

### หลักการ
แบ่งตัวเลขเป็น 3 กลุ่ม:
- 🔴 **Hot** (เลขร้อน): ออกบ่อยในช่วง N งวดล่าสุด
- 🔵 **Cold** (เลขเย็น): ไม่ออกมานานกว่าค่าเฉลี่ย
- ⚪ **Neutral** (กลาง): อยู่ในช่วงปกติ

### สูตร
```
Recent Frequency (RF):
RF(x, N) = count(x in last N draws) / N

Average Frequency (AF):
AF(x) = count(x in all draws) / total_draws

Hot/Cold Ratio (HCR):
HCR(x) = RF(x, N) / AF(x)

Classification:
- HCR > 1.5  → Hot 🔴
- HCR < 0.5  → Cold 🔵
- Otherwise   → Neutral ⚪

Prediction Score:
PS_hot(x)  = HCR(x) × momentum_weight
PS_cold(x) = (1 / HCR(x)) × reversion_weight
```

### Parameters
```
N = 10 (จำนวนงวดล่าสุด, ปรับได้)
momentum_weight = 0.6
reversion_weight = 0.4
```

---

## Model 3: Gap Analysis (GA)

### หลักการ
วิเคราะห์ช่วงห่าง (จำนวนงวด) ระหว่างแต่ละครั้งที่ตัวเลขปรากฏ

### สูตร
```
Gaps(x) = [g₁, g₂, ..., gₖ]
โดยที่ gᵢ = draw_number(appearance_i+1) - draw_number(appearance_i)

Average Gap:
AG(x) = Σ(gᵢ) / k

Current Gap:
CG(x) = current_draw - last_appearance(x)

Gap Score:
GS(x) = CG(x) / AG(x)

Interpretation:
- GS > 1.5  → "Overdue" - ครบรอบแล้ว ควรจะออก
- GS ≈ 1.0  → "On Schedule" - ปกติ
- GS < 0.5  → "Recently Appeared" - เพิ่งออกไป

Probability Adjustment:
P_adj(x) = min(GS(x) / max(GS(*)), 1.0)
```

---

## Model 4: Pair Correlation Analysis (PCA)

### หลักการ
วิเคราะห์ความสัมพันธ์ระหว่างตัวเลข 2 ตัวที่ออกพร้อมกัน

### สูตร
```
Co-occurrence Matrix:
C(a, b) = count(a and b appear in same draw) / total_draws

Expected Co-occurrence:
E(a, b) = P(a) × P(b) × total_draws

Lift Score:
L(a, b) = C(a, b) / E(a, b)

Interpretation:
- L > 1: a และ b มีแนวโน้มออกด้วยกัน (Positive correlation)
- L = 1: ไม่มีความสัมพันธ์ (Independent)
- L < 1: a และ b ไม่ค่อยออกด้วยกัน (Negative correlation)
```

---

## Model 5: Moving Average Trend (MAT)

### หลักการ
ใช้ค่าเฉลี่ยเคลื่อนที่เพื่อวิเคราะห์แนวโน้มของตัวเลข

### สูตร
```
Simple Moving Average (SMA):
SMA(x, N) = Σ(frequency(x) in window_i) / N

Exponential Moving Average (EMA):
EMA(x, t) = α × f(x, t) + (1 - α) × EMA(x, t-1)
α = 2 / (N + 1)

Trend Signal:
TS(x) = SMA(x, 5) - SMA(x, 20)

- TS > 0: Upward trend (แนวโน้มขาขึ้น)
- TS < 0: Downward trend (แนวโน้มขาลง)
```

---

## Model 6: Day-of-Week Influence (DWI)

### หลักการ
วิเคราะห์ว่าวันในสัปดาห์ที่ออกรางวัลมีผลต่อตัวเลขที่ออกหรือไม่

### สูตร
```
Day Frequency:
DF(x, day) = count(x on day) / count(draws on day)

Day Bias:
DB(x, day) = DF(x, day) / overall_frequency(x)

Next Draw Day:
next_day = getDayOfWeek(next_draw_date)

Day-Adjusted Score:
DAS(x) = DB(x, next_day) × base_score(x)
```

---

## 📐 Composite Prediction Formula

### Final Score Calculation

```
Final_Score(x) = Σ(wᵢ × Modelᵢ_Score(x))

Default Weights:
┌────────────────────┬──────────┬──────────┐
│ Model              │ Weight   │ Symbol   │
├────────────────────┼──────────┼──────────┤
│ Frequency (DFA)    │ 0.25     │ w₁       │
│ Hot/Cold (HCNS)    │ 0.20     │ w₂       │
│ Gap (GA)           │ 0.20     │ w₃       │
│ Correlation (PCA)  │ 0.15     │ w₄       │
│ Trend (MAT)        │ 0.10     │ w₅       │
│ Day Influence (DWI)│ 0.10     │ w₆       │
├────────────────────┼──────────┼──────────┤
│ Total              │ 1.00     │          │
└────────────────────┴──────────┴──────────┘

Confidence Level:
CL(x) = Final_Score(x) / max(Final_Score(*)) × 100%
```

---

## 🎯 Number Generation Strategy

### สำหรับเลข 6 หลัก (รางวัลที่ 1)
```
1. คำนวณ Final_Score สำหรับ digit 0-9 ในแต่ละ position (6 positions)
2. เลือก Top-3 digits ที่มี score สูงสุดในแต่ละ position
3. สร้าง combinations จาก Top digits
4. จัดอันดับ combinations ตาม Pair Correlation
5. คืนค่า Top-5 combinations
```

### สำหรับเลขท้าย 2 ตัว
```
1. วิเคราะห์ 2-digit combinations (00-99) ตรงๆ
2. คำนวณ Frequency, Gap, Hot/Cold ของแต่ละ combination
3. จัดอันดับตาม composite score
4. คืนค่า Top-10 combinations
```

### สำหรับเลขท้าย 3 ตัว / เลขหน้า 3 ตัว
```
1. วิเคราะห์ 3-digit combinations (000-999)
2. คำนวณ Frequency, Gap, Hot/Cold
3. ใช้ Pair Correlation ภายในตัวเลข 3 หลัก
4. จัดอันดับตาม composite score
5. คืนค่า Top-10 combinations
```

---

## 📈 Confidence Calibration

### ระดับความมั่นใจ:

| Level  | Score Range | ความหมาย                           |
|--------|-------------|--------------------------------------|
| ⭐⭐⭐⭐⭐ | 80-100%     | มั่นใจมาก (หลาย model สอดคล้องกัน)  |
| ⭐⭐⭐⭐   | 60-79%      | มั่นใจปานกลาง                       |
| ⭐⭐⭐     | 40-59%      | พอใช้                               |
| ⭐⭐       | 20-39%      | ต่ำ                                 |
| ⭐        | 0-19%       | ต่ำมาก (ไม่แนะนำ)                   |

> **หมายเหตุ**: แม้ระดับ 5 ดาว ก็ไม่ได้หมายความว่าจะถูกรางวัล เพราะ lottery เป็น independent random events
