# 실적보고서 시스템 데이터 흐름 전체 분석

## 📋 목차
1. [시스템 개요](#1-시스템-개요)
2. [데이터베이스 스키마 분석](#2-데이터베이스-스키마-분석)
3. [프론트엔드 데이터 흐름](#3-프론트엔드-데이터-흐름)
4. [백엔드 API 처리](#4-백엔드-api-처리)
5. [누적 금액 계산 로직](#5-누적-금액-계산-로직)
6. [⚠️ 발견된 문제점 및 개선 사항](#6-발견된-문제점-및-개선-사항)

---

## 1. 시스템 개요

### 1.1 실적보고서 작성 흐름
```
영업담당자 작성 → 임시저장/제출 → 관리자 검토 → 승인/반려 → 실적 반영
```

### 1.2 세 가지 핵심 입력 항목
| 항목 | 영문명 | 데이터 타입 | 사용 목적 |
|------|--------|------------|----------|
| 목표수금금액 | targetCollectionAmount | DECIMAL(15,2) | 해당 기간 수금 목표 |
| 목표매출액 | targetSalesAmount | DECIMAL(15,2) | 해당 기간 매출 목표 |
| 영업활동(특이사항) | activityNotes | TEXT (JSON) | 영업 활동 기록 |

---

## 2. 데이터베이스 스키마 분석

### 2.1 reports 테이블 구조
```sql
CREATE TABLE IF NOT EXISTS reports (
  -- 기본 정보
  reportId VARCHAR(100) PRIMARY KEY,
  submittedBy VARCHAR(100) NOT NULL,           -- 작성자명 (employees.name FK)
  submittedDate DATE NOT NULL,                 -- 제출일
  companyId VARCHAR(100) NOT NULL,             -- 거래처ID (companies.keyValue FK)
  reportType VARCHAR(100),                     -- 보고서유형 (weekly/monthly/yearly)

  -- 📌 영업담당자가 입력하는 "목표" (작성 시)
  targetCollectionAmount DECIMAL(15,2) DEFAULT 0,  -- 목표수금금액
  targetSalesAmount DECIMAL(15,2) DEFAULT 0,       -- 목표매출액
  targetProducts TEXT,                             -- 판매목표제품 (JSON 문자열)
  activityNotes TEXT,                              -- 영업활동(특이사항) (JSON 문자열)

  -- 📌 관리자가 입력하는 "실적" (승인 시)
  actualCollectionAmount DECIMAL(15,2) DEFAULT 0,  -- ⭐ 실제수금금액 (관리자 입력)
  actualSalesAmount DECIMAL(15,2) DEFAULT 0,       -- ⭐ 실제매출금액 (관리자 입력)
  soldProducts TEXT,                               -- 실제 판매제품 (관리자 입력)
  includeVAT BOOLEAN DEFAULT TRUE,                 -- 부가세 포함 여부

  -- 상태 관리
  status ENUM('임시저장', '제출완료', '승인', '반려') DEFAULT '임시저장',
  processedBy VARCHAR(100),                    -- 처리자 (관리자)
  processedDate TIMESTAMP NULL,                -- 처리일
  adminComment TEXT,                           -- 관리자 코멘트

  -- 시스템 필드
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (submittedBy) REFERENCES employees(name),
  FOREIGN KEY (companyId) REFERENCES companies(keyValue),
  FOREIGN KEY (processedBy) REFERENCES employees(name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 핵심 개념 구분

#### ⚠️ CRITICAL: target vs actual 차이
```
┌─────────────────────────────────────────────────────────┐
│                    reports 테이블                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📝 영업담당자 입력 (작성 시)                            │
│  ├─ targetCollectionAmount    (목표수금금액)            │
│  ├─ targetSalesAmount          (목표매출액)             │
│  ├─ targetProducts             (판매목표제품)            │
│  └─ activityNotes              (영업활동)                │
│                                                          │
│  ✅ 관리자 입력 (승인 시)                                │
│  ├─ actualCollectionAmount     (실제수금금액) ⭐        │
│  ├─ actualSalesAmount          (실제매출금액) ⭐        │
│  └─ soldProducts               (실제판매제품)            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**target**: 영업담당자가 "이번 주/월에 이만큼 달성하겠다"고 계획하는 목표
**actual**: 관리자가 검증 후 "실제로 이만큼 달성했다"고 확인하는 실적

---

## 3. 프론트엔드 데이터 흐름

### 3.1 데이터 수집 (collectFormData)
**파일**: `05.Source/03.sales_mode/03_report_write/02_report_write.js` (lines 1419-1544)

```javascript
async function collectFormData() {
  const data = {
    reportId: generateUUID(),
    reportDate: elements.reportDate.value,
    reportType: elements.reportType.value,
    companyId: company.keyValue,
    submittedBy: state.currentUser.name,
    submittedDate: now,  // MySQL DATETIME 형식
    status: '임시저장'
  };

  // 1️⃣ 목표수금금액
  if (elements.enableTargetCollection.checked) {
    data.targetCollection = {
      amount: parseFormattedNumber(elements.targetCollectionAmount.value),
      currency: elements.targetCollectionCurrency.value
    };
  }

  // 2️⃣ 목표매출액
  if (elements.enableTargetSales.checked) {
    data.targetSales = {
      products: []
    };

    const products = elements.salesProductList.querySelectorAll('.product-item');

    for (const product of products) {
      const name = product.querySelector('.product-name').value.trim();
      const amount = parseFormattedNumber(product.querySelector('.product-amount').value);
      const currency = product.querySelector('.product-currency').value;
      const vatIncluded = product.querySelector('.product-vat-included').checked;

      // 부가세 제외 금액 계산
      const amountExcludingVat = vatIncluded ? amount / 1.1 : amount;

      data.targetSales.products.push({
        name: name,
        amount: amount,
        currency: currency,
        vatIncluded: vatIncluded,
        amountExcludingVat: amountExcludingVat
      });
    }

    // 총 매출액 계산 (부가세 제외 금액으로 합산)
    data.targetSales.totalAmount = data.targetSales.products.reduce(
      (sum, p) => sum + p.amountExcludingVat,
      0
    );
  }

  // 3️⃣ 영업활동(특이사항)
  if (elements.enableActivity.checked) {
    const activityItems = elements.activityList.querySelectorAll('.activity-item');
    data.activities = [];

    activityItems.forEach(item => {
      const activityData = JSON.parse(item.dataset.activityData);
      data.activities.push(activityData);
    });
  }

  return data;
}
```

### 3.2 서버 전송 데이터 변환 (handleSubmit)
**파일**: `02_report_write.js` (lines 1230-1257)

```javascript
const serverData = {
  reportId: reportData.reportId,
  submittedBy: reportData.submittedBy,
  submittedDate: reportData.submittedDate,
  companyId: reportData.companyId,
  reportType: reportData.reportType,
  status: reportData.status,

  // 📌 목표수금금액 → 숫자로 변환
  targetCollectionAmount: reportData.targetCollection
    ? reportData.targetCollection.amount
    : null,

  // 📌 목표매출액 → 숫자로 변환
  targetSalesAmount: reportData.targetSales
    ? reportData.targetSales.totalAmount
    : null,

  // 📌 제품 목록 → JSON 문자열로 직렬화
  targetProducts: reportData.targetSales
    ? JSON.stringify(reportData.targetSales.products)
    : null,

  // 📌 영업활동 → JSON 문자열로 직렬화
  activityNotes: reportData.activities
    ? JSON.stringify(reportData.activities)
    : null
};
```

### 3.3 데이터 구조 예시

#### 목표매출액 (targetProducts JSON)
```json
[
  {
    "name": "제품A",
    "amount": 5000000,
    "currency": "KRW",
    "vatIncluded": true,
    "amountExcludingVat": 4545454.55
  },
  {
    "name": "제품B",
    "amount": 3000000,
    "currency": "KRW",
    "vatIncluded": false,
    "amountExcludingVat": 3000000
  }
]
```

#### 영업활동 (activityNotes JSON)
```json
[
  {
    "type": "call",
    "date": "2025-10-15",
    "time": "14:00",
    "target": "홍길동 대표",
    "purpose": "제품 소개 및 견적 협의",
    "executor": "self"
  },
  {
    "type": "visit",
    "date": "2025-10-18",
    "location": "서울시 강남구",
    "target": "김철수 부장",
    "purpose": "계약서 검토",
    "executor": "proxy",
    "proxyName": "박영희 딜러"
  }
]
```

---

## 4. 백엔드 API 처리

### 4.1 보고서 생성 API
**파일**: `backend/controllers/reports.controller.js` (lines 264-336)

```javascript
export const createReport = async (req, res) => {
  try {
    const {
      reportId,
      submittedBy,
      submittedDate,
      companyId,
      reportType,
      targetCollectionAmount,  // 📌 목표수금금액
      targetSalesAmount,       // 📌 목표매출액
      targetProducts,          // 📌 제품 목록 (JSON 문자열)
      activityNotes,           // 📌 영업활동 (JSON 문자열)
      status = '임시저장'
    } = req.body;

    // 필수 필드 검증
    if (!reportId || !submittedBy || !submittedDate || !companyId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: '필수 필드가 누락되었습니다.'
      });
    }

    const db = await getDB();

    // 데이터베이스 삽입
    await db.execute(`
      INSERT INTO reports (
        reportId, submittedBy, submittedDate, companyId, reportType,
        targetCollectionAmount, targetSalesAmount, targetProducts,
        activityNotes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      reportId,
      submittedBy,
      submittedDate,
      companyId,
      reportType,
      targetCollectionAmount || 0,  // NULL 방지
      targetSalesAmount || 0,       // NULL 방지
      targetProducts,               // JSON 문자열 그대로 저장
      activityNotes,                // JSON 문자열 그대로 저장
      status
    ]);

    res.status(201).json({
      success: true,
      message: '보고서가 생성되었습니다.',
      data: { reportId }
    });

  } catch (error) {
    console.error('보고서 생성 오류:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: '보고서 생성 중 오류가 발생했습니다.'
    });
  }
};
```

### 4.2 저장된 데이터 예시
```sql
-- reports 테이블 데이터 예시
INSERT INTO reports VALUES (
  'uuid-1234-5678',              -- reportId
  '홍길동',                      -- submittedBy
  '2025-10-15',                  -- submittedDate
  'COMPANY_xxx',                 -- companyId
  'weekly',                      -- reportType
  5000000.00,                    -- targetCollectionAmount ⭐
  7545454.55,                    -- targetSalesAmount ⭐
  '[{"name":"제품A",...}]',      -- targetProducts (JSON)
  '[{"type":"call",...}]',       -- activityNotes (JSON)
  0.00,                          -- actualCollectionAmount (아직 0)
  0.00,                          -- actualSalesAmount (아직 0)
  NULL,                          -- soldProducts (아직 NULL)
  TRUE,                          -- includeVAT
  '임시저장',                    -- status
  NULL,                          -- processedBy
  NULL,                          -- processedDate
  NULL,                          -- adminComment
  NOW(),                         -- createdAt
  NOW()                          -- updatedAt
);
```

---

## 5. 누적 금액 계산 로직

### 5.1 직원 월간 실적 조회
**파일**: `backend/controllers/goals.controller.js` (lines 8-114)

```javascript
export const getEmployeeMonthlyGoals = async (req, res) => {
  const { id } = req.params;
  const { year, month } = req.query;

  const db = await getDB();

  // 1️⃣ 직원 정보 및 목표 조회 (employees 테이블)
  const [employees] = await db.query(`
    SELECT
      id, name, department,
      monthlyCollectionGoal,     -- 직원 월간 수금 목표
      monthlySalesGoal,          -- 직원 월간 매출 목표
      annualCollectionGoal,      -- 직원 연간 수금 목표
      annualSalesGoal            -- 직원 연간 매출 목표
    FROM employees
    WHERE id = ?
  `, [id]);

  const employee = employees[0];

  // 2️⃣ 해당 월의 실제 실적 계산 (reports 테이블 집계)
  // ⚠️ CRITICAL: status = '승인'인 보고서만 집계!!!
  const [monthlyActuals] = await db.query(`
    SELECT
      COALESCE(SUM(actualCollectionAmount), 0) as actualCollection,  -- ⭐ actual 필드 사용
      COALESCE(SUM(CASE
        WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)  -- ⭐ actual 필드 사용
        ELSE actualSalesAmount
      END), 0) as actualSales
    FROM reports
    WHERE submittedBy = ?
      AND status = '승인'                    -- ⭐ 승인된 보고서만
      AND YEAR(submittedDate) = ?
      AND MONTH(submittedDate) = ?
  `, [employee.name, year, month]);

  // 3️⃣ 연간 누적 실적 계산
  const [annualActuals] = await db.query(`
    SELECT
      COALESCE(SUM(actualCollectionAmount), 0) as actualCollection,
      COALESCE(SUM(CASE
        WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)
        ELSE actualSalesAmount
      END), 0) as actualSales
    FROM reports
    WHERE submittedBy = ?
      AND status = '승인'                    -- ⭐ 승인된 보고서만
      AND YEAR(submittedDate) = ?
  `, [employee.name, year]);

  // 4️⃣ 달성률 계산
  const monthlyData = monthlyActuals[0];
  const annualData = annualActuals[0];

  res.json({
    success: true,
    goals: {
      monthlyCollectionGoal: employee.monthlyCollectionGoal,
      monthlySalesGoal: employee.monthlySalesGoal,
      actualCollection: monthlyData.actualCollection,      // ⭐ 실제 수금 금액
      actualSales: monthlyData.actualSales,                // ⭐ 실제 매출 금액
      collectionRate: (monthlyData.actualCollection / employee.monthlyCollectionGoal * 100).toFixed(1),
      salesRate: (monthlyData.actualSales / employee.monthlySalesGoal * 100).toFixed(1)
    },
    annual: {
      annualCollectionGoal: employee.annualCollectionGoal,
      annualSalesGoal: employee.annualSalesGoal,
      actualCollection: annualData.actualCollection,       // ⭐ 연간 누적 수금
      actualSales: annualData.actualSales,                 // ⭐ 연간 누적 매출
      collectionRate: (annualData.actualCollection / employee.annualCollectionGoal * 100).toFixed(1),
      salesRate: (annualData.actualSales / employee.annualSalesGoal * 100).toFixed(1)
    }
  });
};
```

### 5.2 누적 금액 계산 흐름도
```
┌──────────────────────────────────────────────────────────────┐
│                   누적 금액 계산 프로세스                       │
└──────────────────────────────────────────────────────────────┘

1️⃣ 영업담당자: 실적보고서 작성
   └─> reports 테이블에 저장
       ├─ targetCollectionAmount: 5,000,000원 (목표)
       ├─ targetSalesAmount: 7,545,454원 (목표)
       ├─ actualCollectionAmount: 0원 (아직 비어있음)
       └─ actualSalesAmount: 0원 (아직 비어있음)
       └─ status: '임시저장' 또는 '제출완료'

2️⃣ 관리자: 보고서 검토 및 승인
   └─> reports 테이블 업데이트
       ├─ actualCollectionAmount: 4,800,000원 입력 ⭐
       ├─ actualSalesAmount: 7,200,000원 입력 ⭐
       └─ status: '승인' 으로 변경 ⭐

3️⃣ 시스템: 누적 금액 자동 계산
   └─> goals.controller.js
       ├─ status = '승인'인 reports만 필터링
       ├─ actualCollectionAmount 합산 → 누적수금액
       ├─ actualSalesAmount 합산 (부가세 제외) → 누적매출액
       └─ 달성률 계산
           ├─ 수금 달성률 = (누적수금액 / 목표수금액) × 100
           └─ 매출 달성률 = (누적매출액 / 목표매출액) × 100

4️⃣ 대시보드: 실적 표시
   └─> 프론트엔드에서 API 호출
       └─> GET /api/goals/employee/:id/monthly?year=2025&month=10
           └─> 계산된 누적 금액 및 달성률 표시
```

---

## 6. ⚠️ 발견된 문제점 및 개선 사항

### 6.1 🔴 심각한 문제: actualCollectionAmount / actualSalesAmount가 입력되지 않음

#### 문제 상황
```javascript
// 프론트엔드에서 제출하는 데이터 (02_report_write.js)
const serverData = {
  reportId: reportData.reportId,
  submittedBy: reportData.submittedBy,
  targetCollectionAmount: 5000000,    // ✅ 전송됨
  targetSalesAmount: 7545454,         // ✅ 전송됨
  targetProducts: "[...]",            // ✅ 전송됨
  activityNotes: "[...]",             // ✅ 전송됨

  // ❌ 문제: actual 필드가 전송되지 않음!!!
  // actualCollectionAmount: ???      // 없음
  // actualSalesAmount: ???           // 없음
};
```

#### 결과
```sql
-- reports 테이블에 저장된 데이터
targetCollectionAmount: 5000000     -- ✅ OK
targetSalesAmount: 7545454          -- ✅ OK
actualCollectionAmount: 0           -- ❌ 문제: 항상 0
actualSalesAmount: 0                -- ❌ 문제: 항상 0
```

#### 영향
```javascript
// goals.controller.js에서 실적 계산
SELECT SUM(actualCollectionAmount) FROM reports WHERE status = '승인'
// → 결과: 항상 0원!!! (actual 필드가 비어있기 때문)
```

### 6.2 🟡 혼동 가능한 변수명

| 필드명 | 의미 | 입력 시점 | 입력자 |
|--------|------|----------|--------|
| `targetCollectionAmount` | 목표 수금액 | 보고서 작성 | 영업담당자 |
| `actualCollectionAmount` | 실제 수금액 | 보고서 승인 | 관리자 |
| `targetSalesAmount` | 목표 매출액 | 보고서 작성 | 영업담당자 |
| `actualSalesAmount` | 실제 매출액 | 보고서 승인 | 관리자 |

**문제**: `target`과 `actual`의 차이를 명확히 이해하지 못하면 혼동 발생

### 6.3 🟡 부가세 계산 로직 일관성

#### 프론트엔드 (02_report_write.js:1514)
```javascript
// 부가세 제외 금액 계산
const amountExcludingVat = vatIncluded ? amount / 1.1 : amount;

// 총 매출액 = 부가세 제외 금액으로 합산
data.targetSales.totalAmount = data.targetSales.products.reduce(
  (sum, p) => sum + p.amountExcludingVat,
  0
);
```

#### 백엔드 (goals.controller.js:45-48)
```javascript
// 실적 계산 시 부가세 제외
COALESCE(SUM(CASE
  WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)
  ELSE actualSalesAmount
END), 0) as actualSales
```

**일관성**: ✅ 동일한 로직 (amount / 1.1)
**문제**: `includeVAT` 필드가 reports 테이블에 있지만 현재 프론트엔드에서 전송하지 않음

### 6.4 📊 현재 시스템의 데이터 흐름 (문제 포함)

```
┌───────────────────────────────────────────────────────────────┐
│                   현재 시스템 흐름 (문제점 표시)                │
└───────────────────────────────────────────────────────────────┘

1. 영업담당자 작성
   ├─ targetCollectionAmount: 5,000,000원 입력 ✅
   ├─ targetSalesAmount: 7,545,454원 입력 ✅
   ├─ targetProducts: JSON 입력 ✅
   ├─ activityNotes: JSON 입력 ✅
   ├─ actualCollectionAmount: 0원 (미입력) ❌
   └─ actualSalesAmount: 0원 (미입력) ❌

2. 백엔드 저장
   └─ INSERT INTO reports (...) VALUES (...) ✅

3. 관리자 승인 (현재 시스템에는 이 단계가 없음!)
   └─ ❌ 문제: actualCollectionAmount, actualSalesAmount를
             입력하는 UI가 없음!

4. 누적 금액 계산
   └─ SELECT SUM(actualCollectionAmount)
      WHERE status = '승인'
   └─ ❌ 결과: 항상 0원 (actual 필드가 비어있음)
```

---

## 7. 🔧 권장 해결 방안

### 7.1 방안 A: 관리자 승인 화면에서 actual 필드 입력

#### 구현 위치
- **파일**: `05.Source/04.admin_mode/XX_report_approval/`
- **기능**: 관리자가 보고서 승인 시 실제 실적 입력

#### UI 구조
```
┌─────────────────────────────────────────────┐
│       보고서 승인 모달                      │
├─────────────────────────────────────────────┤
│                                             │
│  📋 영업담당자가 입력한 목표                │
│  ├─ 목표수금금액: 5,000,000원               │
│  ├─ 목표매출액: 7,545,454원                 │
│  └─ 목표제품: [...]                        │
│                                             │
│  ✅ 관리자가 입력하는 실적                  │
│  ├─ 실제수금금액: [ 4,800,000 ] 원         │
│  ├─ 실제매출금액: [ 7,200,000 ] 원         │
│  └─ 판매제품: [ ... ]                      │
│                                             │
│  📝 관리자 코멘트                           │
│  └─ [ 텍스트 입력 영역 ]                   │
│                                             │
│  [반려]  [승인]                             │
└─────────────────────────────────────────────┘
```

#### API 수정
```javascript
// PUT /api/reports/:reportId/approve
export const approveReport = async (req, res) => {
  const { reportId } = req.params;
  const {
    actualCollectionAmount,  // ⭐ 관리자 입력
    actualSalesAmount,       // ⭐ 관리자 입력
    soldProducts,            // ⭐ 관리자 입력
    adminComment,
    processedBy
  } = req.body;

  await db.execute(`
    UPDATE reports
    SET
      actualCollectionAmount = ?,
      actualSalesAmount = ?,
      soldProducts = ?,
      status = '승인',
      processedBy = ?,
      processedDate = NOW(),
      adminComment = ?
    WHERE reportId = ?
  `, [
    actualCollectionAmount,
    actualSalesAmount,
    soldProducts,
    processedBy,
    adminComment,
    reportId
  ]);
};
```

### 7.2 방안 B: target 필드를 actual로 간주 (간단한 방법)

#### 개념 변경
```
변경 전: target = 목표, actual = 실적
변경 후: target = 실적 (actual 제거)
```

#### 코드 수정
```javascript
// goals.controller.js 수정
const [monthlyActuals] = await db.query(`
  SELECT
    COALESCE(SUM(targetCollectionAmount), 0) as actualCollection,  // ⭐ target 사용
    COALESCE(SUM(CASE
      WHEN includeVAT = 1 THEN ROUND(targetSalesAmount / 1.1, 0)  // ⭐ target 사용
      ELSE targetSalesAmount
    END), 0) as actualSales
  FROM reports
  WHERE submittedBy = ?
    AND status = '승인'
    AND YEAR(submittedDate) = ?
    AND MONTH(submittedDate) = ?
`, [employee.name, year, month]);
```

#### 장단점
| 구분 | 장점 | 단점 |
|------|------|------|
| 방안 A | 목표와 실적 명확히 구분 가능 | 관리자 승인 UI 추가 필요 |
| 방안 B | 구현 간단, 즉시 적용 가능 | 목표와 실적 구분 불가 |

### 7.3 🎯 추천 방안: 방안 A (관리자 승인 화면 추가)

#### 이유
1. **데이터베이스 스키마가 이미 분리되어 있음** (target vs actual)
2. **비즈니스 로직 상 목표와 실적은 다를 수 있음**
   - 목표: 5,000,000원
   - 실적: 4,800,000원 (목표 미달)
3. **향후 확장성** (목표 vs 실적 분석, 달성률 추이 등)

---

## 8. 📌 최종 정리

### 8.1 각 항목의 역할

| 항목 | 데이터베이스 필드 | 입력자 | 입력 시점 | 용도 |
|------|-------------------|--------|----------|------|
| 목표수금금액 | `targetCollectionAmount` | 영업담당자 | 보고서 작성 | 계획한 수금 목표 |
| 목표매출액 | `targetSalesAmount` | 영업담당자 | 보고서 작성 | 계획한 매출 목표 |
| 영업활동 | `activityNotes` (JSON) | 영업담당자 | 보고서 작성 | 활동 기록 (정보성) |
| 실제수금금액 | `actualCollectionAmount` | 관리자 | 보고서 승인 | 실제 달성한 수금 ⭐ |
| 실제매출액 | `actualSalesAmount` | 관리자 | 보고서 승인 | 실제 달성한 매출 ⭐ |

### 8.2 누적 금액 계산 공식

```sql
-- 누적 수금액 (월간)
SELECT SUM(actualCollectionAmount)
FROM reports
WHERE submittedBy = '직원명'
  AND status = '승인'
  AND YEAR(submittedDate) = 2025
  AND MONTH(submittedDate) = 10;

-- 누적 매출액 (월간, 부가세 제외)
SELECT SUM(CASE
  WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)
  ELSE actualSalesAmount
END)
FROM reports
WHERE submittedBy = '직원명'
  AND status = '승인'
  AND YEAR(submittedDate) = 2025
  AND MONTH(submittedDate) = 10;

-- 연간 누적은 MONTH 조건 제거
```

### 8.3 변수명 및 로직 문제 없음 (해결 시)

#### ✅ 변수명 일관성
- 프론트엔드: `targetCollectionAmount`, `targetSalesAmount`
- 백엔드: `targetCollectionAmount`, `targetSalesAmount`
- 데이터베이스: `targetCollectionAmount`, `targetSalesAmount`

#### ✅ 로직 일관성
- 부가세 계산: 프론트엔드와 백엔드 모두 `amount / 1.1` 사용
- 누적 계산: `status = '승인'` 조건으로 필터링

#### ❌ 유일한 문제
- **`actualCollectionAmount`와 `actualSalesAmount`가 입력되지 않음**
- **해결 방법**: 관리자 승인 UI 추가 (방안 A)

---

## 9. 📋 다음 단계 체크리스트

### 즉시 수행 가능
- [ ] 관리자 승인 화면 기획
- [ ] 실제 실적 입력 UI 설계
- [ ] API 엔드포인트 추가 (`PUT /api/reports/:reportId/approve`)

### 중기 개선
- [ ] 목표 vs 실적 대시보드 추가
- [ ] 달성률 추이 그래프
- [ ] 거래처별 실적 분석

### 장기 확장
- [ ] 예측 모델 (목표 달성 가능성)
- [ ] 영업활동 패턴 분석
- [ ] 실적 보고서 자동 생성

---

## 📝 문서 작성 정보
- **작성일**: 2025-10-11
- **분석 대상**: KUWOTECH 영업관리 시스템
- **분석 범위**: 실적보고서 작성 ~ 누적 금액 계산
- **주요 발견**: actual 필드 미입력 문제

---
