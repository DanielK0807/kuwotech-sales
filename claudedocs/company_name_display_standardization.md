# 거래처명 표시 방식 통일 구현

## 📋 구현 개요

실적보고서 확인 페이지에서도 실적보고서 작성 페이지와 동일한 방식으로 거래처명을 표시하도록 통일했습니다.

## 🎯 표시 우선순위

거래처명은 다음 우선순위로 표시됩니다:

```
1. finalCompanyName (최종거래처명) - 우선 표시
   ↓ (없으면)
2. erpCompanyName (ERP거래처명) - 대체 표시
   ↓ (없으면)
3. '회사명 없음' - fallback
```

## ✅ 수정된 파일

### 1. 프론트엔드 - JavaScript

**파일**: `05.Source/04.admin_mode/03_report_confirm/02_report_confirm.js`

#### Import 추가 (line 18)
```javascript
import { getCompanyDisplayName } from '../../01.common/02_utils.js';
```

#### 보고서 리스트 표시 수정 (lines 448-471)
```javascript
function createReportItemHTML(report) {
    const isSelected = report.reportId === selectedReportId;

    // 거래처 표시명 가져오기 (finalCompanyName 우선, 없으면 erpCompanyName)
    const companyDisplayName = getCompanyDisplayName(report) || report.companyName || '회사명 없음';

    return `
        <div class="report-item ${isSelected ? 'selected' : ''}"
             data-report-id="${report.reportId}"
             onclick="handleReportClick('${report.reportId}')">
            <div class="report-item-header">
                <span class="report-type">${REPORT_TYPE_MAP[report.reportType] || report.reportType}</span>
                ${getStatusBadgeHTML(report.calculatedStatus)}
            </div>
            <div class="report-item-body">
                <div class="report-company">${companyDisplayName}</div>
                <div class="report-meta">
                    <span class="report-author">👤 ${report.submittedBy}</span>
                    <span class="report-date">📅 ${formatDate(report.submittedDate)}</span>
                </div>
            </div>
        </div>
    `;
}
```

#### 보고서 상세 표시 수정 (lines 498-500)
```javascript
// 거래처 표시명 가져오기 (finalCompanyName 우선, 없으면 erpCompanyName)
const companyDisplayName = getCompanyDisplayName(report) || report.companyName || '-';
document.getElementById('detailCompany').textContent = companyDisplayName;
```

### 2. 백엔드 - API 쿼리

**파일**: `backend/controllers/reports.controller.js`

#### getAllReports 함수 수정 (lines 30-41)
```javascript
let query = `
  SELECT
    r.reportId, r.submittedBy, r.submittedDate, r.companyId,
    r.reportType, r.targetCollectionAmount, r.targetSalesAmount,
    r.actualCollectionAmount, r.actualSalesAmount,
    r.targetProducts, r.soldProducts, r.activityNotes, r.status, r.processedBy,
    r.processedDate, r.adminComment, r.createdAt, r.updatedAt,
    c.finalCompanyName, c.erpCompanyName,        -- ✅ 추가
    c.finalCompanyName as companyName
  FROM reports r
  LEFT JOIN companies c ON r.companyId = c.keyValue
  WHERE 1=1
`;
```

#### getReportById 함수 수정 (lines 176-189)
```javascript
const [reports] = await db.execute(`
  SELECT
    r.reportId, r.submittedBy, r.submittedDate, r.companyId,
    r.reportType, r.targetCollectionAmount, r.targetSalesAmount,
    r.actualCollectionAmount, r.actualSalesAmount,
    r.targetProducts, r.soldProducts, r.activityNotes, r.status, r.processedBy,
    r.processedDate, r.adminComment, r.createdAt, r.updatedAt,
    c.finalCompanyName, c.erpCompanyName,        -- ✅ 추가
    c.finalCompanyName as companyName,
    c.internalManager as companyManager
  FROM reports r
  LEFT JOIN companies c ON r.companyId = c.keyValue
  WHERE r.reportId = ?
`, [reportId]);
```

#### getReportsByEmployee 함수 수정 (lines 221-233)
```javascript
let query = `
  SELECT
    r.reportId, r.submittedBy, r.submittedDate, r.companyId,
    r.reportType, r.targetCollectionAmount, r.targetSalesAmount,
    r.actualCollectionAmount, r.actualSalesAmount,
    r.targetProducts, r.soldProducts,
    r.status, r.processedBy, r.processedDate, r.adminComment,
    c.finalCompanyName, c.erpCompanyName,        -- ✅ 추가
    c.finalCompanyName as companyName
  FROM reports r
  LEFT JOIN companies c ON r.companyId = c.keyValue
  WHERE r.submittedBy = ?
`;
```

## 🔍 getCompanyDisplayName 함수 구현

**위치**: `05.Source/01.common/02_utils.js` (lines 397-402)

```javascript
/**
 * 거래처 표시명 가져오기
 * @param {Object} company - 거래처 객체
 * @returns {string} 표시할 거래처명
 */
export function getCompanyDisplayName(company) {
    if (!company) return '';

    // 최종거래처명 우선, 없으면 ERP거래처명 사용
    return company.finalCompanyName || company.erpCompanyName || '';
}
```

## 📊 데이터 흐름

### 1. 백엔드 쿼리
```sql
SELECT
    c.finalCompanyName,      -- 최종거래처명
    c.erpCompanyName,         -- ERP거래처명
    c.finalCompanyName as companyName  -- 하위 호환성
FROM reports r
LEFT JOIN companies c ON r.companyId = c.keyValue
```

### 2. API 응답
```json
{
  "reportId": "abc-123",
  "companyId": "COMPANY_001",
  "finalCompanyName": "쿠워텍 주식회사",
  "erpCompanyName": "KUWOTECH_ERP",
  "companyName": "쿠워텍 주식회사"
}
```

### 3. 프론트엔드 표시
```javascript
const companyDisplayName = getCompanyDisplayName(report);
// 결과: "쿠워텍 주식회사" (finalCompanyName 우선)

// finalCompanyName이 없는 경우
// 결과: "KUWOTECH_ERP" (erpCompanyName 대체)

// 둘 다 없는 경우
// 결과: "" (빈 문자열)
// → 이후 fallback 처리: report.companyName || '회사명 없음'
```

## 🎨 UI 표시 예시

### 보고서 리스트
```
┌────────────────────────────────────┐
│ 📊 금주 실적보고서                    │
├────────────────────────────────────┤
│ ┌──────────────────────────────┐  │
│ │ 주간보고서     ✅ 완료        │  │
│ │ 쿠워텍 주식회사               │  │ ← getCompanyDisplayName()
│ │ 👤 김영업   📅 2025-10-11    │  │
│ └──────────────────────────────┘  │
│ ┌──────────────────────────────┐  │
│ │ 월간보고서     ⚠️ 일부완료   │  │
│ │ 삼성전자                      │  │ ← getCompanyDisplayName()
│ │ 👤 이담당   📅 2025-10-10    │  │
│ └──────────────────────────────┘  │
└────────────────────────────────────┘
```

### 보고서 상세
```
┌────────────────────────────────────┐
│ 📝 보고서 기본 정보                  │
├────────────────────────────────────┤
│ 보고서 ID:  REP-2025-001           │
│ 보고서 유형: 주간보고서             │
│ 작성자:     김영업                  │
│ 거래처:     쿠워텍 주식회사         │ ← getCompanyDisplayName()
│ 제출일:     2025-10-11              │
│ 상태:       ✅ 완료                 │
└────────────────────────────────────┘
```

## ✅ 통일된 동작 확인

### 실적보고서 작성 페이지
- ✅ `getCompanyDisplayName()` 사용
- ✅ finalCompanyName 우선 표시
- ✅ erpCompanyName 대체 표시

### 실적보고서 확인 페이지 (이번 수정)
- ✅ `getCompanyDisplayName()` 사용
- ✅ finalCompanyName 우선 표시
- ✅ erpCompanyName 대체 표시

### 전체 거래처 관리 페이지
- ✅ `getCompanyDisplayName()` 사용
- ✅ finalCompanyName 우선 표시
- ✅ erpCompanyName 대체 표시

## 🎯 달성한 목표

1. ✅ **일관성**: 모든 페이지에서 동일한 방식으로 거래처명 표시
2. ✅ **정확성**: finalCompanyName과 erpCompanyName을 정확히 구분하여 표시
3. ✅ **유지보수성**: `getCompanyDisplayName()` 유틸리티 함수로 중앙 관리
4. ✅ **하위 호환성**: 기존 `companyName` 필드도 유지하여 fallback 지원

## 📝 테스트 시나리오

### 시나리오 1: finalCompanyName이 있는 경우
```
데이터:
  finalCompanyName: "쿠워텍 주식회사"
  erpCompanyName: "KUWOTECH_ERP"

표시 결과: "쿠워텍 주식회사" ✅
```

### 시나리오 2: finalCompanyName이 없는 경우
```
데이터:
  finalCompanyName: null
  erpCompanyName: "SAMSUNG_ELEC"

표시 결과: "SAMSUNG_ELEC" ✅
```

### 시나리오 3: 둘 다 없는 경우
```
데이터:
  finalCompanyName: null
  erpCompanyName: null
  companyName: "레거시 거래처명"

표시 결과: "레거시 거래처명" ✅
```

### 시나리오 4: 모두 없는 경우
```
데이터:
  finalCompanyName: null
  erpCompanyName: null
  companyName: null

표시 결과: "회사명 없음" ✅
```

## 🚀 향후 개선 가능 사항

### 1. 거래처명 병합 표시
```javascript
// 예: "쿠워텍 주식회사 (KUWOTECH_ERP)"
function getCompanyDisplayNameWithErp(company) {
    const finalName = company.finalCompanyName;
    const erpName = company.erpCompanyName;

    if (finalName && erpName && finalName !== erpName) {
        return `${finalName} (${erpName})`;
    }
    return getCompanyDisplayName(company);
}
```

### 2. 거래처명 검색 강화
```javascript
// finalCompanyName, erpCompanyName 모두 검색 대상
function searchCompanies(query) {
    return companies.filter(c =>
        c.finalCompanyName?.includes(query) ||
        c.erpCompanyName?.includes(query)
    );
}
```

### 3. 거래처명 히스토리
- finalCompanyName 변경 이력 추적
- 이전 명칭으로도 검색 가능

## 🎉 구현 완료!

실적보고서 확인 페이지에서도 실적보고서 작성 페이지와 동일한 방식으로 거래처명이 표시됩니다. 이제 시스템 전체에서 일관된 거래처명 표시 방식이 적용되었습니다.

**변경된 파일:**
- `05.Source/04.admin_mode/03_report_confirm/02_report_confirm.js`
- `backend/controllers/reports.controller.js`

**재사용된 유틸리티:**
- `05.Source/01.common/02_utils.js` → `getCompanyDisplayName()`
