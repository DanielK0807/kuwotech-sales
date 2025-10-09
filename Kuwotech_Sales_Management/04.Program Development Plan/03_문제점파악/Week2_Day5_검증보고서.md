# Week 2 Day 5: 하드코딩 제거 검증 보고서
**작성일**: 2025-10-09
**작성자**: Daniel.K (with Claude Code)

---

## 📋 검증 개요

### 목표
- 우선순위 파일의 하드코딩 완전 제거 검증
- 포맷 함수 표준화 적용 확인
- 음수/소수점 규칙 구현 검증

### 검증 범위
Week 2 Day 3-4에서 수정한 우선순위 파일:
- ✅ sales/02_dashboard.js (3개 위치)
- ✅ admin/02_dashboard.js (4개 위치)
- ✅ my_companies.js (4개 위치)
- ✅ all_companies.js (4개 위치)

---

## ✅ 검증 결과

### 1. 하드코딩 제거 확인

#### Dashboard 파일
```bash
# 검증 명령
grep -rn "\.toFixed\|\.toLocaleString" 03.sales_mode/01_dashboard/ 04.admin_mode/01_dashboard/

# 결과: 0개 (완전 제거)
```

**Before (7개 인스턴스)**:
```javascript
// sales/02_dashboard.js
const absVal = Math.abs(val).toFixed(2);  // 3개

// admin/02_dashboard.js
const absVal = Math.abs(val).toFixed(2);  // 4개
```

**After (0개)**:
```javascript
// 모든 파일에서 formatPercent() 사용
const formatted = formatPercent(Math.abs(val) / 100, 2, false);
```

#### 거래처 관리 파일
```bash
# 검증 명령
grep -rn "\.toFixed\|\.toLocaleString" 03.sales_mode/02_my_companies/ 04.admin_mode/02_all_companies/

# 결과: 0개 (완전 제거)
```

**Before (8개 인스턴스)**:
```javascript
// my_companies.js & all_companies.js
company.lastPaymentAmount.toLocaleString() + '원'    // 각 4개
company.accumulatedCollection.toLocaleString() + '원'
company.accumulatedSales.toLocaleString() + '원'
company.accountsReceivable.toLocaleString() + '원'
```

**After (0개)**:
```javascript
// 모든 파일에서 formatCurrency() 사용
formatCurrency(company.lastPaymentAmount, true)
formatCurrency(company.accumulatedCollection, true)
formatCurrency(company.accumulatedSales, true)
formatCurrency(company.accountsReceivable, true)
```

### 2. 표준화된 Format 함수 사용

#### formatPercent() 적용 (Dashboard)
- **위치**: 회사배정기준대비달성율, 주요고객처목표달성율
- **변경**: `.toFixed(2)` → `formatPercent(value / 100, 2, false)`
- **효과**: 일관된 퍼센트 표시 (소수점 2자리)

#### formatCurrency() 적용 (거래처 관리)
- **위치**: 모달 내 읽기전용 금액 필드
- **변경**: `.toLocaleString() + '원'` → `formatCurrency(value, true)`
- **효과**:
  - 천단위 구분 기호 자동 적용
  - '원' 단위 자동 추가
  - 음수는 `.text-negative` 클래스 적용 가능

### 3. 중복 코드 제거

#### Dashboard 파일들
**제거된 중복 함수**:
```javascript
// 제거 전: 각 dashboard 파일에 중복 존재
function formatTime(date) { ... }
function formatDateTime(date) { ... }

// 제거 후: import로 통합
import {
    formatDateTime,
    formatTime
} from '../../01.common/20_common_index.js';
```

---

## 📊 전체 하드코딩 현황

### 우선순위 파일 (완료)
| 파일 | Before | After | 상태 |
|------|--------|-------|------|
| sales/02_dashboard.js | 3 | 0 | ✅ |
| admin/02_dashboard.js | 4 | 0 | ✅ |
| my_companies.js | 4 | 0 | ✅ |
| all_companies.js | 4 | 0 | ✅ |
| **합계** | **15** | **0** | **✅** |

### 전체 프로젝트 현황
```
.toFixed() 총 개수: 55개
├─ 우선순위 파일: 0개 ✅
├─ Format 함수 내부: 3개 (정상)
├─ KPI 계산 로직: 약 25개 (비즈니스 로직)
└─ 기타 시스템 파일: 약 27개 (백업, 데이터 관리 등)

.toLocaleString() 총 개수: 35개
├─ 우선순위 파일: 0개 ✅
├─ Format 함수 내부: 1개 (정상)
├─ KPI 계산 로직: 약 20개
└─ 기타 시스템 파일: 약 14개
```

---

## 🎯 Week 2 Day 1-2 구현 검증

### 포맷 함수 표준화 (03_format.js)

#### 1. applyNegativeStyle()
```javascript
applyNegativeStyle(element, isNegative) {
    if (isNegative) {
        element.classList.add('text-negative');
    } else {
        element.classList.remove('text-negative');
    }
}
```
**검증**: `.text-negative` 클래스가 02_common.css:828에 존재 ✅

#### 2. formatNumber() - 정수 전용
```javascript
formatNumber(value, useParentheses = false) {
    // ...
    const formatted = new Intl.NumberFormat(this.locale, {
        minimumFractionDigits: 0,  // INTEGER ONLY
        maximumFractionDigits: 0   // INTEGER ONLY
    }).format(absValue);
    // ...
}
```
**검증**: 소수점이 강제로 0으로 설정됨 ✅

#### 3. formatPercent() - 소수점 2자리
```javascript
formatPercent(value, decimals = 2, includeSymbol = true) {
    // 퍼센트는 소수점 2자리 허용
}
```
**검증**: 퍼센트만 decimals 파라미터 유지 ✅

#### 4. formatInputNumber() & initNumberInputs()
```javascript
// 입력 필드에서 소수점 완전 차단
let value = input.value.replace(/[^\d-]/g, '');  // 소수점 제외
```
**검증**: input 이벤트에서 소수점 입력 차단 ✅

---

## 🔄 Git 커밋 이력

### Week 2 관련 커밋
1. **197b651**: Week 2 Day 1-2 - 포맷 함수 표준화 (정수 전용 & 음수 스타일)
   - applyNegativeStyle() 추가
   - formatNumber() 정수 전용 수정
   - formatInputNumber(), initNumberInputs() 추가

2. **a37bcf1**: Week 2 Day 3-4 - Dashboard 하드코딩 제거 (7개)
   - sales/02_dashboard.js: .toFixed(2) → formatPercent()
   - admin/02_dashboard.js: .toFixed(2) → formatPercent()
   - 중복 함수 제거

3. **fd65da3**: Week 2 Day 3-4 - 거래처 관리 하드코딩 제거 (8개)
   - my_companies.js: .toLocaleString() → formatCurrency()
   - all_companies.js: .toLocaleString() → formatCurrency()

**모든 커밋이 GitHub에 푸시됨** ✅

---

## 📝 음수/소수점 규칙 요약

### 정책
1. **모든 숫자**: 정수만 (소수점 없음)
2. **퍼센트(%)**: 소수점 2자리 허용
3. **음수**: `.text-negative` 클래스로 빨간색 표시 또는 괄호 표시

### 구현 상태
- ✅ formatNumber(): 정수 전용 강제
- ✅ formatCurrency(): 정수 전용 + '원' 단위
- ✅ formatPercent(): 소수점 2자리 + '%' 기호
- ✅ applyNegativeStyle(): 음수 자동 스타일링
- ✅ formatInputNumber(): 입력 필드 소수점 차단
- ✅ initNumberInputs(): 자동 초기화 및 이벤트 바인딩

---

## ✅ Week 2 최종 결론

### 완료 항목
- ✅ Week 2 Day 1-2: 포맷 함수 표준화 (정수 전용 & 음수 스타일)
- ✅ Week 2 Day 3-4: 우선순위 파일 하드코딩 제거 (15개)
- ✅ Week 2 Day 5: 검증 및 보고서 작성

### 성과
1. **우선순위 파일 하드코딩 완전 제거**: 15개 → 0개
2. **표준화된 Format 함수 적용**: formatNumber, formatCurrency, formatPercent
3. **중복 코드 제거**: formatTime, formatDateTime import로 통합
4. **음수/소수점 규칙 구현**: 정수 전용 + 퍼센트 예외
5. **자동 스타일링**: .text-negative 클래스 자동 적용

### 다음 단계 (Week 3)
- 코드 중복 제거 (layout_common.js 생성)
- 레이아웃 리팩토링
- 스크롤바 & 선택 스타일 통일

---

**Week 2 작업 완료** 🎉
