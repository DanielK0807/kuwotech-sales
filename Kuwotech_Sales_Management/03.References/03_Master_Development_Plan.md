# 📋 KUWOTECH 영업관리 시스템 - 최종 개발 계획서 v3.0

> **작성일**: 2025-09-26  
> **작성자**: Daniel.K (<kinggo0807@hotmail.com>)  
> **소유자**: Kang Jung Hwan  
> **버전**: 3.0.0 (엑셀/폰트/로고 통합, 참고 문서 완전 반영)

---

<!-- ========================= [NAVIGATION] ========================= -->
<!-- [빠른 이동] 1.개요 | 2.리소스 분석 | 3.폴더 구조 | 4.디자인 | 5.기술 스택 | 6.개발 단계 | 7.데이터 흐름 | 8.참고 표 | 9.변수 규칙 | 10.완료 계획 | 11.타임라인 | 12.연락처 -->
<!-- ========================= [END NAVIGATION] ========================= -->

---

## 📋 목차

### PART 1: 프로젝트 개요

1. [프로젝트 개요 및 목표](#1-프로젝트-개요-및-목표)
2. [리소스 분석](#2-리소스-분석)

### PART 2: 시스템 설계

3. [최종 폴더 구조](#3-최종-폴더-구조)
4. [디자인 시스템](#4-디자인-시스템)
5. [기술 스택](#5-기술-스택)

### PART 3: 개발 계획

6. [개발 단계 (STAGE 0-7)](#6-개발-단계)
7. [데이터 흐름 및 동기화](#7-데이터-흐름-및-동기화)

### PART 4: 참고 정보

8. [참고 문서 핵심 표](#8-참고-문서-핵심-표)
9. [변수 명명 규칙](#9-변수-명명-규칙)

### PART 5: 완료 및 배포

10. [완료 계획 및 체크리스트](#10-완료-계획-및-체크리스트)
11. [프로젝트 타임라인](#11-프로젝트-타임라인)
12. [연락처 및 지원](#12-연락처-및-지원)

---

# PART 1: 프로젝트 개요

## 1. 프로젝트 개요 및 목표

### 1.1 프로젝트 정보

| 항목 | 내용 |
|------|------|
| **프로젝트명** | KUWOTECH 영업관리 시스템 리팩토링 |
| **버전** | 3.0.0 |
| **소스 폴더** | `F:\7.VScode\Running VS Code\KUWOTECH\Kuwotech_management` |
| **타겟 폴더** | `F:\7.VScode\Running VS Code\KUWOTECH\Kuwotech_Sales Management` |
| **개발 기간** | 14-20일 예상 |
| **배포 환경** | 가비아 서버 (로컬 테스트 후) |

### 1.2 핵심 목표

#### ✅ 절대 원칙

1. **기존 UI/기능 100% 동일 유지** - 픽셀 단위 복제
2. **코드만 개선** - 모듈화, 중복 제거, 가독성 향상
3. **디자인 변경 금지** - AI 독자적 가정(글래스모피즘, 모던 스타일 강화) 적용 금지
4. **기존 프로그램 기준** - `Kuwotech_management`의 구현을 절대 기준으로 삼음

#### 📊 개선 목표

- **유지보수성**: 코드 복잡도 50% 감소
- **성능**: KPI 계산 < 500ms
- **확장성**: 모듈 기반 구조
- **안정성**: 버그 제로 배포

---

## 2. 리소스 분석

### 2.1 엑셀 파일 분석

#### 📄 `영업관리기초자료.xlsx`

**위치**: `F:\7.VScode\Running VS Code\KUWOTECH\Kuwotech_Sales Management\01.Original_data\`

**파일 정보**:

- 크기: (실제 확인 필요)
- 시트 구성:
  1. **기본정보** (19개 컬럼)
  2. **입사일자** (영업담당자명 | 입사일자)

**기본정보 시트 컬럼 (19개)**:

| 순번 | 컬럼명 | 내부 필드명 | 자동업데이트 | 권한 |
|------|--------|-------------|--------------|------|
| 1 | NO | no | - | ❌ |
| 2 | KEY VALUE | keyValue | - | ❌ |
| 3 | 거래처명(ERP) | companyNameERP | - | 관리자 |
| 4 | 최종거래처명 | finalCompanyName | - | 모두 |
| 5 | 폐업여부 | isClosed | - | 모두 |
| 6 | 대표이사/치과의사 | ceoOrDentist | - | 모두 |
| 7 | 고객사 지역 | customerRegion | - | 모두 |
| 8 | 거래상태 | businessStatus | - | 모두 |
| 9 | 담당부서 | department | - | 모두 |
| 10 | 판매제품 | salesProduct | ✅ | 자동 |
| 11 | 내부담당자 | internalManager | - | 모두 |
| 12 | 정철웅기여 | jcwContribution | - | 모두 |
| 13 | 회사기여 | companyContribution | - | 모두 |
| 14 | 마지막결제일 | lastPaymentDate | ✅ | 자동 |
| 15 | 마지막총결재금액 | lastPaymentAmount | ✅ | 자동 |
| 16 | 매출채권잔액 | accountsReceivable | - | 관리자 |
| 17 | 누적수금금액 | accumulatedCollection | ✅ | 자동 |
| 18 | 누적매출금액 | accumulatedSales | ✅ | 자동 |
| 19 | 영업활동(특이사항) | businessActivity | ✅ | 영업담당+자동 |

**입사일자 시트**:

- 컬럼: 영업담당자명 | 입사일자
- 용도: 현재월수 계산 (KPI 기준)

---

### 2.2 폰트 리소스

#### 📁 Paperlogy 폰트

**위치**: `F:\7.VScode\Running VS Code\KUWOTECH\Kuwotech_Sales Management\02.Fonts_Logos\Paperlogy\`

**파일 목록** (6개):

1. `Paperlogy-4Regular.ttf` - 일반 텍스트
2. `Paperlogy-5Medium.ttf` - 중요 텍스트
3. `Paperlogy-6SemiBold.ttf` - 강조 텍스트
4. `Paperlogy-7Bold.ttf` - 제목
5. `Paperlogy-8ExtraBold.ttf` - 헤더
6. `Paperlogy-9Black.ttf` - 초강조

**CSS 적용**:

```css
@font-face {
  font-family: 'Paperlogy';
  src: url('../02.Fonts_Logos/Paperlogy/Paperlogy-4Regular.ttf') format('truetype');
  font-weight: 400;
}

@font-face {
  font-family: 'Paperlogy';
  src: url('../02.Fonts_Logos/Paperlogy/Paperlogy-5Medium.ttf') format('truetype');
  font-weight: 500;
}

/* ... 나머지 웨이트 ... */

body {
  font-family: 'Paperlogy', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

---

### 2.3 로고 리소스

#### 🖼️ `logo.png`

**위치**: `F:\7.VScode\Running VS Code\KUWOTECH\Kuwotech_Sales Management\02.Fonts_Logos\`

**파일 정보**:

- 크기: 2.8 KB
- 수정일: 2025-09-12

**사용 위치**:

- 로그인 페이지 (index.html)
- 헤더 로고 (sales.html, admin.html)
- 모바일 아이콘
- 파비콘

---

### 2.4 기존 프로그램 구조 분석

#### `Kuwotech_management` 폴더

**핵심 파일**:

1. **index.html** - 로그인 (5단계 과정)
2. **sales.html** - 영업담당모드 (6개 메뉴)
3. **admin.html** - 관리자모드 (7개 메뉴)

**JavaScript 구조** (8개 폴더):

```
js/
├── analytics/      - KPI 계산
├── components/     - 모달, 사이드바
├── core/           - 로그인, 인증
├── data/           - 엑셀 처리
├── database/       - IndexedDB
├── kpi/            - KPI 엔진
├── pages/          - 페이지 로직
├── reports/        - 보고서
└── utils/          - 유틸리티
```

**CSS 구조** (25개 파일):

- 모듈별 분리 (dashboard, modal, table, etc.)

---

# PART 2: 시스템 설계

## 3. 최종 폴더 구조

### 3.1 프로젝트 루트 구조

```plaintext
📁 Kuwotech_Sales Management/
├── 📁 01.Original_data/              # 엑셀 데이터
│   └── 영업관리기초자료.xlsx
│
├── 📁 02.Fonts_Logos/                # 폰트 및 로고
│   ├── 📁 Paperlogy/
│   │   ├── Paperlogy-4Regular.ttf
│   │   ├── Paperlogy-5Medium.ttf
│   │   ├── Paperlogy-6SemiBold.ttf
│   │   ├── Paperlogy-7Bold.ttf
│   │   ├── Paperlogy-8ExtraBold.ttf
│   │   └── Paperlogy-9Black.ttf
│   └── logo.png
│
├── 📁 03.References/                 # 참고 문서
│   ├── 01_프로그램_개발기초.md
│   └── 02.시스템_데이터_흐름_완전분석.md
│
├── 📁 04.Program Development Plan/   # 개발 계획
│   ├── 01_Master_Development_Plan.md
│   ├── 01_Master_Development_Plan_v2.md
│   └── 01_Master_Development_Plan_v3.md  # 최종
│
├── 📁 05.Source/                     # 소스 코드 (신규)
│   ├── 📁 01.common/                 # 공통 모듈
│   │   ├── 01_config.js
│   │   ├── 02_utils.js
│   │   ├── 03_format.js
│   │   ├── 04_clock.js
│   │   └── 05_modal.js
│   │
│   ├── 📁 02.login/                  # 로그인 시스템
│   │   ├── 📁 stages/
│   │   │   ├── 01_step1.html        # 개발자 모드
│   │   │   ├── 02_step2.html        # 엑셀 업로드
│   │   │   ├── 03_step3.html        # 사용자 선택
│   │   │   ├── 04_step4.html        # 역할 확인
│   │   │   └── 05_step5.html        # 모드 진입
│   │   ├── 01_login.html
│   │   ├── 02_login.js
│   │   └── 03_auth.js
│   │
│   ├── 📁 03.sales_mode/             # 영업담당 모드
│   │   ├── 01_dashboard/
│   │   │   ├── 01_dashboard.html
│   │   │   └── 02_dashboard.js
│   │   ├── 02_my_companies/
│   │   │   ├── 01_my_companies.html
│   │   │   └── 02_my_companies.js
│   │   ├── 03_report_write/
│   │   │   ├── 01_report_write.html
│   │   │   └── 02_report_write.js
│   │   ├── 04_report_check/
│   │   │   ├── 01_report_check.html
│   │   │   └── 02_report_check.js
│   │   ├── 05_data_management/
│   │   │   ├── 01_data_management.html
│   │   │   └── 02_data_management.js
│   │   └── 06_system_settings/
│   │       ├── 01_settings.html
│   │       └── 02_settings.js
│   │
│   ├── 📁 04.admin_mode/             # 관리자 모드
│   │   ├── 01_dashboard/
│   │   │   ├── 01_dashboard.html
│   │   │   └── 02_dashboard.js
│   │   ├── 02_all_companies/
│   │   │   ├── 01_all_companies.html
│   │   │   └── 02_all_companies.js
│   │   ├── 03_report_confirm/
│   │   │   ├── 01_report_confirm.html
│   │   │   └── 02_report_confirm.js
│   │   ├── 04_presentation/
│   │   │   ├── 01_presentation.html
│   │   │   └── 02_presentation.js
│   │   ├── 05_data_management/
│   │   │   ├── 01_data_management.html
│   │   │   └── 02_data_management.js
│   │   ├── 06_employee_management/
│   │   │   ├── 01_employees.html
│   │   │   └── 02_employees.js
│   │   └── 07_system_settings/
│   │       ├── 01_settings.html
│   │       └── 02_settings.js
│   │
│   ├── 📁 05.database/               # 데이터베이스
│   │   ├── 01_schema.js
│   │   ├── 02_crud.js
│   │   ├── 03_excel_sync.js
│   │   └── 04_backup.js
│   │
│   ├── 📁 06.kpi/                    # KPI 엔진
│   │   ├── 01_kpi_calculator.js
│   │   ├── 02_sales_kpi.js
│   │   └── 03_admin_kpi.js
│   │
│   ├── 📁 07.styles/                 # CSS
│   │   ├── 01_variables.css
│   │   ├── 02_common.css
│   │   ├── 03_login.css
│   │   ├── 04_dashboard.css
│   │   ├── 05_table.css
│   │   ├── 06_modal.css
│   │   ├── 07_sales_theme.css       # 영업담당 테마
│   │   └── 08_admin_theme.css       # 관리자 테마
│   │
│   └── 📁 08.components/             # 공통 컴포넌트
│       ├── 01_header.html
│       ├── 02_footer.html
│       ├── 03_sidebar_sales.html
│       ├── 04_sidebar_admin.html
│       └── 05_company_modal.html
│
└── 📁 06.Backup/                     # 백업 (자동 생성)
    └── (백업 파일들)
```

### 3.2 파일 명명 규칙

#### 번호 체계

- **폴더**: `01.folder_name/`
- **파일**: `01_file_name.html`, `02_file_name.js`
- **우선순위**: 01(가장 중요) → 99(보조)

#### 파일명 규칙

- **소문자**: 모두 소문자 사용
- **언더스코어**: 단어 구분
- **직관성**: 역할 명확히 표현
- **확장자**: `.html`, `.js`, `.css`

**예시**:

```
✅ 좋은 예:
01_dashboard.html
02_kpi_calculator.js
03_sales_theme.css

❌ 나쁜 예:
Dashboard.html (대문자)
kpiCalc.js (카멜케이스)
style1.css (의미 불명)
```

---

## 4. 디자인 시스템

### 4.1 색상 팔레트

#### 영업담당 모드 (밝은 블루)

```css
/* 05.Source/07.styles/07_sales_theme.css */

:root[data-mode="sales"] {
  /* Primary Colors */
  --sales-primary: #3b82f6;        /* 메인 블루 */
  --sales-secondary: #60a5fa;      /* 보조 블루 */
  --sales-accent: #2563eb;         /* 액센트 블루 */
  
  /* Background */
  --sales-bg-main: #1e293b;        /* 메인 배경 */
  --sales-bg-card: #334155;        /* 카드 배경 */
  --sales-bg-hover: #475569;       /* 호버 배경 */
  
  /* Text */
  --sales-text-primary: #f1f5f9;   /* 주 텍스트 */
  --sales-text-secondary: #cbd5e1; /* 보조 텍스트 */
  --sales-text-muted: #94a3b8;     /* 희미한 텍스트 */
  
  /* Status */
  --sales-success: #10b981;        /* 성공 */
  --sales-warning: #f59e0b;        /* 경고 */
  --sales-error: #ef4444;          /* 오류 */
  --sales-info: #3b82f6;           /* 정보 */
}
```

#### 관리자 모드 (인디고)

```css
/* 05.Source/07.styles/08_admin_theme.css */

:root[data-mode="admin"] {
  /* Primary Colors */
  --admin-primary: #6366f1;        /* 메인 인디고 */
  --admin-secondary: #818cf8;      /* 보조 인디고 */
  --admin-accent: #4f46e5;         /* 액센트 인디고 */
  
  /* Background */
  --admin-bg-main: #1e1b4b;        /* 메인 배경 */
  --admin-bg-card: #312e81;        /* 카드 배경 */
  --admin-bg-hover: #3730a3;       /* 호버 배경 */
  
  /* Text */
  --admin-text-primary: #f1f5f9;   /* 주 텍스트 */
  --admin-text-secondary: #cbd5e1; /* 보조 텍스트 */
  --admin-text-muted: #94a3b8;     /* 희미한 텍스트 */
  
  /* Status */
  --admin-success: #10b981;        /* 성공 */
  --admin-warning: #f59e0b;        /* 경고 */
  --admin-error: #ef4444;          /* 오류 */
  --admin-info: #6366f1;           /* 정보 */
}
```

### 4.2 타이포그래피

#### 폰트 설정

```css
/* 05.Source/07.styles/01_variables.css */

/* Paperlogy 폰트 로드 */
@font-face {
  font-family: 'Paperlogy';
  src: url('../../02.Fonts_Logos/Paperlogy/Paperlogy-4Regular.ttf') format('truetype');
  font-weight: 400;
  font-style: normal;
}

@font-face {
  font-family: 'Paperlogy';
  src: url('../../02.Fonts_Logos/Paperlogy/Paperlogy-5Medium.ttf') format('truetype');
  font-weight: 500;
  font-style: normal;
}

@font-face {
  font-family: 'Paperlogy';
  src: url('../../02.Fonts_Logos/Paperlogy/Paperlogy-6SemiBold.ttf') format('truetype');
  font-weight: 600;
  font-style: normal;
}

@font-face {
  font-family: 'Paperlogy';
  src: url('../../02.Fonts_Logos/Paperlogy/Paperlogy-7Bold.ttf') format('truetype');
  font-weight: 700;
  font-style: normal;
}

@font-face {
  font-family: 'Paperlogy';
  src: url('../../02.Fonts_Logos/Paperlogy/Paperlogy-8ExtraBold.ttf') format('truetype');
  font-weight: 800;
  font-style: normal;
}

@font-face {
  font-family: 'Paperlogy';
  src: url('../../02.Fonts_Logos/Paperlogy/Paperlogy-9Black.ttf') format('truetype');
  font-weight: 900;
  font-style: normal;
}

/* 기본 폰트 설정 */
body {
  font-family: 'Paperlogy', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-weight: 400;
  line-height: 1.5;
}

/* 타이포그래피 스케일 */
h1 { font-size: 2.5rem; font-weight: 900; } /* Black */
h2 { font-size: 2rem; font-weight: 800; }   /* ExtraBold */
h3 { font-size: 1.75rem; font-weight: 700; } /* Bold */
h4 { font-size: 1.5rem; font-weight: 600; }  /* SemiBold */
h5 { font-size: 1.25rem; font-weight: 500; } /* Medium */
h6 { font-size: 1rem; font-weight: 500; }    /* Medium */

p, span, div {
  font-weight: 400; /* Regular */
}

.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.font-extrabold { font-weight: 800; }
.font-black { font-weight: 900; }
```

### 4.3 UI 컴포넌트 스타일

#### 기존 스타일 유지 (글래스모피즘)

```css
/* 05.Source/07.styles/02_common.css */

/* 글래스모피즘 카드 */
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

/* 버튼 */
.btn-primary {
  background: var(--primary-color);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  transition: all 0.3s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

/* 테이블 */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  text-align: left;
  font-weight: 600;
}

.data-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* 모달 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
}
```

### 4.4 로고 활용

```html
<!-- 헤더 로고 -->
<div class="header-logo">
  <img src="../../02.Fonts_Logos/logo.png" alt="KUWOTECH" height="40">
  <h1>영업관리 시스템</h1>
</div>

<!-- 로그인 페이지 -->
<div class="login-logo">
  <img src="../02.Fonts_Logos/logo.png" alt="KUWOTECH" height="80">
</div>

<!-- 파비콘 -->
<link rel="icon" type="image/png" href="./02.Fonts_Logos/logo.png">
```

---

## 5. 기술 스택

### 5.1 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| **HTML5** | - | 구조 |
| **CSS3** | - | 스타일 (글래스모피즘 유지) |
| **JavaScript** | ES6+ | 로직 (Vanilla JS) |
| **SheetJS** | Latest | 엑셀 처리 |

### 5.2 데이터베이스

| 기술 | 버전 | 용도 |
|------|------|------|
| **IndexedDB** | - | 로컬 저장소 |
| **Excel** | .xlsx | 원본 데이터 |

### 5.3 도구 및 라이브러리

| 도구 | 용도 |
|------|------|
| **VS Code** | 개발 환경 |
| **Live Server** | 로컬 테스트 |
| **Git** | 버전 관리 (선택) |
| **Chrome DevTools** | 디버깅 |

---

# PART 3: 개발 계획

## 6. 개발 단계

### STAGE 0: 준비 및 분석 ✅ 완료

**목표**: 프로젝트 환경 구축 및 리소스 분석

**완료 사항**:

- ✅ 기존 프로그램 분석 완료
- ✅ 엑셀 구조 파악 (19개 컬럼, 2개 시트)
- ✅ 폰트 리소스 확인 (Paperlogy 6개 웨이트)
- ✅ 로고 확인 (logo.png 2.8KB)
- ✅ 참고 문서 검토 (01_프로그램_개발기초.md, 02.시스템_데이터_흐름_완전분석.md)
- ✅ 최종 폴더 구조 설계
- ✅ 개발 계획서 v3 작성

**산출물**:

- `04.Program Development Plan/01_Master_Development_Plan_v3.md`

---

### STAGE 1: 공통 모듈 구현 (2일)

**목표**: 재사용 가능한 공통 기능 모듈화

#### 1.1 Config 모듈 (`05.Source/01.common/01_config.js`)

```javascript
// [Config: 시스템 설정]
export const CONFIG = {
  // 데이터베이스
  DB_NAME: 'KuwotechSalesDB',
  DB_VERSION: 3,
  
  // 엑셀
  EXCEL_PATH: '../01.Original_data/영업관리기초자료.xlsx',
  EXCEL_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  
  // 리소스
  FONT_PATH: '../02.Fonts_Logos/Paperlogy/',
  LOGO_PATH: '../02.Fonts_Logos/logo.png',
  
  // 색상 (모드별)
  COLORS: {
    sales: {
      primary: '#3b82f6',
      secondary: '#60a5fa',
      accent: '#2563eb'
    },
    admin: {
      primary: '#6366f1',
      secondary: '#818cf8',
      accent: '#4f46e5'
    }
  },
  
  // KPI 목표
  TARGET: {
    COMPANIES_PER_SALES: 80,
    MAJOR_PRODUCTS_PER_SALES: 40
  }
};
```

#### 1.2 Utils 모듈 (`05.Source/01.common/02_utils.js`)

```javascript
// [Utils: 유틸리티 함수]

// 숫자 포맷팅
export function formatNumber(num) {
  if (num === null || num === undefined || num === '') return '0';
  return Math.abs(num).toLocaleString('ko-KR');
}

// 음수 처리
export function formatNegative(num) {
  if (num < 0) {
    return `(${formatNumber(num)})`;
  }
  return formatNumber(num);
}

// 금액 표시
export function formatCurrency(num) {
  return formatNegative(num) + '원';
}

// 퍼센트 표시
export function formatPercent(num) {
  return formatNegative(num) + '%';
}

// 날짜 포맷
export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ko-KR');
}

// 한글 용어 변환
export const TERMS = {
  '고객': '거래처',
  '클라이언트': '거래처',
  // ... 추가 용어
};
```

#### 1.3 Clock 모듈 (`05.Source/01.common/04_clock.js`)

```javascript
// [Clock: 실시간 시계]
export class Clock {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    this.start();
  }
  
  start() {
    this.update();
    setInterval(() => this.update(), 1000);
  }
  
  update() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    this.element.textContent = timeString;
  }
}
```

#### 1.4 Modal 모듈 (`05.Source/01.common/05_modal.js`)

```javascript
// [Modal: 모달 관리]
export class Modal {
  constructor(options) {
    this.title = options.title;
    this.content = options.content;
    this.onSave = options.onSave;
    this.onClose = options.onClose;
  }
  
  open() {
    // 모달 DOM 생성
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${this.title}</h3>
          <button class="close-btn">×</button>
        </div>
        <div class="modal-body">
          ${this.content}
        </div>
        <div class="modal-footer">
          <button class="btn-cancel">취소</button>
          <button class="btn-save">저장</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // 이벤트 리스너
    overlay.querySelector('.close-btn').addEventListener('click', () => this.close(overlay));
    overlay.querySelector('.btn-cancel').addEventListener('click', () => this.close(overlay));
    overlay.querySelector('.btn-save').addEventListener('click', () => this.save(overlay));
  }
  
  close(overlay) {
    overlay.remove();
    if (this.onClose) this.onClose();
  }
  
  save(overlay) {
    if (this.onSave) this.onSave();
    this.close(overlay);
  }
}
```

**테스트**: 각 모듈 독립 실행 확인

**완료 기준**:

- ✅ 모든 모듈 정상 작동
- ✅ 테스트 통과
- ✅ 주석 작성 완료

**산출물**:

- `05.Source/01.common/` 폴더 전체

---

### STAGE 2: 로그인 시스템 (2일)

**목표**: 5단계 로그인 프로세스 구현

#### 2.1 로그인 HTML (`05.Source/02.login/01_login.html`)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KUWOTECH 영업관리 - 로그인</title>
  <link rel="stylesheet" href="../07.styles/01_variables.css">
  <link rel="stylesheet" href="../07.styles/02_common.css">
  <link rel="stylesheet" href="../07.styles/03_login.css">
  <link rel="icon" type="image/png" href="../../02.Fonts_Logos/logo.png">
</head>
<body>
  <!-- [로고] -->
  <div class="login-container">
    <div class="login-logo">
      <img src="../../02.Fonts_Logos/logo.png" alt="KUWOTECH" height="80">
      <h1>KUWOTECH 영업관리 시스템</h1>
    </div>
    
    <!-- [5단계 진행 표시] -->
    <div class="progress-steps">
      <div class="step active" data-step="1">1. 개발자 모드</div>
      <div class="step" data-step="2">2. 엑셀 업로드</div>
      <div class="step" data-step="3">3. 사용자 선택</div>
      <div class="step" data-step="4">4. 역할 확인</div>
      <div class="step" data-step="5">5. 모드 진입</div>
    </div>
    
    <!-- [단계별 컨텐츠] -->
    <div id="step-container">
      <!-- 동적 로드 -->
    </div>
  </div>
  
  <script type="module" src="./02_login.js"></script>
</body>
</html>
```

#### 2.2 로그인 로직 (`05.Source/02.login/02_login.js`)

```javascript
// [Login: 로그인 프로세스]
import { CONFIG } from '../01.common/01_config.js';

class LoginManager {
  constructor() {
    this.currentStep = 1;
    this.userData = {};
    this.init();
  }
  
  async init() {
    await this.loadStep(1);
  }
  
  async loadStep(step) {
    const container = document.getElementById('step-container');
    const response = await fetch(`./stages/0${step}_step${step}.html`);
    const html = await response.text();
    container.innerHTML = html;
    
    this.bindStepEvents(step);
    this.updateProgress(step);
  }
  
  bindStepEvents(step) {
    switch(step) {
      case 1:
        this.handleDevMode();
        break;
      case 2:
        this.handleExcelUpload();
        break;
      case 3:
        this.handleUserSelect();
        break;
      case 4:
        this.handleRoleConfirm();
        break;
      case 5:
        this.handleModeEntry();
        break;
    }
  }
  
  handleDevMode() {
    const form = document.getElementById('dev-mode-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = form.username.value;
      const password = form.password.value;
      
      if (username === 'kjh' && password === '1234') {
        this.nextStep();
      } else {
        alert('개발자 인증 실패');
      }
    });
  }
  
  handleExcelUpload() {
    const input = document.getElementById('excel-file');
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.processExcel(file);
        this.nextStep();
      }
    });
  }
  
  async processExcel(file) {
    // SheetJS로 엑셀 파싱
    // IndexedDB에 저장
    // (구현 생략 - STAGE 3에서 상세)
  }
  
  handleUserSelect() {
    // 직원 목록 표시
    // 선택 이벤트 처리
  }
  
  handleRoleConfirm() {
    // 역할 확인
  }
  
  handleModeEntry() {
    // 모드 진입
    const role = this.userData.role;
    if (role === 'sales') {
      window.location.href = '../03.sales_mode/01_dashboard/01_dashboard.html';
    } else {
      window.location.href = '../04.admin_mode/01_dashboard/01_dashboard.html';
    }
  }
  
  nextStep() {
    this.currentStep++;
    if (this.currentStep <= 5) {
      this.loadStep(this.currentStep);
    }
  }
  
  updateProgress(step) {
    document.querySelectorAll('.step').forEach((el, i) => {
      if (i < step) {
        el.classList.add('completed');
      }
      if (i === step - 1) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }
}

// 초기화
new LoginManager();
```

#### 2.3 단계별 HTML

**Step 1: 개발자 모드** (`stages/01_step1.html`)

```html
<div class="step-content">
  <h2>개발자 모드 인증</h2>
  <form id="dev-mode-form">
    <input type="text" name="username" placeholder="Username" required>
    <input type="password" name="password" placeholder="Password" required>
    <button type="submit">다음</button>
  </form>
</div>
```

**Step 2-5**: 유사 구조로 작성

**테스트**:

1. 개발자 모드 인증 (kjh/1234)
2. 엑셀 업로드
3. 사용자 선택
4. 역할 확인
5. 모드 진입

**완료 기준**:

- ✅ 5단계 모두 정상 작동
- ✅ UI 기존과 100% 동일
- ✅ 모드 분기 정확

**산출물**:

- `05.Source/02.login/` 폴더 전체

---

### STAGE 3: 데이터베이스 및 엑셀 동기화 (2일)

**목표**: IndexedDB 구축 및 엑셀 양방향 동기화

#### 3.1 데이터베이스 스키마 (`05.Source/05.database/01_schema.js`)

```javascript
// [Database Schema: IndexedDB 구조]
export const DB_SCHEMA = {
  name: 'KuwotechSalesDB',
  version: 3,
  stores: [
    {
      name: 'companies',
      keyPath: 'keyValue',
      indexes: [
        { name: 'companyNameERP', keyPath: 'companyNameERP', unique: false },
        { name: 'finalCompanyName', keyPath: 'finalCompanyName', unique: false },
        { name: 'internalManager', keyPath: 'internalManager', unique: false },
        { name: 'businessStatus', keyPath: 'businessStatus', unique: false },
        { name: 'customerRegion', keyPath: 'customerRegion', unique: false },
        { name: 'department', keyPath: 'department', unique: false }
      ]
    },
    {
      name: 'employees',
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'name', keyPath: 'name', unique: false },
        { name: 'role', keyPath: 'role', unique: false }
      ]
    },
    {
      name: 'reports',
      keyPath: 'reportId',
      autoIncrement: true,
      indexes: [
        { name: 'submittedBy', keyPath: 'submittedBy', unique: false },
        { name: 'status', keyPath: 'status', unique: false },
        { name: 'submittedDate', keyPath: 'submittedDate', unique: false }
      ]
    },
    {
      name: 'changeHistory',
      keyPath: 'id',
      autoIncrement: true,
      indexes: [
        { name: 'targetStore', keyPath: 'targetStore', unique: false },
        { name: 'userId', keyPath: 'userId', unique: false },
        { name: 'timestamp', keyPath: 'timestamp', unique: false }
      ]
    },
    {
      name: 'kpiCache',
      keyPath: 'kpiType',
      indexes: [
        { name: 'userId', keyPath: 'userId', unique: false },
        { name: 'calculatedAt', keyPath: 'calculatedAt', unique: false }
      ]
    },
    {
      name: 'meta',
      keyPath: 'key'
    }
  ]
};
```

#### 3.2 CRUD Manager (`05.Source/05.database/02_crud.js`)

```javascript
// [CRUD Manager: 데이터 조작]
export class CRUDManager {
  constructor(dbName, version) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }
  
  async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // 스키마 생성
        DB_SCHEMA.stores.forEach(store => {
          if (!db.objectStoreNames.contains(store.name)) {
            const objectStore = db.createObjectStore(store.name, {
              keyPath: store.keyPath,
              autoIncrement: store.autoIncrement
            });
            
            if (store.indexes) {
              store.indexes.forEach(index => {
                objectStore.createIndex(
                  index.name,
                  index.keyPath,
                  { unique: index.unique }
                );
              });
            }
          }
        });
      };
    });
  }
  
  async create(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return store.add(data);
  }
  
  async read(storeName, key) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return store.get(key);
  }
  
  async update(storeName, data) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return store.put(data);
  }
  
  async delete(storeName, key) {
    const tx = this.db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    return store.delete(key);
  }
  
  async getAll(storeName) {
    const tx = this.db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    return store.getAll();
  }
}
```

#### 3.3 엑셀 동기화 (`05.Source/05.database/03_excel_sync.js`)

```javascript
// [Excel Sync: 엑셀 ↔ IndexedDB 동기화]
import * as XLSX from 'xlsx';

export class ExcelSync {
  constructor(crudManager) {
    this.crud = crudManager;
  }
  
  // 엑셀 → IndexedDB
  async importFromExcel(file) {
    const workbook = XLSX.read(await file.arrayBuffer());
    
    // 기본정보 시트
    const basicSheet = workbook.Sheets['기본정보'];
    const companies = XLSX.utils.sheet_to_json(basicSheet);
    
    // IndexedDB에 저장
    for (const company of companies) {
      await this.crud.create('companies', this.mapCompanyData(company));
    }
    
    // 입사일자 시트
    const hireSheet = workbook.Sheets['입사일자'];
    const employees = XLSX.utils.sheet_to_json(hireSheet);
    
    for (const emp of employees) {
      await this.crud.create('employees', {
        name: emp['영업담당자명'],
        hireDate: emp['입사일자']
      });
    }
  }
  
  // IndexedDB → 엑셀
  async exportToExcel() {
    const workbook = XLSX.utils.book_new();
    
    // 기본정보 시트
    const companies = await this.crud.getAll('companies');
    const basicSheet = XLSX.utils.json_to_sheet(
      companies.map(c => this.unmapCompanyData(c))
    );
    XLSX.utils.book_append_sheet(workbook, basicSheet, '기본정보');
    
    // 입사일자 시트
    const employees = await this.crud.getAll('employees');
    const hireSheet = XLSX.utils.json_to_sheet(
      employees.map(e => ({
        '영업담당자명': e.name,
        '입사일자': e.hireDate
      }))
    );
    XLSX.utils.book_append_sheet(workbook, hireSheet, '입사일자');
    
    // 방문보고서 시트 (신규)
    const reports = await this.crud.getAll('reports');
    const reportSheet = XLSX.utils.json_to_sheet(
      reports.map(r => this.unmapReportData(r))
    );
    XLSX.utils.book_append_sheet(workbook, reportSheet, '방문보고서_전체');
    
    // 변경이력 시트 (신규)
    const history = await this.crud.getAll('changeHistory');
    const historySheet = XLSX.utils.json_to_sheet(history);
    XLSX.utils.book_append_sheet(workbook, historySheet, '변경이력');
    
    // 파일 다운로드
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    XLSX.writeFile(workbook, `영업관리기초자료_백업_${timestamp}.xlsx`);
  }
  
  mapCompanyData(excelRow) {
    return {
      keyValue: excelRow['KEY VALUE'],
      companyNameERP: excelRow['거래처명(ERP)'],
      finalCompanyName: excelRow['최종거래처명'],
      isClosed: excelRow['폐업여부'],
      ceoOrDentist: excelRow['대표이사 또는 치과의사'],
      customerRegion: excelRow['고객사 지역'],
      businessStatus: excelRow['거래상태'],
      department: excelRow['담당부서'],
      salesProduct: excelRow['판매제품'],
      internalManager: excelRow['내부담당자'],
      jcwContribution: excelRow['정철웅기여(상.중.하)'],
      companyContribution: excelRow['회사기여(상.중.하)'],
      lastPaymentDate: excelRow['마지막결제일'],
      lastPaymentAmount: excelRow['마지막총결재금액'],
      accountsReceivable: excelRow['매출채권잔액'],
      accumulatedCollection: excelRow['누적수금금액'],
      accumulatedSales: excelRow['누적매출금액'],
      businessActivity: excelRow['영업활동(특이사항)']
    };
  }
  
  unmapCompanyData(dbRow) {
    return {
      'KEY VALUE': dbRow.keyValue,
      '거래처명(ERP)': dbRow.companyNameERP,
      '최종거래처명': dbRow.finalCompanyName,
      // ... 나머지 필드
    };
  }
  
  unmapReportData(dbRow) {
    return {
      '보고서ID': dbRow.reportId,
      '작성자': dbRow.submittedBy,
      '제출일': dbRow.submittedDate,
      '보고서유형': dbRow.reportType,
      '목표수금금액': dbRow.targetCollectionAmount,
      '목표매출액': dbRow.targetSalesAmount,
      '판매목표제품': dbRow.targetProducts,
      '활동내역': dbRow.activityNotes,
      '상태': dbRow.status,
      '처리자': dbRow.processedBy,
      '처리일': dbRow.processedDate,
      '관리자코멘트': dbRow.adminComment
    };
  }
}
```

**테스트**:

1. 엑셀 업로드 → IndexedDB 저장
2. IndexedDB 데이터 조회
3. IndexedDB → 엑셀 다운로드
4. 데이터 무결성 확인

**완료 기준**:

- ✅ 양방향 동기화 정상
- ✅ 19개 컬럼 정확 매핑
- ✅ 신규 시트 생성 (방문보고서, 변경이력)

**산출물**:

- `05.Source/05.database/` 폴더 전체

---

### STAGE 4: 영업담당 모드 (3일)

**목표**: 영업담당 6개 메뉴 구현

#### 메뉴 구조

1. 대시보드 (개인 KPI 14개)
2. 담당거래처 관리
3. 실적보고서 작성
4. 실적보고서 확인
5. 데이터 관리 (다운로드 3종)
6. 시스템 설정

**구현 방식**:

- 각 메뉴별 폴더 분리
- HTML + JS 쌍으로 구성
- 공통 모듈 재사용

**테스트**:

- 각 메뉴 정상 작동
- 권한 체크 (본인 데이터만)
- 다운로드 기능

**완료 기준**:

- ✅ 6개 메뉴 완성
- ✅ 기존 UI 100% 동일
- ✅ 기능 정상 작동

**산출물**:

- `05.Source/03.sales_mode/` 전체

---

### STAGE 5: 관리자 모드 (3일)

**목표**: 관리자 7개 메뉴 구현

#### 메뉴 구조

1. 대시보드 (전사 KPI 14개)
2. 전체거래처 관리
3. 실적보고서 확인 (승인/반려)
4. 보고서 발표
5. 데이터 관리 (업로드/다운로드)
6. 직원 관리
7. 시스템 설정

**구현 방식**:

- 영업담당 모드 구조 참고
- 코드 재사용 극대화
- 권한 처리 강화

**테스트**:

- 각 메뉴 정상 작동
- 권한 체크 (전체 데이터)
- 보고서 승인/반려

**완료 기준**:

- ✅ 7개 메뉴 완성
- ✅ 기존 UI 100% 동일
- ✅ 권한 정확

**산출물**:

- `05.Source/04.admin_mode/` 전체

---

### STAGE 6: 통합 테스트 및 디버깅 (2일)

**목표**: 전체 시스템 안정화

#### 테스트 항목

1. **로그인 플로우**
   - 5단계 정상 작동
   - 모드 분기 정확
   - 세션 유지

2. **데이터 흐름**
   - 엑셀 업로드/다운로드
   - IndexedDB 저장/조회
   - 권한별 필터링

3. **기능 테스트**
   - 거래처 CRUD
   - 보고서 작성/승인
   - KPI 계산
   - 다운로드

4. **성능 테스트**
   - 로딩 시간 < 2초
   - KPI 계산 < 500ms
   - 테이블 렌더링 < 1초

5. **크로스 브라우저**
   - Chrome
   - Edge
   - 모바일 반응성

**디버깅**:

- Console 에러 제거
- 메모리 누수 체크
- 성능 최적화

**완료 기준**:

- ✅ 모든 시나리오 통과
- ✅ 버그 제로
- ✅ 성능 기준 충족

**산출물**:

- 테스트 보고서
- 버그 리스트 (해결 완료)

---

### STAGE 7: 배포 준비 (1일)

**목표**: 가비아 서버 배포 준비

#### 배포 체크리스트

**1. 파일 점검**

- ✅ 모든 경로 상대 경로 확인
- ✅ 리소스 파일 포함 확인
- ✅ CDN 링크 확인 (SheetJS)

**2. 문서화**

- ✅ `README.md` 작성
- ✅ 리팩토링 로그 작성
- ✅ 사용 가이드 작성

**3. 백업**

- ✅ 전체 소스 백업
- ✅ 기존 프로그램 백업
- ✅ 엑셀 데이터 백업

**4. 배포 테스트**

- ✅ 로컬 서버 (Live Server)
- ✅ 모든 기능 재확인
- ✅ 성능 재측정

**완료 기준**:

- ✅ 배포 준비 완료
- ✅ 문서화 완료
- ✅ 백업 완료

**산출물**:

- 배포용 압축 파일
- 배포 지침서
- 리팩토링 로그

---

## 7. 데이터 흐름 및 동기화

### 7.1 전체 데이터 흐름도

```
[엑셀 파일]
    ↓ (업로드)
[SheetJS 파싱]
    ↓
[IndexedDB 저장]
    ↓ (조회/수정)
[화면 표시]
    ↓ (다운로드)
[엑셀 생성]
```

### 7.2 자동 업데이트 컬럼 (6개)

| 컬럼 | 업데이트 시점 | 로직 |
|------|--------------|------|
| 판매제품 | 보고서 확인 | 기존 + "," + 신규 |
| 마지막결제일 | 보고서 확인 | 확인 날짜 |
| 마지막총결재금액 | 보고서 확인 | 최종매출금액 |
| 누적수금금액 | 보고서 확인 | 기존 + 최종수금 |
| 누적매출금액 | 보고서 확인 | 기존 + (부가세 처리) |
| 영업활동(특이사항) | 보고서 작성/확인 | 기존 + 신규 + 상태 |

### 7.3 실시간 동기화 전략

#### 우선순위 1: 엑셀 다운로드 기능 (STAGE 3)

- 수동 다운로드 구현
- 3종 다운로드:
  1. 내 거래처
  2. 보고서
  3. KPI

#### 우선순위 2: 실시간 동기화 (향후)

- 데이터 변경 → 즉시 엑셀 업데이트
- `DataSyncManager` 클래스
- 변경 이력 자동 기록

#### 우선순위 3: 자동 백업 (향후)

- 매일 자정 백업
- `AutoBackupScheduler` 클래스
- 30일 이상 자동 삭제

---

# PART 4: 참고 정보

## 8. 참고 문서 핵심 표

### 8.1 권한 매트릭스

| 기능 | 관리자(admin) | 영업담당(sales) |
|------|----------------|-----------------|
| 로그인/세션 | 가능 | 가능 |
| 거래처 조회 | 전체 | 본인 담당만 |
| 거래처명(ERP) 수정 | 가능 | 불가 |
| 매출채권잔액 수정 | 가능 | 불가 |
| 영업활동(특이사항) 수정 | 불가 | 가능 |
| 보고서 승인/반려 | 가능 | 불가 |
| 엑셀 업로드 | 강정환 전용 | 불가 |
| 엑셀 다운로드 | 가능 | 가능(개인 범위) |

### 8.2 KPI 지표 (영업담당 14개)

| 지표명 | 계산식 |
|--------|--------|
| 담당거래처 | COUNT(내부담당자=본인 AND 거래상태≠'불용') |
| 활성거래처 | COUNT(거래상태='활성') |
| 활성화율 | (활성거래처/담당거래처) × 100 |
| 주요제품판매거래처 | 3단계 우선순위 계산 |
| 회사배정기준 달성율 | ((담당거래처/80) - 1) × 100 |
| 주요고객처 목표달성율 | ((주요제품거래처/40)-1) × 100 |
| 누적매출금액 | SUM(누적매출금액) WHERE 본인 |
| 주요제품매출액 | SUM(누적매출금액) WHERE 주요제품 |
| 주요제품매출비율 | (주요제품매출/누적매출) × 100 |
| 매출집중도 | (누적매출/담당거래처)/현재월수 |
| 누적수금금액 | SUM(누적수금금액) WHERE 본인 |
| 매출채권잔액 | SUM(매출채권잔액) WHERE 본인 |
| 전체매출기여도 | (개인/전사) × 100 |
| 주요매출기여도 | (개인주요/전사주요) × 100 |

### 8.3 KPI 지표 (관리자 14개)

| 지표명 | 계산식 |
|--------|--------|
| 전체거래처 | COUNT(거래상태≠'불용') |
| 활성거래처 | COUNT(거래상태='활성') |
| 활성화율 | (활성거래처/전체거래처) × 100 |
| 주요제품판매거래처 | 3단계 우선순위 계산 (전체) |
| 회사배정기준 달성율 | ((전체/(80×영업사원수)) - 1) × 100 |
| 주요고객처 목표달성율 | ((주요제품/(40×영업사원수))-1) × 100 |
| 누적매출금액 | SUM(누적매출금액) 전체 |
| 주요제품매출액 | SUM(주요제품매출) 전체 |
| 주요제품매출비율 | (주요제품매출/누적매출) × 100 |
| 매출집중도 | (누적매출/전체거래처)/현재월수 |
| 누적수금금액 | SUM(누적수금금액) 전체 |
| 매출채권잔액 | SUM(매출채권잔액) 전체 |
| 전체매출기여도 | 클릭 시 순위표 모달 |
| 주요매출기여도 | 클릭 시 순위표 모달 |

### 8.4 숫자 표시 규칙

| 타입 | 양수 예시 | 음수 예시 |
|------|----------|----------|
| 개수 | `123,456개` | `(123)개` (빨강) |
| 금액 | `1,234,567원` | `(1,234)원` (빨강) |
| 비율 | `12.34%` | `(12.34)%` (빨강) |
| 달성율 (초과) | `12.34% 초과달성` (파랑) | - |
| 달성율 (미달) | - | `(12.34)% 미달` (빨강) |

---

## 9. 변수 명명 규칙

### 9.1 JavaScript

#### 변수/함수

```javascript
// camelCase
const userName = 'Daniel';
let totalAmount = 1000;
function calculateKPI() {}

// Private (언더스코어)
const _privateVar = 'secret';
function _internalFunction() {}
```

#### 상수

```javascript
// UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';
const CONFIG_DB_NAME = 'KuwotechSalesDB';
```

#### 클래스

```javascript
// PascalCase
class DatabaseManager {}
class KPICalculator {}
class ExcelSync {}
```

### 9.2 CSS

#### BEM 방법론

```css
/* Block */
.card {}

/* Element */
.card__header {}
.card__body {}
.card__footer {}

/* Modifier */
.card--large {}
.card--primary {}
.card__header--sticky {}
```

#### 유틸리티

```css
/* 기능 기반 */
.text-center { text-align: center; }
.mt-4 { margin-top: 1rem; }
.hidden { display: none; }
```

### 9.3 파일명

#### HTML/JS

```
01_dashboard.html
02_dashboard.js
03_company_modal.html
04_report_write.js
```

#### CSS

```
01_variables.css
02_common.css
03_sales_theme.css
```

### 9.4 DB 필드

#### IndexedDB

```javascript
// camelCase
{
  keyValue: 'KEY001',
  finalCompanyName: 'A치과',
  accumulatedSales: 1000000,
  internalManager: '김영업'
}
```

#### 엑셀 시트

```
// 한글 (기존 유지)
KEY VALUE
최종거래처명
누적매출금액
내부담당자
```

---

# PART 5: 완료 및 배포

## 10. 완료 계획 및 체크리스트

### 10.1 STAGE별 완료 기준

#### STAGE 0: 준비 ✅ 완료

- ✅ 기존 프로그램 분석
- ✅ 엑셀 구조 파악
- ✅ 폰트/로고 확인
- ✅ 참고 문서 검토
- ✅ 폴더 구조 설계
- ✅ 개발 계획서 작성

#### STAGE 1: 공통 모듈

- [ ] Config 모듈
- [ ] Utils 모듈
- [ ] Clock 모듈
- [ ] Modal 모듈
- [ ] 각 모듈 테스트 통과
- [ ] 주석 작성 완료

#### STAGE 2: 로그인

- [ ] 5단계 HTML 작성
- [ ] 로그인 로직 구현
- [ ] 모드 분기 정상
- [ ] UI 기존과 100% 동일
- [ ] 테스트 통과

#### STAGE 3: 데이터베이스

- [ ] IndexedDB 스키마
- [ ] CRUD Manager
- [ ] 엑셀 Import
- [ ] 엑셀 Export
- [ ] 신규 시트 생성 (방문보고서, 변경이력)
- [ ] 데이터 무결성 확인

#### STAGE 4: 영업담당 모드

- [ ] 대시보드 (KPI 14개)
- [ ] 담당거래처 관리
- [ ] 실적보고서 작성
- [ ] 실적보고서 확인
- [ ] 데이터 관리 (다운로드 3종)
- [ ] 시스템 설정
- [ ] 기존 UI 100% 일치

#### STAGE 5: 관리자 모드

- [ ] 대시보드 (전사 KPI 14개)
- [ ] 전체거래처 관리
- [ ] 실적보고서 확인 (승인/반려)
- [ ] 보고서 발표
- [ ] 데이터 관리 (업로드/다운로드)
- [ ] 직원 관리
- [ ] 시스템 설정
- [ ] 권한 체크 정확

#### STAGE 6: 통합 테스트

- [ ] 로그인 플로우
- [ ] 데이터 흐름
- [ ] 기능 테스트
- [ ] 성능 테스트
- [ ] 크로스 브라우저
- [ ] 모바일 반응성
- [ ] 버그 제로

#### STAGE 7: 배포 준비

- [ ] 파일 점검
- [ ] 문서화
- [ ] 백업
- [ ] 배포 테스트
- [ ] 압축 파일 생성

### 10.2 품질 체크리스트

#### 기능

- [ ] 로그인 정상
- [ ] 모드 분기 정확
- [ ] 거래처 CRUD
- [ ] 보고서 작성/승인
- [ ] KPI 계산 정확
- [ ] 다운로드 3종 정상
- [ ] 업로드 정상
- [ ] 권한 처리 정확

#### 디자인

- [ ] UI 기존과 100% 동일
- [ ] 색상 정확 (영업/관리자)
- [ ] 폰트 정상 표시
- [ ] 로고 정상 표시
- [ ] 반응형 정상

#### 성능

- [ ] 페이지 로딩 < 2초
- [ ] KPI 계산 < 500ms
- [ ] 테이블 렌더링 < 1초
- [ ] 엑셀 업로드/다운로드 < 5초

#### 코드 품질

- [ ] 모듈화 완료
- [ ] 중복 코드 제거
- [ ] 주석 작성 (`// [섹션: 설명]`)
- [ ] 변수명 규칙 준수
- [ ] 에러 처리 완료

#### 보안

- [ ] 권한 체크 정확
- [ ] 세션 관리 안전
- [ ] 데이터 검증
- [ ] XSS 방지

### 10.3 변수 사용 정리

#### 전역 변수

```javascript
// CONFIG
CONFIG.DB_NAME = 'KuwotechSalesDB';
CONFIG.DB_VERSION = 3;
CONFIG.TARGET.COMPANIES_PER_SALES = 80;
CONFIG.TARGET.MAJOR_PRODUCTS_PER_SALES = 40;

// 사용자 정보
currentUser = 'sales01';
currentUserRole = 'sales' | 'admin';
currentUserName = '김영업';

// 테마
currentTheme = 'sales' | 'admin';
```

#### IndexedDB 스토어

```javascript
// companies
{
  keyValue,
  companyNameERP,
  finalCompanyName,
  isClosed,
  ceoOrDentist,
  customerRegion,
  businessStatus,
  department,
  salesProduct,
  internalManager,
  jcwContribution,
  companyContribution,
  lastPaymentDate,
  lastPaymentAmount,
  accountsReceivable,
  accumulatedCollection,
  accumulatedSales,
  businessActivity
}

// reports
{
  reportId,
  submittedBy,
  submittedDate,
  reportType,
  targetCollectionAmount,
  targetSalesAmount,
  targetProducts,
  activityNotes,
  status,
  processedBy,
  processedDate,
  adminComment
}

// employees
{
  id,
  name,
  email,
  password,
  role,
  department,
  hireDate,
  phone
}

// changeHistory
{
  id,
  targetStore,
  targetId,
  operation,
  userId,
  timestamp,
  beforeData,
  afterData
}
```

#### CSS 변수

```css
/* 영업담당 */
--sales-primary: #3b82f6;
--sales-secondary: #60a5fa;
--sales-accent: #2563eb;
--sales-bg-main: #1e293b;
--sales-text-primary: #f1f5f9;

/* 관리자 */
--admin-primary: #6366f1;
--admin-secondary: #818cf8;
--admin-accent: #4f46e5;
--admin-bg-main: #1e1b4b;
--admin-text-primary: #f1f5f9;
```

---

## 11. 프로젝트 타임라인

### 11.1 전체 일정

```
Week 1 (Day 1-5)
├── STAGE 0: 준비 및 분석 ✅ 완료
├── STAGE 1: 공통 모듈 (Day 1-2)
└── STAGE 2: 로그인 (Day 3-4)
└── STAGE 3: 데이터베이스 시작 (Day 5)

Week 2 (Day 6-12)
├── STAGE 3: 데이터베이스 완료 (Day 6)
├── STAGE 4: 영업담당 모드 (Day 7-9)
└── STAGE 5: 관리자 모드 (Day 10-12)

Week 3 (Day 13-19)
├── STAGE 6: 통합 테스트 (Day 13-14)
├── STAGE 7: 배포 준비 (Day 15)
├── 예비일 (Day 16-17)
└── 배포 (Day 18-19)

Week 4+ (Day 20+)
├── 사용자 피드백 수집
├── 버그 수정
└── 기능 개선
```

**총 예상 기간**: 14-20일

### 11.2 일별 상세 계획

| 일차 | STAGE | 작업 내용 | 산출물 |
|------|-------|----------|--------|
| 1 | 0 | 준비 및 분석 ✅ | 계획서 v3 |
| 2 | 1 | 공통 모듈 1 | Config, Utils |
| 3 | 1 | 공통 모듈 2 | Clock, Modal |
| 4 | 2 | 로그인 HTML | Step 1-5 |
| 5 | 2 | 로그인 로직 | 로그인 로직 |
| 6 | 3 | DB 스키마 | Schema, CRUD |
| 7 | 3 | 엑셀 동기화 | Import/Export |
| 8 | 4 | 영업: 대시보드+거래처 | 2개 메뉴 |
| 9 | 4 | 영업: 보고서+데이터 | 3개 메뉴 |
| 10 | 4 | 영업: 설정+테스트 | 1개 메뉴 |
| 11 | 5 | 관리자: 대시보드+거래처 | 2개 메뉴 |
| 12 | 5 | 관리자: 보고서+발표 | 2개 메뉴 |
| 13 | 5 | 관리자: 데이터+직원+설정 | 3개 메뉴 |
| 14 | 6 | 통합 테스트 1 | 기능 테스트 |
| 15 | 6 | 통합 테스트 2 | 성능 테스트 |
| 16 | 7 | 배포 준비 | 문서화 |
| 17 | 예비 | 버그 수정 | - |
| 18 | 예비 | 최종 검증 | - |
| 19 | 배포 | 가비아 서버 | 배포 완료 |
| 20+ | 유지보수 | 피드백 반영 | - |

---

## 12. 연락처 및 지원

### 12.1 작성자 정보

| 항목 | 정보 |
|------|------|
| **Creator** | Daniel.K |
| **Email** | <kinggo0807@hotmail.com> |
| **Owner** | Kang Jung Hwan |
| **버전** | 3.0.0 |
| **작성일** | 2025-09-26 |

### 12.2 개발 중 이슈

**우선순위**:

1. 기존 프로그램 재확인 (`Kuwotech_management`)
2. 참고 문서 검토 (`03.References`)
3. 개발 계획서 확인 (이 문서)
4. 작성자 문의

**이슈 보고**:

- 버그: 상세 설명 + 재현 방법
- 기능 요청: 구체적 요구사항
- 질문: 명확한 질의

### 12.3 유지보수 계획

**정기 점검**:

- 주간: 버그 수정
- 월간: 성능 점검
- 분기: 기능 업데이트

**업데이트 프로세스**:

1. 백업 실행
2. 변경 사항 적용
3. 테스트 수행
4. 배포 실행
5. 문서 업데이트

---

## 📚 부록

### A. 참고 파일 위치

```
F:\7.VScode\Running VS Code\KUWOTECH\
├── Kuwotech_management/           (기존 프로그램)
└── Kuwotech_Sales Management/     (새 프로젝트)
    ├── 01.Original_data/
    │   └── 영업관리기초자료.xlsx
    ├── 02.Fonts_Logos/
    │   ├── Paperlogy/
    │   └── logo.png
    ├── 03.References/
    │   ├── 01_프로그램_개발기초.md
    │   └── 02.시스템_데이터_흐름_완전분석.md
    ├── 04.Program Development Plan/
    │   └── 01_Master_Development_Plan_v3.md  (이 문서)
    └── 05.Source/                  (구현 예정)
```

### B. 핵심 원칙 요약

1. **기존 UI 100% 동일** - 픽셀 단위 복제
2. **코드만 개선** - 모듈화, 중복 제거
3. **디자인 변경 금지** - AI 가정 적용 금지
4. **기존 프로그램 기준** - `Kuwotech_management` 절대 기준
5. **번호 규칙 준수** - 폴더/파일 명명
6. **동적 데이터** - 가짜 데이터 금지
7. **디버깅 제거** - 배포 전 정리
8. **중간 확인** - 단계별 검증

### C. 주요 변경 사항 (v2 → v3)

1. ✅ 엑셀 구조 상세 분석 (19개 컬럼)
2. ✅ Paperlogy 폰트 6개 웨이트 확인
3. ✅ logo.png 통합
4. ✅ 참고 문서 핵심 표 추출
5. ✅ 최종 폴더 구조 확정
6. ✅ CSS 변수 체계 정립
7. ✅ 변수 명명 규칙 정리

---

## 🎉 마무리

### 프로젝트 성공 기준

#### 기술적 성공

- ✅ 모든 기능 정상 작동
- ✅ 성능 기준 충족
- ✅ 버그 제로 배포
- ✅ 코드 품질 A등급

#### 사용자 성공

- ✅ 기존 UI 경험 100% 유지
- ✅ 직관적 사용성
- ✅ 빠른 응답 속도
- ✅ 안정적 데이터 처리

#### 비즈니스 성공

- ✅ 유지보수 용이성 향상
- ✅ 확장 가능한 구조
- ✅ 안정적 운영
- ✅ 문서화 완비

### 다음 단계

**STAGE 1 시작 준비**:

1. 이 계획서 검토 완료
2. 개발 환경 세팅
3. 공통 모듈 구현 시작

**진행 상황 보고**:

- 각 STAGE 완료 시 체크
- 이슈 발생 시 즉시 보고
- 주간 진행 상황 정리

---

**📝 최종 업데이트**: 2025-09-26  
**✍️ 작성자**: Daniel.K (<kinggo0807@hotmail.com>)  
**👤 소유자**: Kang Jung Hwan  
**📌 버전**: 3.0.0 (최종)  
**📅 다음 업데이트**: STAGE 1 완료 시

---

<!-- ========================= [END OF DOCUMENT] ========================= -->
