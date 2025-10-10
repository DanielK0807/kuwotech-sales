# 보고서 승인 시스템 구현 완료

## 📋 구현 개요

관리자가 실적보고서를 승인할 때 **실제 수금금액**과 **실제 매출금액**을 입력할 수 있는 시스템이 성공적으로 구현되었습니다. 이를 통해 `actualCollectionAmount`와 `actualSalesAmount` 필드가 정상적으로 채워지며, 누적 매출/수금 금액 계산이 정확하게 작동합니다.

## ✅ 구현 완료 항목

### 1. **프론트엔드 - 관리자 승인 UI**

#### 수정된 파일: `05.Source/04.admin_mode/03_report_confirm/01_report_confirm.html`

**추가된 기능:**

1. **실제 수금금액 입력 필드** (lines 194-204)
```html
<div class="approval-input-section">
    <label class="approval-label">실제 수금금액 입력 (승인용)</label>
    <input
        type="text"
        id="actualCollectionAmountInput"
        class="glass-input approval-input"
        placeholder="0"
        inputmode="numeric">
    <small class="input-help">* 실제 수금한 금액을 입력하세요 (자동으로 쉼표가 추가됩니다)</small>
</div>
```

2. **실제 매출금액 입력 필드** (lines 215-225)
```html
<div class="approval-input-section">
    <label class="approval-label">실제 매출금액 입력 (승인용)</label>
    <input
        type="text"
        id="actualSalesAmountInput"
        class="glass-input approval-input"
        placeholder="0"
        inputmode="numeric">
    <small class="input-help">* 실제 매출 금액을 입력하세요 (자동으로 쉼표가 추가됩니다)</small>
</div>
```

3. **승인 버튼 및 의견 저장 버튼** (lines 244-251)
```html
<div class="comment-actions">
    <button class="glass-button secondary" id="saveCommentBtn">
        💾 의견만 저장
    </button>
    <button class="glass-button primary approve-btn" id="approveReportBtn">
        ✅ 보고서 승인
    </button>
</div>
```

4. **CSS 스타일 추가** (lines 801-846)
- `.approval-input-section`: 승인 입력 섹션 스타일
- `.approval-label`: 라벨 스타일
- `.approval-input`: 입력 필드 스타일 (녹색 테두리)
- `.input-help`: 도움말 텍스트 스타일
- `.glass-button.primary`: 승인 버튼 (녹색)
- `.glass-button.secondary`: 의견만 저장 버튼 (파란색)

### 2. **프론트엔드 - JavaScript 로직**

#### 수정된 파일: `05.Source/04.admin_mode/03_report_confirm/02_report_confirm.js`

**추가된 기능:**

1. **금액 포맷팅 유틸리티 함수** (lines 31-76)

```javascript
/**
 * 숫자를 3자리마다 쉼표가 있는 형식으로 변환
 */
function formatNumberWithCommas(value) {
    const numericValue = String(value).replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 쉼표가 포함된 문자열을 숫자로 변환
 */
function parseFormattedNumber(value) {
    if (!value) return 0;
    return parseFloat(String(value).replace(/,/g, '')) || 0;
}

/**
 * 금액 입력 필드에 포맷팅 이벤트 바인딩
 */
function bindAmountFormatting(inputElement) {
    // 실시간 포맷팅 및 커서 위치 유지
}
```

2. **보고서 상세 렌더링 업데이트** (lines 501-532)

```javascript
// 실제 수금금액 입력 필드
const actualCollectionInput = document.getElementById('actualCollectionAmountInput');
if (actualCollectionInput) {
    // 기존 실제 금액이 있으면 표시
    if (report.actualCollectionAmount && report.actualCollectionAmount > 0) {
        actualCollectionInput.value = formatNumberWithCommas(report.actualCollectionAmount);
    } else {
        actualCollectionInput.value = '';
    }
    // 포맷팅 이벤트 바인딩 (기존 이벤트 제거 후 재등록)
    const newInput = actualCollectionInput.cloneNode(true);
    actualCollectionInput.parentNode.replaceChild(newInput, actualCollectionInput);
    bindAmountFormatting(newInput);
}

// 실제 매출금액 입력 필드 (동일한 로직)
```

3. **보고서 승인 핸들러** (lines 760-865)

```javascript
async function handleApproveReport() {
    // 1. 선택된 보고서 확인
    if (!selectedReportId) {
        alert('보고서를 선택해주세요.');
        return;
    }

    // 2. 입력값 가져오기
    const actualCollectionAmount = parseFormattedNumber(actualCollectionInput.value);
    const actualSalesAmount = parseFormattedNumber(actualSalesInput.value);
    const comment = document.getElementById('adminComment').value.trim();

    // 3. 유효성 검사
    if (actualCollectionAmount === 0 && actualSalesAmount === 0) {
        const confirmed = confirm('실제 금액이 모두 0입니다. 그래도 승인하시겠습니까?');
        if (!confirmed) return;
    }

    // 4. 확인 메시지
    const confirmMessage = `다음 내용으로 보고서를 승인하시겠습니까?\n\n` +
        `📊 실제 수금금액: ${formatCurrency(actualCollectionAmount)}\n` +
        `📊 실제 매출금액: ${formatCurrency(actualSalesAmount)}`;

    if (!confirm(confirmMessage)) return;

    // 5. API 호출
    const response = await apiManager.updateReport(selectedReportId, {
        actualCollectionAmount,
        actualSalesAmount,
        adminComment: comment,
        processedBy: user.name,
        status: '승인'
    });

    // 6. 성공 처리
    if (response.success) {
        alert('✅ 보고서가 승인되었습니다.');
        await initializePage(); // UI 새로고침
    }
}
```

4. **이벤트 리스너 등록** (lines 960-964)

```javascript
// 보고서 승인 버튼
const approveReportBtn = document.getElementById('approveReportBtn');
if (approveReportBtn) {
    approveReportBtn.addEventListener('click', handleApproveReport);
}
```

### 3. **백엔드 API 업데이트**

#### 수정된 파일: `backend/controllers/reports.controller.js`

**추가된 기능:**

1. **actualCollectionAmount, actualSalesAmount 필드 지원** (lines 342-353)

```javascript
const {
    reportType,
    targetCollectionAmount,
    targetSalesAmount,
    actualCollectionAmount,      // 추가
    actualSalesAmount,           // 추가
    targetProducts,
    activityNotes,
    status,
    adminComment,
    processedBy
} = req.body;
```

2. **동적 업데이트 쿼리 구성** (lines 386-393)

```javascript
if (actualCollectionAmount !== undefined) {
    updates.push('actualCollectionAmount = ?');
    params.push(actualCollectionAmount);
}
if (actualSalesAmount !== undefined) {
    updates.push('actualSalesAmount = ?');
    params.push(actualSalesAmount);
}
```

## 📊 데이터 흐름

### 승인 프로세스

```
1. 영업담당자가 보고서 작성
   ├─ targetCollectionAmount: 5,000,000 (목표)
   ├─ targetSalesAmount: 7,545,454 (목표)
   ├─ actualCollectionAmount: 0 (초기값)
   └─ actualSalesAmount: 0 (초기값)

2. 관리자가 승인 화면에서 실제 금액 입력
   ├─ actualCollectionAmount 입력 필드: "4,500,000"
   ├─ actualSalesAmount 입력 필드: "7,000,000"
   └─ 관리자 의견: "실적 우수함"

3. "✅ 보고서 승인" 버튼 클릭
   ├─ parseFormattedNumber로 숫자 변환
   ├─ API 호출: PUT /api/reports/:reportId
   └─ 데이터베이스 업데이트:
       ├─ actualCollectionAmount: 4500000
       ├─ actualSalesAmount: 7000000
       ├─ status: '승인'
       ├─ processedBy: '강정환'
       └─ processedDate: NOW()

4. 누적 실적 계산 (goals.controller.js)
   └─ SELECT SUM(actualCollectionAmount), SUM(actualSalesAmount)
       FROM reports
       WHERE submittedBy = ? AND status = '승인'
   → 이제 정확한 누적 금액 계산 가능! ✅
```

## 🎯 해결된 문제

### 이전 문제점
- `actualCollectionAmount`와 `actualSalesAmount` 필드가 항상 0으로 남아있음
- 누적 실적 계산 시 `SUM(actualCollectionAmount)` 결과가 항상 0
- 관리자가 실제 금액을 입력할 UI가 없었음

### 해결 방법
1. ✅ **관리자 승인 UI 추가**: 실제 금액을 입력할 수 있는 입력 필드 제공
2. ✅ **자동 포맷팅**: 3자리마다 쉼표 자동 추가 (사용자 편의성 향상)
3. ✅ **백엔드 API 지원**: `actualCollectionAmount`, `actualSalesAmount` 필드 업데이트 지원
4. ✅ **승인 상태 변경**: 승인 버튼 클릭 시 `status`를 '승인'으로 자동 변경
5. ✅ **실시간 검증**: 금액이 0일 경우 경고 메시지 표시

## 📝 사용 방법

### 관리자 승인 워크플로우

1. **관리자모드 → 실적보고서 확인** 메뉴 접속
2. **금주 보고서** 또는 **상태별 보고서**에서 승인할 보고서 클릭
3. 우측 상세 패널에서 **목표 금액** 확인:
   - 💰 목표수금금액: 영업담당자가 입력한 목표
   - 💵 목표매출액: 영업담당자가 입력한 목표

4. **실제 금액 입력**:
   - `실제 수금금액 입력 (승인용)` 필드에 실제 수금한 금액 입력
   - `실제 매출금액 입력 (승인용)` 필드에 실제 매출 금액 입력
   - 입력 시 자동으로 쉼표 포맷팅 적용 (예: 5000000 → 5,000,000)

5. **관리자 의견 작성** (선택):
   - 텍스트 영역에 피드백 작성

6. **승인 버튼 클릭**:
   - `✅ 보고서 승인` 버튼 클릭
   - 확인 팝업에서 입력한 금액 확인
   - "확인" 클릭 시 승인 완료

7. **결과 확인**:
   - 승인 완료 메시지 표시
   - 보고서 상태가 '승인'으로 변경
   - 누적 실적에 반영됨

### 의견만 저장 (승인 없이)

- `💾 의견만 저장` 버튼 클릭
- 실제 금액을 입력하지 않고 의견만 저장 가능
- 보고서 상태는 변경되지 않음

## 🔍 검증 방법

### 1. 프론트엔드 검증

```javascript
// 브라우저 콘솔에서 확인
console.log('실제 수금금액:', parseFormattedNumber('5,000,000')); // 5000000
console.log('실제 매출금액:', parseFormattedNumber('7,000,000')); // 7000000
```

### 2. 백엔드 검증

```sql
-- 데이터베이스에서 직접 확인
SELECT
    reportId,
    submittedBy,
    targetCollectionAmount,
    actualCollectionAmount,
    targetSalesAmount,
    actualSalesAmount,
    status,
    processedBy,
    processedDate
FROM reports
WHERE status = '승인'
ORDER BY processedDate DESC
LIMIT 10;
```

### 3. 누적 실적 검증

```sql
-- 특정 직원의 월간 누적 실적 확인
SELECT
    submittedBy,
    YEAR(submittedDate) as year,
    MONTH(submittedDate) as month,
    SUM(actualCollectionAmount) as totalCollection,
    SUM(CASE
        WHEN includeVAT = 1 THEN ROUND(actualSalesAmount / 1.1, 0)
        ELSE actualSalesAmount
    END) as totalSales
FROM reports
WHERE submittedBy = '영업담당자명'
    AND status = '승인'
    AND YEAR(submittedDate) = 2025
    AND MONTH(submittedDate) = 10
GROUP BY submittedBy, YEAR(submittedDate), MONTH(submittedDate);
```

## 🎨 UI 개선 사항

### 비주얼 디자인
- 🟢 **승인 버튼**: 녹색 그라데이션 (성공 강조)
- 🔵 **의견만 저장 버튼**: 파란색 그라데이션 (보조 액션)
- 🟩 **입력 필드**: 녹색 테두리 (승인 관련 강조)
- ⚡ **호버 효과**: 버튼에 마우스 올리면 위로 살짝 이동 및 그림자 효과

### 사용자 경험 (UX)
- 📝 **실시간 포맷팅**: 입력 중 자동으로 쉼표 추가
- 🎯 **커서 위치 유지**: 포맷팅 후에도 커서 위치 정확히 유지
- ⚠️ **유효성 검증**: 금액이 0일 경우 경고 메시지
- 💬 **확인 팝업**: 승인 전 입력한 금액 다시 확인
- ✅ **성공 메시지**: 승인 완료 시 명확한 피드백

## 🚀 향후 개선 가능 사항

### 1. 일괄 승인 기능
- 여러 보고서를 한 번에 승인할 수 있는 체크박스 UI
- 일괄 승인 시 각 보고서별 실제 금액 입력 모달

### 2. 승인 이력 추적
- 승인 취소 기능 (특정 권한자만)
- 승인 이력 로그 (누가, 언제, 무엇을 승인했는지)

### 3. 자동 금액 제안
- 목표 금액과 실제 금액의 차이 분석
- 과거 패턴 기반 실제 금액 자동 제안

### 4. 알림 시스템
- 승인 완료 시 영업담당자에게 알림
- 실적 달성률에 따른 자동 피드백 생성

## 📂 수정된 파일 목록

### 프론트엔드
1. `05.Source/04.admin_mode/03_report_confirm/01_report_confirm.html`
   - 실제 금액 입력 필드 추가
   - 승인 버튼 추가
   - CSS 스타일 추가

2. `05.Source/04.admin_mode/03_report_confirm/02_report_confirm.js`
   - 금액 포맷팅 유틸리티 함수 추가
   - `handleApproveReport()` 함수 추가
   - `renderReportDetail()` 함수 업데이트
   - 이벤트 리스너 등록

### 백엔드
3. `backend/controllers/reports.controller.js`
   - `updateReport()` 함수 업데이트
   - `actualCollectionAmount`, `actualSalesAmount` 필드 지원 추가

## 🎉 구현 완료!

모든 요청된 기능이 성공적으로 구현되었습니다. 이제 관리자는 보고서를 승인할 때 실제 금액을 입력할 수 있으며, 이를 통해 누적 실적 계산이 정확하게 작동합니다.

**테스트 권장 사항:**
1. 관리자 계정으로 로그인
2. 실적보고서 확인 메뉴 접속
3. 보고서 선택 후 실제 금액 입력
4. 승인 버튼 클릭
5. 데이터베이스에서 `actualCollectionAmount`, `actualSalesAmount` 필드 확인
6. 누적 실적 대시보드에서 정확한 금액 표시 확인
