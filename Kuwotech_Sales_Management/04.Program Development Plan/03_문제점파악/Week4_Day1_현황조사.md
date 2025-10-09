# Week 4 Day 1: 인라인 스타일 현황 조사
**작성일**: 2025-10-09
**작성자**: Daniel.K (with Claude Code)

---

## 📋 조사 개요

### 목적
Week 3에서 우선순위 파일(layout_common.js, employees.js)의 인라인 스타일을 제거했습니다.
Week 4에서는 나머지 모든 파일의 인라인 스타일을 체계적으로 제거합니다.

### 조사 범위
- **JavaScript 파일 전체**: `05.Source/**/*.js`
- **검색 패턴**: `style="..."`

---

## 📊 전체 현황

### 총 인라인 스타일 개수
```bash
$ grep -r "style=\"" --include="*.js" | wc -l
194
```

**총 194개의 인라인 스타일이 남아있습니다.**

---

## 📈 파일별 상세 현황 (상위 20개)

| 순위 | 파일 경로 | 개수 | 우선순위 |
|------|----------|------|----------|
| 1 | 04.admin_mode/08_excel_upload/**02_excel_upload.js** | **76** | 🔴 최우선 |
| 2 | 04.admin_mode/03_report_confirm/**03_reports_download.js** | **25** | 🔴 최우선 |
| 3 | 04.admin_mode/01_dashboard/**02_dashboard.js** | **20** | 🟠 높음 |
| 4 | 04.admin_mode/07_system_settings/**02_settings.js** | **10** | 🟠 높음 |
| 5 | 03.sales_mode/06_system_settings/**02_settings.js** | **10** | 🟠 높음 |
| 6 | 03.sales_mode/03_report_write/**02_report_write.js** | **9** | 🟡 중간 |
| 7 | 03.sales_mode/02_my_companies/**02_my_companies.js** | **8** | 🟡 중간 |
| 8 | 04.admin_mode/02_all_companies/**02_all_companies.js** | **7** | 🟡 중간 |
| 9 | 01.common/**06_modal.js** | **7** | 🟡 중간 |
| 10 | 04.admin_mode/03_report_confirm/**02_report_confirm.js** | **5** | 🟢 낮음 |
| 11 | 01.common/**07_design.js** | **3** | 🟢 낮음 |
| 12 | 08.components/**02_dynamic_button.js** | **2** | 🟢 낮음 |
| 13 | 06.database/**08_excel_handler.js** | **2** | 🟢 낮음 |
| 14 | 04.admin_mode/04_presentation/**02_presentation.js** | **2** | 🟢 낮음 |
| 15 | 08.components/**03_dynamic_modal.js** | **1** | 🟢 낮음 |
| 16 | 04.admin_mode/05_data_management/**03_backup_download.js** | **1** | 🟢 낮음 |
| 17 | 03.sales_mode/05_data_management/**03_integrated_download.js** | **1** | 🟢 낮음 |
| 18 | 03.sales_mode/05_data_management/**02_data_management.js** | **1** | 🟢 낮음 |
| 19 | 03.sales_mode/05_admin_feedback/**02_admin_feedback.js** | **1** | 🟢 낮음 |
| 20 | 03.sales_mode/04_report_check/**02_report_check.js** | **1** | 🟢 낮음 |

---

## 🎯 우선순위 분석

### 🔴 최우선 파일 (50개 이상 또는 핵심 기능)
1. **02_excel_upload.js** (76개)
   - Excel 업로드/미리보기 UI
   - 테이블 렌더링 로직
   - CSS 변수 사용 (var(--spacing-lg), var(--text-primary))
   - 복잡한 레이아웃

2. **03_reports_download.js** (25개)
   - 보고서 다운로드 UI
   - 통계 카드 렌더링
   - 필터 UI

### 🟠 높은 우선순위 (10개 이상)
3. **admin/02_dashboard.js** (20개)
   - Week 3에서 일부 처리했으나 아직 20개 남음
   - 대시보드 핵심 UI

4. **02_settings.js (admin + sales)** (각 10개 = 20개)
   - 설정 페이지 UI
   - 양쪽 모드 모두 처리 필요

### 🟡 중간 우선순위 (5-9개)
5. **02_report_write.js** (9개) - 보고서 작성 UI
6. **02_my_companies.js** (8개) - 거래처 목록 UI
7. **02_all_companies.js** (7개) - 전체 거래처 목록 UI
8. **06_modal.js** (7개) - 공통 모달 클래스
9. **02_report_confirm.js** (5개) - 보고서 확인 UI

### 🟢 낮은 우선순위 (1-4개)
10개 파일, 총 15개 인라인 스타일

---

## 🔍 샘플 분석: 02_excel_upload.js

### 인라인 스타일 패턴 (76개 중 일부)

#### 1. 색상 스타일
```javascript
<span style="color: rgba(76, 175, 80, 0.9);">  // 성공 색상
<span style="color: rgba(255, 193, 7, 0.9);">  // 경고 색상
```
**→ 유틸리티 클래스로 대체 가능**: `.text-success`, `.text-warning`

#### 2. 레이아웃 스타일
```javascript
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-md);">
<div style="padding: var(--spacing-md); border-radius: var(--border-radius-sm); text-align: center;">
```
**→ 유틸리티 클래스로 대체 가능**: `.grid-auto-fit`, `.p-md`, `.border-radius-sm`, `.text-center`

#### 3. 테이블 스타일
```javascript
<table style="width: 100%; border-collapse: collapse; font-size: var(--font-sm);">
<th style="padding: var(--spacing-sm); text-align: left; color: var(--text-primary);">
<td style="padding: var(--spacing-sm); color: var(--text-secondary);">
```
**→ CSS 클래스로 대체 가능**: `.preview-table`, `.preview-th`, `.preview-td`

#### 4. 스크롤 컨테이너
```javascript
<div style="max-height: 400px; overflow: auto; border-radius: var(--border-radius-sm); background: rgba(0, 0, 0, 0.3);">
```
**→ 유틸리티 클래스로 대체 가능**: `.max-h-400`, `.overflow-auto`, `.border-radius-sm`, `.bg-dark-30`

---

## 📝 인라인 스타일 카테고리 분류

### 1. 색상 관련 (약 40%)
- `color: rgba(...)`
- `background: rgba(...)`
- `border-color: ...`

**대응**: `.text-*`, `.bg-*`, `.border-*` 유틸리티 클래스

### 2. 레이아웃 관련 (약 30%)
- `display: flex/grid`
- `padding: ...`
- `margin: ...`
- `gap: ...`

**대응**: `.d-flex`, `.d-grid`, `.p-*`, `.m-*`, `.gap-*` 유틸리티 클래스

### 3. 타이포그래피 관련 (약 15%)
- `font-size: ...`
- `font-weight: ...`
- `text-align: ...`

**대응**: `.text-*`, `.font-*` 유틸리티 클래스

### 4. 테이블 관련 (약 10%)
- `border-collapse`
- `white-space: nowrap`
- sticky positioning

**대응**: 테이블 전용 CSS 클래스

### 5. 기타 (약 5%)
- `overflow: auto`
- `border-radius: ...`
- `max-height: ...`

**대응**: 유틸리티 클래스

---

## 🎯 Week 4 작업 계획

### Week 4 Day 1-2: 우선순위 파일 처리
**목표**: 🔴 최우선 + 🟠 높음 (총 136개)

1. **02_excel_upload.js** (76개)
   - 추가 유틸리티 클래스 필요: grid layouts, preview tables
   - 예상 시간: 2-3시간

2. **03_reports_download.js** (25개)
   - 통계 카드, 필터 UI
   - 예상 시간: 1시간

3. **admin/02_dashboard.js** (20개)
   - 대시보드 UI 나머지
   - 예상 시간: 1시간

4. **02_settings.js (both modes)** (20개)
   - 설정 페이지 UI
   - 예상 시간: 1-2시간

### Week 4 Day 3: 중간 우선순위 처리
**목표**: 🟡 중간 (총 36개)

- 02_report_write.js (9개)
- 02_my_companies.js (8개)
- 02_all_companies.js (7개)
- 06_modal.js (7개)
- 02_report_confirm.js (5개)

### Week 4 Day 4: 낮은 우선순위 + 공통 모듈
**목표**: 🟢 낮음 (총 15개) + 공통 모듈

- 07_design.js (3개)
- 나머지 10개 파일 (각 1-2개)
- 공통 모듈 정리

### Week 4 Day 5: HTML 파일 + CSS 통합
**목표**: HTML inline styles + CSS 중복 제거

- HTML 파일 내 inline style 검색
- CSS 중복 제거
- 최종 검증 및 보고서

---

## 📈 예상 성과

### 목표
- **인라인 스타일 제거**: 194개 → 0개
- **추가 유틸리티 클래스**: 50-100개 예상
- **코드 줄 감소**: 약 300-500 lines 예상
- **CSS 파일 증가**: 약 200-300 lines 예상 (재사용 가능)

### 효과
1. **유지보수성 향상**: 중앙 집중식 CSS 관리
2. **일관성 확보**: 전체 시스템 통일된 스타일
3. **성능 최적화**: CSS 클래스 > 인라인 스타일
4. **가독성 향상**: JavaScript 로직과 스타일 분리

---

## 🚀 다음 단계

1. ✅ **Week 4 Day 1 현황 조사 완료**
2. ⏳ **Week 4 Day 1-2 시작**: 02_excel_upload.js (76개) 인라인 스타일 제거
3. 📋 **추가 유틸리티 클래스 설계**: 테이블, 그리드 레이아웃 전용

---

**Week 4 Day 1 현황 조사 완료** ✅

**다음**: 02_excel_upload.js 인라인 스타일 제거 시작 (76개 → 0개)
